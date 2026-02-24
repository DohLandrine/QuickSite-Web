import { adminDb } from "@/src/lib/firebaseAdmin";
import { notFound } from "next/navigation";
import ProfilePageClient from "./profile-page-client";
import { type ProfileData } from "./types";

type PageProps = {
  params: Promise<{ username: string }>;
};

function isPlanActive(planExpiresAt: any): boolean {
  if (!planExpiresAt) return false;

  const ms =
    typeof planExpiresAt.toDate === "function"
      ? planExpiresAt.toDate().getTime()
      : new Date(planExpiresAt).getTime();

  return Number.isFinite(ms) && ms > Date.now();
}

function readUrlArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0);
}

export default async function UserPage({ params }: PageProps) {
  const { username } = await params;

  const profileSnap = await adminDb.collection("profiles").doc(username).get();

  if (!profileSnap.exists) {
    notFound();
  }

  const profile = profileSnap.data() as any;
  if (profile?.published !== true) {
    notFound();
  }
  const content = profile?.content ?? {};
  const media = profile?.media ?? {};
  const mediaAvatarUrl =
    typeof media?.avatarUrl === "string" ? media.avatarUrl.trim() : "";
  const mediaImages = readUrlArray(media?.images);
  const mediaVideos = readUrlArray(media?.videos);

  // Default plan state
  let plan: "free" | "pro" | "business" = "free";
  let planExpiresAt: any = null;

  if (profile?.uid) {
    const userSnap = await adminDb
      .collection("users")
      .doc(profile.uid)
      .get();

    if (userSnap.exists) {
      const u = userSnap.data() as any;
      if (u?.plan) plan = u.plan;
      planExpiresAt = u?.planExpiresAt ?? null;
    }
  }

  // Check if subscription is active
  const active =
    plan === "pro" || plan === "business"
      ? isPlanActive(planExpiresAt)
      : false;

  // ------------------------------
  // TEMPLATE GATING LOGIC
  // ------------------------------

  let allowedTemplate = "business_card_v1";

  if (active) {
    // Pro & Business can use any template
    allowedTemplate =
      profile?.templateId ?? "business_card_v1";
  } else {
    // Free or expired users are forced to basic template
    allowedTemplate = "business_card_v1";
  }

  // Show branding if NOT active
  const showBranding = !active;

  const data: ProfileData = {
    username,
    templateId: allowedTemplate,
    published: !!profile?.published,
    theme:
      profile?.theme ?? {
        mode: "light",
        primary: "#0F172A",
        accent: "#2563EB",
      },
    content: {
      ...content,
      avatar: mediaAvatarUrl || content?.avatar || null,
      gallery: mediaImages.length > 0 ? mediaImages : (content?.gallery ?? []),
      videos: content?.videos ?? [],
    },
    media: {
      videos: mediaVideos,
    },
    showBranding,
    plan,
    active,
  };

  return <ProfilePageClient profile={data} />;
}
