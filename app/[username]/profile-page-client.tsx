"use client";

import type {
  ProfileAvatarMedia,
  ProfileGalleryMedia,
  ProfileVideoMedia,
} from "@/src/components/profile/profile-media";
import { renderTemplate } from "./templates";
import { ProfileData } from "./types";

function normalizeAvatar(
  avatar: unknown
): ProfileAvatarMedia | null {
  if (typeof avatar === "string") {
    const url = avatar.trim();
    return url ? { url } : null;
  }

  if (!avatar || typeof avatar !== "object") {
    return null;
  }

  const item = avatar as Record<string, unknown>;
  const hasAnySrc = Boolean(item.url || item.mediumUrl || item.thumbUrl);

  if (!hasAnySrc) {
    return null;
  }

  return item as ProfileAvatarMedia;
}

function normalizeGallery(
  gallery: unknown
): ProfileGalleryMedia[] {
  if (!Array.isArray(gallery)) {
    return [];
  }

  return gallery
    .map((item, index) => {
      if (typeof item === "string") {
        const url = item.trim();
        return url ? { id: `img-${index}`, url } : null;
      }

      if (!item || typeof item !== "object") {
        return null;
      }

      const media = item as Record<string, unknown>;
      if (media.url || media.mediumUrl || media.thumbUrl) {
        return media as ProfileGalleryMedia;
      }

      return null;
    })
    .filter(Boolean) as ProfileGalleryMedia[];
}

function normalizeVideos(videos: unknown): ProfileVideoMedia[] {
  if (!Array.isArray(videos)) {
    return [];
  }

  return videos
    .map((item, index) => {
      if (typeof item === "string") {
        const url = item.trim();
        return url ? { id: `video-${index}`, url } : null;
      }

      if (!item || typeof item !== "object") {
        return null;
      }

      const media = item as Record<string, unknown>;
      const url =
        (typeof media.url === "string" && media.url.trim()) ||
        (typeof media.src === "string" && media.src.trim()) ||
        "";

      if (!url) {
        return null;
      }

      const posterUrl =
        typeof media.posterUrl === "string" ? media.posterUrl : undefined;

      return {
        ...(typeof media.id === "string" ? { id: media.id } : {}),
        url,
        ...(posterUrl ? { posterUrl } : {}),
      };
    })
    .filter(Boolean) as ProfileVideoMedia[];
}

function normalizeVideoUrls(videos: unknown): string[] {
  if (!Array.isArray(videos)) {
    return [];
  }

  return videos
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0);
}

export default function ProfilePageClient({
  profile,
}: {
  profile: ProfileData;
}) {
  const primary = profile.theme?.primary ?? "#0F172A";
  const accent = profile.theme?.accent ?? "#2563EB";
  const normalizedProfile: ProfileData = {
    ...profile,
    content: {
      ...profile.content,
      avatar: normalizeAvatar(profile.content?.avatar),
      gallery: normalizeGallery(profile.content?.gallery),
      videos: normalizeVideos(profile.content?.videos),
    },
    media: {
      videos: normalizeVideoUrls(profile.media?.videos),
    },
  };

  return (
    <div
      style={
        {
          "--qs-primary": primary,
          "--qs-accent": accent,
        } as React.CSSProperties
      }
    >
      {renderTemplate(normalizedProfile)}
    </div>
  );
}
