"use client";

import { useState, type CSSProperties } from "react";
import { motion } from "framer-motion";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/src/lib/firebaseClient";
import ProfileMedia from "@/src/components/profile/profile-media";
import VideosSection from "@/src/components/profile/videos-section";
import TemplateShell from "@/src/components/templates/template-shell";
import TemplateSection from "@/src/components/templates/template-section";
import SectionHeader from "@/src/components/templates/section-header";
import { ProfileData } from "../types";

const PRIMARY_BUTTON_CLASS =
  "rounded-xl bg-[--qs-accent] px-5 py-3 font-semibold text-slate-950 transition-transform duration-150 hover:scale-[1.02] active:scale-[0.98]";
const SECONDARY_BUTTON_CLASS =
  "rounded-xl border border-white/20 px-5 py-3 font-semibold text-white transition-colors hover:border-white/35";

export default function DeveloperV1({
  profile,
}: {
  profile: ProfileData;
}) {
  const hero = profile.content?.hero ?? {};
  const about = profile.content?.about ?? {};
  const services = profile.content?.services ?? [];
  const avatar = profile.content?.avatar ?? null;
  const gallery = profile.content?.gallery ?? [];
  const videos = profile?.media?.videos ?? [];
  const videoEnabled = profile.plan === "business" && profile.active;
  const mediaPlan = profile.active ? profile.plan : "free";
  const maxImages =
    mediaPlan === "business" ? 40 : mediaPlan === "pro" ? 20 : 1;
  const socials = profile.content?.socials ?? {};
  const hasAvatar = Boolean(avatar?.url || avatar?.mediumUrl || avatar?.thumbUrl);
  const hasGallery = profile.active && gallery.length > 0;

  const skills = services.length
    ? services
    : [{ title: "Your Skill", description: "Describe your expertise." }];

  const themeAccent = profile.theme?.accent?.trim();
  const accent = themeAccent ? `var(--qs-accent, ${themeAccent})` : "var(--qs-accent)";
  const shellStyle = themeAccent
    ? ({ ["--qs-accent" as string]: themeAccent } as CSSProperties)
    : undefined;

  const whatsappValue: string = (socials.whatsapp ?? "").toString().trim();
  const cleanWhatsapp = whatsappValue.replace(/[^\d+]/g, "");

  let whatsappDigits = cleanWhatsapp.startsWith("+")
    ? cleanWhatsapp.slice(1)
    : cleanWhatsapp;

  if (whatsappDigits.startsWith("00")) {
    whatsappDigits = whatsappDigits.slice(2);
  }

  if (whatsappDigits.length === 10 && whatsappDigits.startsWith("0")) {
    whatsappDigits = `237${whatsappDigits.slice(1)}`;
  } else if (whatsappDigits.length === 9 && !whatsappDigits.startsWith("237")) {
    whatsappDigits = `237${whatsappDigits}`;
  }

  const whatsappLink = whatsappDigits
    ? `https://wa.me/${whatsappDigits}`
    : null;

  return (
    <TemplateShell style={shellStyle}>
      <TemplateSection divider={false} spacing="py-16">
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
          {hero.title ?? profile.username}
        </h1>

        <p className="mt-4 max-w-2xl text-slate-300 leading-relaxed">
          {hero.subtitle ?? "Building clean, scalable digital experiences."}
        </p>

        <div className="mt-8 flex flex-wrap gap-4">
          {whatsappLink && (
            <motion.a
              whileHover={{ y: -2, scale: 1.02 }}
              whileTap={{ y: 0, scale: 0.98 }}
              href={whatsappLink}
              target="_blank"
              rel="noreferrer"
              className={PRIMARY_BUTTON_CLASS}
            >
              {hero.ctaText ?? "Let's Talk"}
            </motion.a>
          )}

          {socials.email && (
            <a
              href={`mailto:${socials.email}`}
              className={SECONDARY_BUTTON_CLASS}
            >
              Email Me
            </a>
          )}
        </div>
      </TemplateSection>

      <TemplateSection spacing="py-12">
        <SectionHeader title="About" />

        <p className="mt-4 max-w-3xl text-slate-300 leading-relaxed">
          {about.text ?? "Write a professional summary in QuickSite app."}
        </p>
      </TemplateSection>

      <TemplateSection spacing="py-12">
        <SectionHeader
          title="Skills"
          rightBadge={`${skills.length} ${skills.length === 1 ? "skill" : "skills"}`}
        />

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {skills.map((skill: any, idx: number) => (
            <div
              key={idx}
              className="rounded-2xl border border-white/10 bg-slate-900/70 p-6 shadow-[0_10px_30px_rgba(2,6,23,0.35)]"
            >
              <h3 className="font-semibold tracking-tight" style={{ color: accent }}>
                {skill.title}
              </h3>
              <p className="mt-3 text-slate-300 leading-relaxed">
                {skill.description}
              </p>
            </div>
          ))}
        </div>
      </TemplateSection>

      {(hasAvatar || hasGallery) && (
        <TemplateSection
          spacing="py-12"
          className="[&_.qs-media-card]:border-white/10 [&_.qs-media-card]:bg-slate-900/70 [&_.qs-media-label]:text-slate-400 [&_.qs-media-title]:text-slate-100 [&_.qs-avatar-frame]:ring-white/10 [&_.qs-gallery-tile]:border-white/10 [&_.qs-gallery-tile]:bg-slate-900"
        >
          <SectionHeader title={profile.active ? "Projects" : "Profile Media"} />

          <div className="mt-6">
            <ProfileMedia
              avatar={avatar}
              gallery={gallery}
              active={profile.active}
              maxImages={maxImages}
              accentColor={accent}
            />
          </div>
        </TemplateSection>
      )}

      {videoEnabled && videos.length > 0 && (
        <TemplateSection spacing="py-12">
          <SectionHeader title="Videos" />

          <div className="mt-6">
            <VideosSection
              videos={videos}
              enabled={videoEnabled}
              accent={accent}
            />
          </div>
        </TemplateSection>
      )}

      {profile.active && (
        <TemplateSection spacing="py-12">
          <SectionHeader title="Contact" />
          <ContactForm username={profile.username} />
        </TemplateSection>
      )}

      {profile.showBranding && (
        <TemplateSection spacing="py-8" className="text-sm text-slate-400">
          Powered by{" "}
          <span style={{ color: accent }} className="font-semibold">
            QuickSite
          </span>
        </TemplateSection>
      )}
    </TemplateShell>
  );
}

