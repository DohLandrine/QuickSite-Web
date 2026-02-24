import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, Timestamp, getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { HttpsError, onCall } from "firebase-functions/v2/https";

initializeApp();

const db = getFirestore();
const PAY_PORTAL_BASE_URL = "https://quicksite-cm.web.app";
const PAY_SESSION_TTL_MS = 10 * 60 * 1000;
const PAY_SESSION_REISSUE_WINDOW_MS = 60 * 1000;
const IMAGE_MAX_BYTES = 2 * 1024 * 1024;
const VIDEO_MAX_BYTES = 25 * 1024 * 1024;

type Plan = "free" | "pro" | "business";
type UploadKind = "avatar" | "image" | "video";

type PlanLimits = {
  maxImages: number;
  maxVideos: number;
};

const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free: { maxImages: 1, maxVideos: 0 },
  pro: { maxImages: 20, maxVideos: 0 },
  business: { maxImages: 40, maxVideos: 3 },
};

const IMAGE_CONTENT_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const VIDEO_CONTENT_TYPES = new Set(["video/mp4"]);

type CreatePaySessionResult = {
  sessionId: string;
  payUrl: string;
};

type ExchangePaySessionPayload = {
  sessionId?: string;
};

type ExchangePaySessionResult = {
  customToken: string;
};

type PaySessionDoc = {
  uid?: string;
  expiresAt?: Timestamp;
  used?: boolean;
  usedAt?: Timestamp;
};

type UserDoc = {
  plan?: unknown;
  planExpiresAt?: unknown;
};

type ProfileMediaDoc = {
  avatarUrl?: unknown;
  images?: unknown;
  videos?: unknown;
  updatedAt?: unknown;
};

type ProfileDoc = {
  uid?: unknown;
  media?: ProfileMediaDoc;
};

type GetPlanLimitsResult = {
  plan: Plan;
  declaredPlan: Plan;
  activePaidSubscription: boolean;
  limits: PlanLimits;
};

type CommitImageMetadataPayload = {
  username?: unknown;
  kind?: unknown;
  path?: unknown;
  downloadUrl?: unknown;
  sizeBytes?: unknown;
  contentType?: unknown;
};

type CommitImageMetadataResult = {
  success: true;
  kind: UploadKind;
  countImages: number;
  countVideos: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function normalizePlan(rawPlan: unknown): Plan {
  const value = typeof rawPlan === "string" ? rawPlan.trim().toLowerCase() : "";
  if (value === "pro" || value === "business") {
    return value;
  }
  return "free";
}

function toMillis(value: unknown): number | null {
  if (!value) {
    return null;
  }

  if (value instanceof Timestamp) {
    return value.toMillis();
  }

  if (value instanceof Date) {
    return Number.isFinite(value.getTime()) ? value.getTime() : null;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = new Date(value).getTime();
    return Number.isFinite(parsed) ? parsed : null;
  }

  const maybeToDate = isRecord(value) ? value.toDate : null;
  if (typeof maybeToDate === "function") {
    const parsed = maybeToDate();
    if (parsed instanceof Date && Number.isFinite(parsed.getTime())) {
      return parsed.getTime();
    }
  }

  return null;
}

function hasActivePaidSubscription(plan: Plan, planExpiresAt: unknown): boolean {
  if (plan === "free") {
    return false;
  }

  const expiresAtMs = toMillis(planExpiresAt);
  return expiresAtMs !== null && expiresAtMs > Date.now();
}

async function resolvePlan(uid: string): Promise<GetPlanLimitsResult> {
  const userSnap = await db.collection("users").doc(uid).get();
  const data = (userSnap.data() ?? {}) as UserDoc;

  const declaredPlan = normalizePlan(data.plan);
  const activePaidSubscription = hasActivePaidSubscription(declaredPlan, data.planExpiresAt);
  const plan: Plan = activePaidSubscription ? declaredPlan : "free";

  return {
    plan,
    declaredPlan,
    activePaidSubscription,
    limits: PLAN_LIMITS[plan],
  };
}

function normalizeString(raw: unknown): string {
  return typeof raw === "string" ? raw.trim() : "";
}

function normalizeSizeBytes(raw: unknown): number | null {
  if (typeof raw !== "number" || !Number.isFinite(raw)) {
    return null;
  }

  if (raw <= 0) {
    return null;
  }

  return Math.floor(raw);
}

function normalizeContentType(raw: unknown): string {
  const value = normalizeString(raw).toLowerCase();
  return value.split(";")[0]?.trim() ?? "";
}

function normalizeStoragePath(raw: unknown): string {
  const value = normalizeString(raw).replace(/^\/+/, "");
  return value;
}

function isUploadKind(value: string): value is UploadKind {
  return value === "avatar" || value === "image" || value === "video";
}

function isUidScopedPath(path: string, uid: string): boolean {
  return path.startsWith(`users/${uid}/`);
}

function isKindScopedPath(path: string, uid: string, kind: UploadKind): boolean {
  const basePath =
    kind === "avatar"
      ? `users/${uid}/avatar/`
      : kind === "image"
        ? `users/${uid}/images/`
        : `users/${uid}/videos/`;
  if (!path.startsWith(basePath)) {
    return false;
  }
  const suffix = path.slice(basePath.length).trim();
  if (!suffix || suffix.includes("..")) {
    return false;
  }
  if (kind === "avatar") {
    return true;
  }
  if (kind === "image") {
    return true;
  }
  return true;
}

function readStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0);
}

