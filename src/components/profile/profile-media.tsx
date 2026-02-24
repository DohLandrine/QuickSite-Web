"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";

export type ProfileAvatarMedia = {
  id?: string;
  url?: string;
  thumbUrl?: string;
  mediumUrl?: string;
  updatedAt?: unknown;
};

export type ProfileGalleryMedia = {
  id?: string;
  url?: string;
  thumbUrl?: string;
  mediumUrl?: string;
  createdAt?: unknown;
};

export type ProfileVideoMedia = {
  id?: string;
  url?: string;
  posterUrl?: string;
  createdAt?: unknown;
};

type ProfileMediaProps = {
  avatar?: ProfileAvatarMedia | null;
  gallery?: ProfileGalleryMedia[] | null;
  videos?: ProfileVideoMedia[] | null;
  active: boolean;
  maxImages?: number;
  showBusinessVideos?: boolean;
  accentColor?: string;
};

function getMediaSrc(
  item: { thumbUrl?: string; mediumUrl?: string; url?: string },
  preferred: "thumb" | "medium"
) {
  if (preferred === "thumb") {
    return item.thumbUrl || item.mediumUrl || item.url || "";
  }

  return item.mediumUrl || item.url || item.thumbUrl || "";
}

function getVideoSrc(item: { url?: string }) {
  return item.url || "";
}

export default function ProfileMedia({
  avatar,
  gallery,
  videos,
  active,
  maxImages = Number.POSITIVE_INFINITY,
  showBusinessVideos = false,
  accentColor = "var(--qs-accent)",
}: ProfileMediaProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const avatarSrc = useMemo(
    () => getMediaSrc(avatar ?? {}, "medium"),
    [avatar]
  );

  const safeGallery = useMemo(
    () =>
      (Array.isArray(gallery) ? gallery : []).filter((item) =>
        Boolean(getMediaSrc(item ?? {}, "thumb"))
      ),
    [gallery]
  );

  const limitedGallery = useMemo(() => {
    const limit = Number.isFinite(maxImages) ? Math.max(0, Math.floor(maxImages)) : safeGallery.length;
    return safeGallery.slice(0, limit);
  }, [maxImages, safeGallery]);

  const safeVideos = useMemo(
    () =>
      (Array.isArray(videos) ? videos : []).filter((item) =>
        Boolean(getVideoSrc(item ?? {}))
      ),
    [videos]
  );

  const canShowGallery = active && limitedGallery.length > 0;
  const canShowVideos = showBusinessVideos && safeVideos.length > 0;
  const hasMedia = Boolean(avatarSrc) || canShowGallery || canShowVideos;
  const selectedImage =
    activeIndex !== null ? limitedGallery[activeIndex] : null;
  const selectedImageSrc = selectedImage
    ? getMediaSrc(selectedImage, "medium")
    : "";

  useEffect(() => {
    if (activeIndex === null) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActiveIndex(null);
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [activeIndex]);

  if (!hasMedia) {
    return null;
  }

  return (
    <div className="qs-media space-y-6">
      {avatarSrc && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="qs-media-card flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white/70 p-4 shadow-sm"
        >
          <div className="qs-avatar-frame h-24 w-24 overflow-hidden rounded-full ring-2 ring-black/5">
            <img
              src={avatarSrc}
              alt="Profile avatar"
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>

          <div>
            <p className="qs-media-label text-sm text-slate-500">
              Profile photo
            </p>
            <p className="qs-media-title font-medium text-slate-800">
              Brand identity
            </p>
          </div>
        </motion.div>
      )}

      {canShowGallery && (
        <div className="space-y-3">
          <p className="qs-media-label text-sm text-slate-500">Gallery</p>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {limitedGallery.map((item, idx) => (
              <motion.button
                key={item.id ?? `${item.url}-${idx}`}
                type="button"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="qs-gallery-tile relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-slate-100"
                onClick={() => setActiveIndex(idx)}
                aria-label={`Open gallery image ${idx + 1}`}
              >
                <img
                  src={getMediaSrc(item, "thumb")}
                  alt={`Gallery image ${idx + 1}`}
                  className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                  loading="lazy"
                />
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {canShowVideos && (
        <div className="space-y-3">
          <p className="qs-media-label text-sm text-slate-500">Videos</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {safeVideos.map((item, idx) => (
              <div
                key={item.id ?? `${item.url}-${idx}`}
                className="overflow-hidden rounded-xl border border-slate-200 bg-black"
              >
                <video
                  controls
                  preload="metadata"
                  poster={item.posterUrl}
                  className="h-full w-full object-cover"
                >
                  <source src={getVideoSrc(item)} type="video/mp4" />
                </video>
              </div>
            ))}
          </div>
        </div>
      )}

      <AnimatePresence>
        {selectedImage && selectedImageSrc && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActiveIndex(null)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
            role="dialog"
            aria-modal="true"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ duration: 0.18 }}
              onClick={(event) => event.stopPropagation()}
              className="relative w-full max-w-4xl overflow-hidden rounded-2xl border border-white/10 bg-black"
            >
              <button
                type="button"
                onClick={() => setActiveIndex(null)}
                className="absolute right-3 top-3 rounded-lg px-3 py-1.5 text-sm font-medium text-white/90 backdrop-blur-sm"
                style={{ backgroundColor: accentColor }}
              >
                Close
              </button>

              <img
                src={selectedImageSrc}
                alt="Gallery preview"
                className="max-h-[85vh] w-full object-contain"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
