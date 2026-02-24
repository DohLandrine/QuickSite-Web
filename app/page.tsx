"use client";

import { Plus_Jakarta_Sans } from "next/font/google";
import { motion } from "framer-motion";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import { PAY_THEME, PLAY_STORE_URL } from "@/src/lib/constants";
import { db } from "@/src/lib/firebase";
import {
  DEFAULT_PLAN_CONFIG,
  parsePlansPublicDoc,
  type PlanConfigPublic,
} from "@/src/lib/plan-config";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const HOW_IT_WORKS = [
  "Pick template",
  "Add info",
  "Publish",
] as const;

const WHY_POINTS = [
  "People keep asking for one clean link.",
  "Long chat threads can reduce trust and replies.",
  "A polished page makes your business look serious fast.",
  "Share one WhatsApp-ready link with work, prices, and contact.",
] as const;

function isExternalUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

export default function Home() {
  const [plansPublic, setPlansPublic] = useState<PlanConfigPublic>(DEFAULT_PLAN_CONFIG);

  useEffect(() => {
    let cancelled = false;

    const loadPlans = async () => {
      try {
        const snap = await getDoc(doc(db, "config", "plansPublic"));
        const next = snap.exists()
          ? parsePlansPublicDoc(snap.data())
          : DEFAULT_PLAN_CONFIG;
        if (!cancelled) {
          setPlansPublic(next);
        }
      } catch {
        if (!cancelled) {
          setPlansPublic(DEFAULT_PLAN_CONFIG);
        }
      }
    };

    void loadPlans();
    return () => {
      cancelled = true;
    };
  }, []);

  const plans = useMemo(() => {
    const order =
      plansPublic.displayOrder.length > 0
        ? plansPublic.displayOrder
        : DEFAULT_PLAN_CONFIG.displayOrder;
    return order.map((id) => ({
      id,
      plan: plansPublic.plans[id] ?? DEFAULT_PLAN_CONFIG.plans[id],
    }));
  }, [plansPublic]);

  const downloadHref = PLAY_STORE_URL || "/#download";
  const isDownloadExternal = isExternalUrl(downloadHref);

  return (
    <main
      className={`${plusJakarta.className} min-h-screen`}
      style={{ backgroundColor: PAY_THEME.background, color: PAY_THEME.emphasis }}
    >
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-14 px-6 py-10 md:px-10 md:py-14">
        <motion.section
          className="rounded-3xl border border-[#f2ba78] px-6 py-10 md:px-10"
          style={{
            background:
              "linear-gradient(140deg, rgba(255,206,153,0.55) 0%, rgba(255,253,241,1) 62%)",
          }}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-[#8f4f14]">
            QuickSite
          </p>
          <h1 className="max-w-2xl text-3xl font-extrabold leading-tight md:text-5xl">
            Your website link in minutes
          </h1>
          <p className="mt-4 max-w-2xl text-base text-[#8f4f14] md:text-lg">
            Stop sending long chats. Send one clean link on WhatsApp.
          </p>
          <div className="mt-7">
            <a
              href={downloadHref}
              {...(isDownloadExternal
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
              className="inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-bold transition-transform hover:-translate-y-0.5"
              style={{ backgroundColor: PAY_THEME.accent, color: PAY_THEME.emphasis }}
            >
              Download QuickSite
            </a>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.35 }}
        >
          <h2 className="text-2xl font-extrabold md:text-3xl">How it works</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {HOW_IT_WORKS.map((step, index) => (
              <div
                key={step}
                className="rounded-2xl border border-[#f2ba78] p-5"
                style={{ backgroundColor: "#fff8ea" }}
              >
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8f4f14]">
                  Step {index + 1}
                </p>
                <p className="mt-2 text-lg font-semibold">{step}</p>
              </div>
            ))}
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.35 }}
        >
          <h2 className="text-2xl font-extrabold md:text-3xl">
            Why QuickSite
          </h2>
          <div className="mt-5 grid gap-3">
            {WHY_POINTS.map((point) => (
              <div
                key={point}
                className="rounded-2xl border border-[#f2ba78] px-4 py-3"
                style={{ backgroundColor: "#fffaf0" }}
              >
                <p className="text-sm md:text-base">{point}</p>
              </div>
            ))}
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.35 }}
        >
          <h2 className="text-2xl font-extrabold md:text-3xl">
            Plans preview
          </h2>
          <p className="mt-2 text-sm text-[#8f4f14]">
            Live plan labels and features are loaded from `config/plansPublic`.
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {plans.map(({ id, plan }) => (
              <article
                key={id}
                className="rounded-2xl border border-[#f2ba78] p-5"
                style={{ backgroundColor: PAY_THEME.surface }}
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="text-lg font-bold">{plan.label}</h3>
                  {plan.badge ? (
                    <span
                      className="rounded-full px-2.5 py-1 text-xs font-semibold"
                      style={{ backgroundColor: "#ffe5cc", color: PAY_THEME.emphasis }}
                    >
                      {plan.badge}
                    </span>
                  ) : null}
                </div>
                <p className="text-sm text-[#8f4f14]">{plan.tagline}</p>
                <ul className="mt-3 space-y-1.5">
                  {plan.features.map((feature) => (
                    <li key={feature} className="text-sm">
                      • {feature}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </motion.section>

        <motion.section
          id="download"
          className="rounded-3xl border border-[#f2ba78] px-6 py-8 text-center md:px-10"
          style={{ backgroundColor: "#fff8eb" }}
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.35 }}
        >
          <p className="text-sm uppercase tracking-[0.16em] text-[#8f4f14]">
            Start now
          </p>
          <p className="mt-2 text-2xl font-extrabold md:text-3xl">
            Send one link and look professional instantly
          </p>
          <a
            href={downloadHref}
            {...(isDownloadExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            className="mt-6 inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-bold transition-transform hover:-translate-y-0.5"
            style={{ backgroundColor: PAY_THEME.accent, color: PAY_THEME.emphasis }}
          >
            Download QuickSite
          </a>
        </motion.section>

        <footer className="border-t border-[#f2ba78] py-6 text-center text-sm text-[#8f4f14]">
          QuickSite • Made for Cameroon businesses
        </footer>
      </div>
    </main>
  );
}