async function cleanupStorageObject(path: string): Promise<void> {
  try {
    await getStorage().bucket().file(path).delete({ ignoreNotFound: true });
  } catch {
    // Best-effort cleanup only.
  }
}

export const getPlanLimits = onCall<undefined, Promise<GetPlanLimitsResult>>(
  {
    region: "us-central1",
  },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError("unauthenticated", "Login required.");
    }

    return resolvePlan(uid);
  }
);

export const commitImageMetadata = onCall<
  CommitImageMetadataPayload,
  Promise<CommitImageMetadataResult>
>(
  {
    region: "us-central1",
  },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError("unauthenticated", "Login required.");
    }

    let uploadedPath = "";
    let shouldCleanup = false;

    try {
      const username = normalizeString(request.data?.username);
      const kindRaw = normalizeString(request.data?.kind).toLowerCase();
      const downloadUrl = normalizeString(request.data?.downloadUrl);
      const sizeBytes = normalizeSizeBytes(request.data?.sizeBytes);
      const contentType = normalizeContentType(request.data?.contentType);

      if (!username) {
        throw new HttpsError("invalid-argument", "username is required.");
      }

      if (!isUploadKind(kindRaw)) {
        throw new HttpsError("invalid-argument", "kind must be avatar, image, or video.");
      }
      const kind = kindRaw as UploadKind;

      uploadedPath = normalizeStoragePath(request.data?.path);
      if (!uploadedPath) {
        throw new HttpsError("invalid-argument", "path is required.");
      }

      if (!downloadUrl) {
        throw new HttpsError("invalid-argument", "downloadUrl is required.");
      }

      if (sizeBytes === null) {
        throw new HttpsError("invalid-argument", "sizeBytes must be a positive number.");
      }

      if (!contentType) {
        throw new HttpsError("invalid-argument", "contentType is required.");
      }

      if (!isUidScopedPath(uploadedPath, uid)) {
        throw new HttpsError("permission-denied", "Invalid upload path: uid mismatch.");
      }
      shouldCleanup = true;

      if (!isKindScopedPath(uploadedPath, uid, kind)) {
        throw new HttpsError("permission-denied", "Invalid upload path for this media kind.");
      }

      const isImageKind = kind === "avatar" || kind === "image";
      if (isImageKind) {
        if (!IMAGE_CONTENT_TYPES.has(contentType)) {
          throw new HttpsError(
            "failed-precondition",
            "Invalid image type. Allowed: image/jpeg, image/png, image/webp."
          );
        }
        if (sizeBytes > IMAGE_MAX_BYTES) {
          throw new HttpsError("failed-precondition", "Image size must be 2MB or less.");
        }
      } else {
        if (!VIDEO_CONTENT_TYPES.has(contentType)) {
          throw new HttpsError("failed-precondition", "Invalid video type. Allowed: video/mp4.");
        }
        if (sizeBytes > VIDEO_MAX_BYTES) {
          throw new HttpsError("failed-precondition", "Video size must be 25MB or less.");
        }
      }

      const profileRef = db.collection("profiles").doc(username);
      const plan = await resolvePlan(uid);

      const counts = await db.runTransaction(async (transaction) => {
        const profileSnap = await transaction.get(profileRef);
        if (!profileSnap.exists) {
          throw new HttpsError("permission-denied", "Profile not found or not owned by user.");
        }

        const profile = (profileSnap.data() ?? {}) as ProfileDoc;
        const profileUid = normalizeString(profile.uid);
        if (profileUid !== uid) {
          throw new HttpsError("permission-denied", "Profile not found or not owned by user.");
        }

        const media = isRecord(profile.media) ? profile.media : {};
        const images = readStringArray(media.images);
        const videos = readStringArray(media.videos);
        const limits = plan.limits;
        let countImages = images.length;
        let countVideos = videos.length;

        if (kind === "image") {
          if (plan.plan === "free") {
            throw new HttpsError(
              "failed-precondition",
              "Free plan allows avatar only. Upgrade to Pro to add images."
            );
          }

          const alreadySaved = images.includes(downloadUrl);
          if (!alreadySaved && images.length >= limits.maxImages) {
            throw new HttpsError(
              "failed-precondition",
              `Image limit reached for ${plan.plan} plan (${limits.maxImages}).`
            );
          }
          if (!alreadySaved) {
            countImages += 1;
          }
        }

        if (kind === "video") {
          if (plan.declaredPlan !== "business" || !plan.activePaidSubscription) {
            throw new HttpsError(
              "permission-denied",
              "Videos are available only on an active Business plan."
            );
          }
          if (!contentType.startsWith("video/")) {
            throw new HttpsError(
              "failed-precondition",
              "Invalid video type. contentType must start with video/."
            );
          }
          if (contentType !== "video/mp4") {
            throw new HttpsError("failed-precondition", "Invalid video type. Allowed: video/mp4.");
          }
          if (sizeBytes > VIDEO_MAX_BYTES) {
            throw new HttpsError("failed-precondition", "Video size must be 25MB or less.");
          }

          const alreadySaved = videos.includes(downloadUrl);
          if (!alreadySaved && videos.length >= limits.maxVideos) {
            throw new HttpsError(
              "failed-precondition",
              `Video limit reached for business plan (${limits.maxVideos}).`
            );
          }
          if (!alreadySaved) {
            countVideos += 1;
          }
        }

        const updates: Record<string, unknown> = {
          "media.updatedAt": FieldValue.serverTimestamp(),
        };

        if (kind === "avatar") {
          updates["media.avatarUrl"] = downloadUrl;
        } else if (kind === "image") {
          updates["media.images"] = FieldValue.arrayUnion(downloadUrl);
        } else {
          updates["media.videos"] = FieldValue.arrayUnion(downloadUrl);
        }

        transaction.set(profileRef, updates, { merge: true });
        return {
          countImages,
          countVideos,
        };
      });

      return {
        success: true,
        kind,
        countImages: counts.countImages,
        countVideos: counts.countVideos,
      };
    } catch (error) {
      if (
        shouldCleanup &&
        uploadedPath &&
        error instanceof HttpsError &&
        (error.code === "permission-denied" || error.code === "failed-precondition")
      ) {
        await cleanupStorageObject(uploadedPath);
      }
      throw error;
    }
  }
);

