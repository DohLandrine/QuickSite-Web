"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exchangePaySessionForCustomToken = exports.createPaySession = exports.finalizeMediaUpload = exports.commitImageMetadata = exports.getPlanLimits = void 0;
const app_1 = require("firebase-admin/app");
const auth_1 = require("firebase-admin/auth");
const firestore_1 = require("firebase-admin/firestore");
const storage_1 = require("firebase-admin/storage");
const https_1 = require("firebase-functions/v2/https");
(0, app_1.initializeApp)();
const db = (0, firestore_1.getFirestore)();
const PAY_PORTAL_BASE_URL = "https://quicksite-cm.web.app";
const PAY_SESSION_TTL_MS = 10 * 60 * 1000;
const PAY_SESSION_REISSUE_WINDOW_MS = 60 * 1000;
const IMAGE_MAX_BYTES = 2 * 1024 * 1024;
const VIDEO_MAX_BYTES = 25 * 1024 * 1024;
const PLAN_LIMITS = {
    free: { maxImages: 1, maxVideos: 0 },
    pro: { maxImages: 20, maxVideos: 0 },
    business: { maxImages: 40, maxVideos: 3 },
};
const IMAGE_CONTENT_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const VIDEO_CONTENT_TYPES = new Set(["video/mp4"]);
function isRecord(value) {
    return Boolean(value) && typeof value === "object";
}
function normalizePlan(rawPlan) {
    const value = typeof rawPlan === "string" ? rawPlan.trim().toLowerCase() : "";
    if (value === "pro" || value === "business") {
        return value;
    }
    return "free";
}
function toMillis(value) {
    if (!value) {
        return null;
    }
    if (value instanceof firestore_1.Timestamp) {
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
function hasActivePaidSubscription(plan, planExpiresAt) {
    if (plan === "free") {
        return false;
    }
    const expiresAtMs = toMillis(planExpiresAt);
    return expiresAtMs !== null && expiresAtMs > Date.now();
}
async function resolvePlan(uid) {
    const userSnap = await db.collection("users").doc(uid).get();
    const data = (userSnap.data() ?? {});
    const declaredPlan = normalizePlan(data.plan);
    const activePaidSubscription = hasActivePaidSubscription(declaredPlan, data.planExpiresAt);
    const plan = activePaidSubscription ? declaredPlan : "free";
    return {
        plan,
        declaredPlan,
        activePaidSubscription,
        limits: PLAN_LIMITS[plan],
    };
}
function normalizeString(raw) {
    return typeof raw === "string" ? raw.trim() : "";
}
function normalizeSizeBytes(raw) {
    if (typeof raw !== "number" || !Number.isFinite(raw)) {
        return null;
    }
    if (raw <= 0) {
        return null;
    }
    return Math.floor(raw);
}
function normalizeContentType(raw) {
    const value = normalizeString(raw).toLowerCase();
    return value.split(";")[0]?.trim() ?? "";
}
function normalizeStoragePath(raw) {
    const value = normalizeString(raw).replace(/^\/+/, "");
    return value;
}
function isUploadKind(value) {
    return value === "avatar" || value === "image" || value === "video";
}
function isUidScopedPath(path, uid) {
    return path.startsWith(`users/${uid}/`);
}
function isKindScopedPath(path, uid, kind) {
    const basePath = kind === "avatar"
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
function readStringArray(raw) {
    if (!Array.isArray(raw)) {
        return [];
    }
    return raw
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter((item) => item.length > 0);
}
async function cleanupStorageObject(path) {
    try {
        await (0, storage_1.getStorage)().bucket().file(path).delete({ ignoreNotFound: true });
    }
    catch {
        // Best-effort cleanup only.
    }
}
exports.getPlanLimits = (0, https_1.onCall)({
    region: "us-central1",
}, async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
        throw new https_1.HttpsError("unauthenticated", "Login required.");
    }
    return resolvePlan(uid);
});
exports.commitImageMetadata = (0, https_1.onCall)({
    region: "us-central1",
}, async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
        throw new https_1.HttpsError("unauthenticated", "Login required.");
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
            throw new https_1.HttpsError("invalid-argument", "username is required.");
        }
        if (!isUploadKind(kindRaw)) {
            throw new https_1.HttpsError("invalid-argument", "kind must be avatar, image, or video.");
        }
        const kind = kindRaw;
        uploadedPath = normalizeStoragePath(request.data?.path);
        if (!uploadedPath) {
            throw new https_1.HttpsError("invalid-argument", "path is required.");
        }
        if (!downloadUrl) {
            throw new https_1.HttpsError("invalid-argument", "downloadUrl is required.");
        }
        if (sizeBytes === null) {
            throw new https_1.HttpsError("invalid-argument", "sizeBytes must be a positive number.");
        }
        if (!contentType) {
            throw new https_1.HttpsError("invalid-argument", "contentType is required.");
        }
        if (!isUidScopedPath(uploadedPath, uid)) {
            throw new https_1.HttpsError("permission-denied", "Invalid upload path: uid mismatch.");
        }
        shouldCleanup = true;
        if (!isKindScopedPath(uploadedPath, uid, kind)) {
            throw new https_1.HttpsError("permission-denied", "Invalid upload path for this media kind.");
        }
        const isImageKind = kind === "avatar" || kind === "image";
        if (isImageKind) {
            if (!IMAGE_CONTENT_TYPES.has(contentType)) {
                throw new https_1.HttpsError("failed-precondition", "Invalid image type. Allowed: image/jpeg, image/png, image/webp.");
            }
            if (sizeBytes > IMAGE_MAX_BYTES) {
                throw new https_1.HttpsError("failed-precondition", "Image size must be 2MB or less.");
            }
        }
        else {
            if (!VIDEO_CONTENT_TYPES.has(contentType)) {
                throw new https_1.HttpsError("failed-precondition", "Invalid video type. Allowed: video/mp4.");
            }
            if (sizeBytes > VIDEO_MAX_BYTES) {
                throw new https_1.HttpsError("failed-precondition", "Video size must be 25MB or less.");
            }
        }
        const profileRef = db.collection("profiles").doc(username);
        const plan = await resolvePlan(uid);
        const counts = await db.runTransaction(async (transaction) => {
            const profileSnap = await transaction.get(profileRef);
            if (!profileSnap.exists) {
                throw new https_1.HttpsError("permission-denied", "Profile not found or not owned by user.");
            }
            const profile = (profileSnap.data() ?? {});
            const profileUid = normalizeString(profile.uid);
            if (profileUid !== uid) {
                throw new https_1.HttpsError("permission-denied", "Profile not found or not owned by user.");
            }
            const media = isRecord(profile.media) ? profile.media : {};
            const images = readStringArray(media.images);
            const videos = readStringArray(media.videos);
            const limits = plan.limits;
            let countImages = images.length;
            let countVideos = videos.length;
            if (kind === "image") {
                if (plan.plan === "free") {
                    throw new https_1.HttpsError("failed-precondition", "Free plan allows avatar only. Upgrade to Pro to add images.");
                }
                const alreadySaved = images.includes(downloadUrl);
                if (!alreadySaved && images.length >= limits.maxImages) {
                    throw new https_1.HttpsError("failed-precondition", `Image limit reached for ${plan.plan} plan (${limits.maxImages}).`);
                }
                if (!alreadySaved) {
                    countImages += 1;
                }
            }
            if (kind === "video") {
                if (plan.declaredPlan !== "business" || !plan.activePaidSubscription) {
                    throw new https_1.HttpsError("permission-denied", "Videos are available only on an active Business plan.");
                }
                if (!contentType.startsWith("video/")) {
                    throw new https_1.HttpsError("failed-precondition", "Invalid video type. contentType must start with video/.");
                }
                if (contentType !== "video/mp4") {
                    throw new https_1.HttpsError("failed-precondition", "Invalid video type. Allowed: video/mp4.");
                }
                if (sizeBytes > VIDEO_MAX_BYTES) {
                    throw new https_1.HttpsError("failed-precondition", "Video size must be 25MB or less.");
                }
                const alreadySaved = videos.includes(downloadUrl);
                if (!alreadySaved && videos.length >= limits.maxVideos) {
                    throw new https_1.HttpsError("failed-precondition", `Video limit reached for business plan (${limits.maxVideos}).`);
                }
                if (!alreadySaved) {
                    countVideos += 1;
                }
            }
            const updates = {
                "media.updatedAt": firestore_1.FieldValue.serverTimestamp(),
            };
            if (kind === "avatar") {
                updates["media.avatarUrl"] = downloadUrl;
            }
            else if (kind === "image") {
                updates["media.images"] = firestore_1.FieldValue.arrayUnion(downloadUrl);
            }
            else {
                updates["media.videos"] = firestore_1.FieldValue.arrayUnion(downloadUrl);
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
    }
    catch (error) {
        if (shouldCleanup &&
            uploadedPath &&
            error instanceof https_1.HttpsError &&
            (error.code === "permission-denied" || error.code === "failed-precondition")) {
            await cleanupStorageObject(uploadedPath);
        }
        throw error;
    }
});
// Backward-compatible alias for clients still calling finalizeMediaUpload.
exports.finalizeMediaUpload = exports.commitImageMetadata;
exports.createPaySession = (0, https_1.onCall)({
    region: "us-central1",
}, async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
        throw new https_1.HttpsError("unauthenticated", "Login required.");
    }
    const sessionRef = db.collection("paySessions").doc();
    const expiresAt = firestore_1.Timestamp.fromMillis(Date.now() + PAY_SESSION_TTL_MS);
    await sessionRef.set({
        uid,
        createdAt: firestore_1.FieldValue.serverTimestamp(),
        expiresAt,
        used: false,
    });
    return {
        sessionId: sessionRef.id,
        payUrl: `${PAY_PORTAL_BASE_URL}/pay?s=${sessionRef.id}`,
    };
});
exports.exchangePaySessionForCustomToken = (0, https_1.onCall)({
    region: "us-central1",
}, async (request) => {
    const sessionIdRaw = request.data?.sessionId;
    const sessionId = typeof sessionIdRaw === "string" ? sessionIdRaw.trim() : "";
    if (!sessionId) {
        throw new https_1.HttpsError("invalid-argument", "session-invalid");
    }
    const sessionRef = db.collection("paySessions").doc(sessionId);
    let uidForToken = null;
    await db.runTransaction(async (transaction) => {
        const sessionSnap = await transaction.get(sessionRef);
        if (!sessionSnap.exists) {
            throw new https_1.HttpsError("unauthenticated", "session-invalid");
        }
        const data = (sessionSnap.data() ?? {});
        const uid = data.uid?.trim() ?? "";
        const used = data.used === true;
        const expiresAt = data.expiresAt;
        const usedAt = data.usedAt;
        const nowMs = Date.now();
        const expired = !expiresAt || !(expiresAt instanceof firestore_1.Timestamp) || expiresAt.toMillis() <= nowMs;
        if (!uid) {
            throw new https_1.HttpsError("unauthenticated", "session-invalid");
        }
        if (expired) {
            throw new https_1.HttpsError("failed-precondition", "session-expired");
        }
        if (used) {
            const usedAtMs = usedAt instanceof firestore_1.Timestamp ? usedAt.toMillis() : Number.NaN;
            const canReissue = Number.isFinite(usedAtMs) && nowMs - usedAtMs <= PAY_SESSION_REISSUE_WINDOW_MS;
            if (!canReissue) {
                throw new https_1.HttpsError("unauthenticated", "session-invalid");
            }
            uidForToken = uid;
            return;
        }
        uidForToken = uid;
        transaction.set(sessionRef, {
            used: true,
            usedAt: firestore_1.FieldValue.serverTimestamp(),
        }, { merge: true });
    });
    if (!uidForToken) {
        throw new https_1.HttpsError("unauthenticated", "session-invalid");
    }
    const customToken = await (0, auth_1.getAuth)().createCustomToken(uidForToken);
    return { customToken };
});
