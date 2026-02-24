"use client";

import { motion } from "framer-motion";
import ProfileMedia from "@/src/components/profile/profile-media";
import VideosSection from "@/src/components/profile/videos-section";
import { ProfileData } from "../types";

export default function SellerV1({
  profile,
}: {
  profile: ProfileData;
}) {
  const hero = profile.content?.hero ?? {};
  const about = profile.content?.about ?? {};
  const avatar = profile.content?.avatar ?? null;
  const gallery = profile.content?.gallery ?? [];
  const videos = profile?.media?.videos ?? [];
  const videoEnabled = profile.plan === "business" && profile.active;
  const mediaPlan = profile.active ? profile.plan : "free";
  const maxImages =
    mediaPlan === "business" ? 40 : mediaPlan === "pro" ? 20 : 1;
  const socials = profile.content?.socials ?? {};
  const location = profile.content?.location ?? {};
  const hasAvatar = Boolean(avatar?.url || avatar?.mediumUrl || avatar?.thumbUrl);
  const hasGallery = profile.active && gallery.length > 0;

  const whatsappValue: string = (socials.whatsapp ?? "").toString().trim();
  const whatsappDigits = whatsappValue.replace(/[^\d]/g, "");
  const whatsappLink = whatsappDigits
    ? `https://wa.me/${whatsappDigits}`
    : null;

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, var(--qs-primary) 0%, #020617 100%)",
          }}
        />
        <div className="relative mx-auto max-w-6xl px-6 py-20 text-white">
          <motion.h1
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl sm:text-5xl font-semibold"
          >
            {hero.title ?? profile.username}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mt-4 text-white/80 text-lg"
          >
            {hero.subtitle ?? "Premium products. Trusted service."}
          </motion.p>

          {whatsappLink && (
            <motion.a
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              href={whatsappLink}
              target="_blank"
              className="inline-block mt-8 px-6 py-3 rounded-xl text-white font-semibold"
              style={{ backgroundColor: "var(--qs-accent)" }}
            >
              Order on WhatsApp
            </motion.a>
          )}
        </div>
      </section>

      {/* Products */}
      <main className="mx-auto max-w-6xl px-6 py-16 space-y-16">
        {(hasAvatar || hasGallery) && (
          <section className="[&_.qs-avatar-frame]:rounded-2xl">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">
                {profile.active ? "Store Media" : "Profile Photo"}
              </h2>
              {hasGallery && (
                <span className="text-sm text-slate-500">
                  {gallery.length} items
                </span>
              )}
            </div>

            <div className="mt-6">
              <ProfileMedia
                avatar={avatar}
                gallery={gallery}
                active={profile.active}
                maxImages={maxImages}
                accentColor="var(--qs-accent)"
              />
            </div>
          </section>
        )}

        {videoEnabled && videos.length > 0 && (
          <section>
            <VideosSection
              videos={videos}
              enabled={videoEnabled}
              accent={profile.theme?.accent}
            />
          </section>
        )}

        <section>
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Business Snapshot</h2>
          </div>

          <p className="mt-3 text-slate-600">
            {profile.active
              ? "Your gallery is optimized with thumbnails and tap-to-view previews."
              : "Upgrade to Pro or Business to unlock product gallery display."}
          </p>
        </section>

        {/* About */}
        <section className="bg-slate-50 p-8 rounded-2xl">
          <h2 className="font-semibold text-lg">About</h2>
          <p className="mt-4 text-slate-600">
            {about.text ?? "Describe your business in QuickSite app."}
          </p>
        </section>

        {/* Location */}
        {(location.city || location.area) && (
          <section>
            <h2 className="font-semibold text-lg">Location</h2>
            <p className="mt-2 text-slate-600">
              📍 {location.area ? `${location.area}, ` : ""}
              {location.city}
            </p>
          </section>
        )}

        {/* Branding */}
        {profile.showBranding && (
          <footer className="pt-10 border-t text-sm text-slate-500">
            Powered by{" "}
            <span
              className="font-semibold"
              style={{ color: "var(--qs-accent)" }}
            >
              QuickSite
            </span>
          </footer>
        )}
      </main>
    </div>
  );
}