// Backward-compatible alias for clients still calling finalizeMediaUpload.
export const finalizeMediaUpload = commitImageMetadata;

export const createPaySession = onCall<undefined, Promise<CreatePaySessionResult>>(
  {
    region: "us-central1",
  },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError("unauthenticated", "Login required.");
    }

    const sessionRef = db.collection("paySessions").doc();
    const expiresAt = Timestamp.fromMillis(Date.now() + PAY_SESSION_TTL_MS);

    await sessionRef.set({
      uid,
      createdAt: FieldValue.serverTimestamp(),
      expiresAt,
      used: false,
    });

    return {
      sessionId: sessionRef.id,
      payUrl: `${PAY_PORTAL_BASE_URL}/pay?s=${sessionRef.id}`,
    };
  }
);

export const exchangePaySessionForCustomToken = onCall<
  ExchangePaySessionPayload,
  Promise<ExchangePaySessionResult>
>(
  {
    region: "us-central1",
  },
  async (request) => {
    const sessionIdRaw = request.data?.sessionId;
    const sessionId = typeof sessionIdRaw === "string" ? sessionIdRaw.trim() : "";

    if (!sessionId) {
      throw new HttpsError("invalid-argument", "session-invalid");
    }

    const sessionRef = db.collection("paySessions").doc(sessionId);
    let uidForToken: string | null = null;

    await db.runTransaction(async (transaction) => {
      const sessionSnap = await transaction.get(sessionRef);
      if (!sessionSnap.exists) {
        throw new HttpsError("unauthenticated", "session-invalid");
      }

      const data = (sessionSnap.data() ?? {}) as PaySessionDoc;
      const uid = data.uid?.trim() ?? "";
      const used = data.used === true;
      const expiresAt = data.expiresAt;
      const usedAt = data.usedAt;
      const nowMs = Date.now();
      const expired =
        !expiresAt || !(expiresAt instanceof Timestamp) || expiresAt.toMillis() <= nowMs;

      if (!uid) {
        throw new HttpsError("unauthenticated", "session-invalid");
      }

      if (expired) {
        throw new HttpsError("failed-precondition", "session-expired");
      }

      if (used) {
        const usedAtMs = usedAt instanceof Timestamp ? usedAt.toMillis() : Number.NaN;
        const canReissue =
          Number.isFinite(usedAtMs) && nowMs - usedAtMs <= PAY_SESSION_REISSUE_WINDOW_MS;

        if (!canReissue) {
          throw new HttpsError("unauthenticated", "session-invalid");
        }

        uidForToken = uid;
        return;
      }

      uidForToken = uid;
      transaction.set(
        sessionRef,
        {
          used: true,
          usedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    });

    if (!uidForToken) {
      throw new HttpsError("unauthenticated", "session-invalid");
    }

    const customToken = await getAuth().createCustomToken(uidForToken);
    return { customToken };
  }
);
