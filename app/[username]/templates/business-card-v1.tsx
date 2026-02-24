"use client";

import { motion } from "framer-motion";
import ProfileMedia from "@/src/components/profile/profile-media";
import VideosSection from "@/src/components/profile/videos-section";
import { ProfileData } from "../types";

export default function BusinessCardV1({
  profile,
}: {
  profile: ProfileData;
}) {
  const hero = profile.content?.hero ?? {};
  const about = profile.content?.about ?? {};
  const services = profile.content?.services ?? [];
  const socials = profile.content?.socials ?? {};
  const avatar = profile.content?.avatar ?? null;
  const gallery = profile.content?.gallery ?? [];
  const videos = profile?.media?.videos ?? [];
  const videoEnabled = profile.plan === "business" && profile.active;
  const mediaPlan = profile.active ? profile.plan : "free";
  const maxImages =
    mediaPlan === "business" ? 40 : mediaPlan === "pro" ? 20 : 1;
  const hasAvatar = Boolean(avatar?.url || avatar?.mediumUrl || avatar?.thumbUrl);
  const hasGallery = profile.active && gallery.length > 0;

  const whatsappValue: string = (socials.whatsapp ?? "").toString().trim();
  const whatsappDigits = whatsappValue.replace(/[^\d]/g, "");
  const whatsappLink = whatsappDigits
    ? `https://wa.me/${whatsappDigits}`
    : null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, var(--qs-primary) 0%, #020617 100%)",
          }}
        />
        <div className="relative mx-auto max-w-5xl px-6 py-20 text-white">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
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
            {hero.subtitle ?? "Professional profile powered by QuickSite."}
          </motion.p>

          {whatsappLink && (
            <motion.a
              whileHover={{ y: -3 }}
              href={whatsappLink}
              target="_blank"
              className="inline-block mt-8 px-6 py-3 rounded-xl text-white font-semibold"
              style={{ backgroundColor: "var(--qs-accent)" }}
            >
              {hero.ctaText ?? "Chat on WhatsApp"}
            </motion.a>
          )}
        </div>
      </section>

      {/* Body */}
      <main className="mx-auto max-w-5xl px-6 py-12 space-y-10">
        {(hasAvatar || hasGallery) && (
          <section className="bg-white p-6 rounded-2xl shadow-sm">
            <h2 className="font-semibold text-lg">Media</h2>

            <div className="mt-4 [&_.qs-media-card]:bg-slate-50 [&_.qs-media-card]:border-slate-200">
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
          <section className="bg-white p-6 rounded-2xl shadow-sm">
            <VideosSection
              videos={videos}
              enabled={videoEnabled}
              accent={profile.theme?.accent}
            />
          </section>
        )}

        <section className="bg-white p-6 rounded-2xl shadow-sm">
          <h2 className="font-semibold text-lg">About</h2>
          <p className="mt-3 text-slate-700">
            {about.text ?? "Add bio in QuickSite app."}
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-lg">Services</h2>
          <div className="grid sm:grid-cols-2 gap-4 mt-4">
            {services.map((s: any, idx: number) => (
              <motion.div
                key={idx}
                whileHover={{ y: -4 }}
                className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100"
              >
                <h3
                  className="font-semibold"
                  style={{ color: "var(--qs-primary)" }}
                >
                  {s.title}
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  {s.description}
                </p>
              </motion.div>
            ))}
          </div>
        </section>

        {profile.showBranding && (
          <footer className="text-sm text-slate-600 pt-8 border-t">
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