function ContactForm({ username }: { username: string }) {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!name || !message) {
      setStatus("Please fill required fields.");
      return;
    }

    setLoading(true);
    setStatus("Sending...");

    try {
      const submitMessage = httpsCallable(functions, "submitMessage");

      await submitMessage({
        username,
        name,
        contact,
        message,
      });

      setStatus("Message sent successfully ✅");
      setName("");
      setContact("");
      setMessage("");
    } catch (e: any) {
      setStatus(e?.message ?? "Error sending message.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-6 max-w-md space-y-4">
      <input
        className="w-full rounded-xl border border-white/10 bg-slate-900/60 px-4 py-3 text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[--qs-accent]"
        placeholder="Your name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <input
        className="w-full rounded-xl border border-white/10 bg-slate-900/60 px-4 py-3 text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[--qs-accent]"
        placeholder="Email or phone"
        value={contact}
        onChange={(e) => setContact(e.target.value)}
      />

      <textarea
        className="w-full rounded-xl border border-white/10 bg-slate-900/60 px-4 py-3 text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[--qs-accent]"
        placeholder="Your message"
        rows={4}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />

      <button
        onClick={submit}
        disabled={loading}
        className="rounded-xl bg-[--qs-accent] px-5 py-3 font-semibold text-slate-950 transition-transform duration-150 hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {loading ? "Sending..." : "Send Message"}
      </button>

      {status && <p className="text-slate-400">{status}</p>}
    </div>
  );
}
