"use client";

import { Plus_Jakarta_Sans } from "next/font/google";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { signInWithCustomToken } from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import { auth, functions } from "@/src/lib/firebaseClient";
import { db } from "@/src/lib/firebase";
import { BASE_WEB_URL, PAY_THEME } from "@/src/lib/constants";
import {
  type BillingData,
  type PaidPlanId,
  type PlanConfigPublic,
  DEFAULT_BILLING,
  DEFAULT_PLAN_CONFIG,
  parseBillingDoc,
  parsePlansPublicDoc,
} from "@/src/lib/plan-config";
import { motion } from "framer-motion";

type AuthState = "loading" | "ready" | "needs_app" | "error";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const OPEN_FROM_APP_MESSAGE = "Open this page from QuickSite app";
const INVALID_SESSION_MESSAGE = "Invalid session. Return to app and try again.";
const EXPIRED_SESSION_MESSAGE = "Session expired. Return to app and try again.";
const EXCHANGE_PAY_SESSION_FUNCTION = "exchangePaySessionForCustomToken";

function formatMoney(currency: string, amount: number): string {
  return `${currency} ${new Intl.NumberFormat("en-US").format(amount)}`;
}

function buildLimitsText(plan: PlanConfigPublic["plans"][PaidPlanId]): string {
  const limits = plan.limits;
  const imagePart = `Up to ${limits.images} images`;
  const videoPart = limits.videos > 0 ? `, ${limits.videos} videos` : "";
  const imageMbPart = limits.maxImageMB > 0 ? `, ${limits.maxImageMB}MB/image` : "";
  const videoMbPart = limits.maxVideoMB > 0 ? `, ${limits.maxVideoMB}MB/video` : "";
  return `${imagePart}${videoPart}${imageMbPart}${videoMbPart}`;
}

export default function PayPage() {
  return (
    <Suspense fallback={<PayShell status="Loading payment portal..." />}>
      <PayContent />
    </Suspense>
  );
}

function PayContent() {
  const params = useSearchParams();
  const sessionId = params.get("s")?.trim() ?? "";
  const exchangeAttemptedRef = useRef(false);

  const [plan, setPlan] = useState<PaidPlanId>("pro");
  const [status, setStatus] = useState("Preparing secure checkout...");
  const [loading, setLoading] = useState(false);
  const [authState, setAuthState] = useState<AuthState>("loading");
  const [billing, setBilling] = useState<BillingData>(DEFAULT_BILLING);
  const [plansPublic, setPlansPublic] = useState<PlanConfigPublic>(
    DEFAULT_PLAN_CONFIG
  );
  const [configLoading, setConfigLoading] = useState(true);
  const [configLoaded, setConfigLoaded] = useState(false);

  const createCheckout = useMemo(
    () => httpsCallable(functions, "createCheckout"),
    []
  );
  const exchangePaySessionForCustomToken = useMemo(
    () => httpsCallable(functions, EXCHANGE_PAY_SESSION_FUNCTION),
    []
  );

  const paidDisplayOrder = useMemo(() => {
    const fromConfig = plansPublic.displayOrder.filter(
      (item): item is PaidPlanId => item === "pro" || item === "business"
    );

    if (fromConfig.length > 0) {
      return fromConfig;
    }

    return ["pro", "business"] as PaidPlanId[];
  }, [plansPublic.displayOrder]);

  useEffect(() => {
    if (paidDisplayOrder.includes(plan)) {
      return;
    }
    setPlan(paidDisplayOrder[0]);
  }, [paidDisplayOrder, plan]);

  const selectedPricing = billing.plans[plan];
  const selectedPlanPublic = plansPublic.plans[plan];
  const isDemoMode = billing.demoMode || plansPublic.demoMode;

  const getFriendlyAuthError = (error: unknown) => {
    const rawCode = String((error as { code?: unknown } | null)?.code ?? "");
    const rawMessage = String(
      (error as { message?: unknown } | null)?.message ?? ""
    );

    const code = rawCode.toLowerCase();
    const message = rawMessage.toLowerCase();

    if (
      code.includes("failed-precondition") ||
      message.includes("session-expired") ||
      message.includes("expired")
    ) {
      return EXPIRED_SESSION_MESSAGE;
    }

    if (
      code.includes("invalid-argument") ||
      code.includes("unauthenticated") ||
      code.includes("not-found") ||
      message.includes("session-invalid") ||
      message.includes("invalid")
    ) {
      return INVALID_SESSION_MESSAGE;
    }

    return "Could not start secure session. Return to app and try again.";
  };

  useEffect(() => {
    let isCancelled = false;

    if (exchangeAttemptedRef.current) {
      return;
    }

    if (!sessionId) {
      setAuthState("needs_app");
      setStatus(OPEN_FROM_APP_MESSAGE);
      return;
    }

    exchangeAttemptedRef.current = true;

    const bootstrapAuth = async () => {
      setAuthState("loading");

      try {
        setStatus("Signing you in from QuickSite app...");
        const res = await exchangePaySessionForCustomToken({ sessionId });
        const customToken = (res.data as { customToken?: string } | null)
          ?.customToken;

        if (!customToken) {
          throw new Error("Missing custom token.");
        }

        await signInWithCustomToken(auth, customToken);
        if (!isCancelled) {
          setAuthState("ready");
          setStatus("Signed in. Choose a plan to continue.");
        }
      } catch (error: unknown) {
        if (!isCancelled) {
          setAuthState("error");
          setStatus(getFriendlyAuthError(error));
        }
      }
    };

    void bootstrapAuth();
    return () => {
      isCancelled = true;
    };
  }, [exchangePaySessionForCustomToken, sessionId]);

  useEffect(() => {
    let isCancelled = false;

    if (authState !== "ready") {
      return;
    }

    const loadConfig = async () => {
      setConfigLoading(true);

      try {
        const [billingSnap, plansPublicSnap] = await Promise.all([
          getDoc(doc(db, "config", "billing")),
          getDoc(doc(db, "config", "plansPublic")),
        ]);

        const parsedBilling = billingSnap.exists()
          ? parseBillingDoc(billingSnap.data())
          : DEFAULT_BILLING;
        const parsedPlansPublic = plansPublicSnap.exists()
          ? parsePlansPublicDoc(plansPublicSnap.data())
          : DEFAULT_PLAN_CONFIG;

        if (!billingSnap.exists()) {
          console.warn("[pay] config/billing missing. Using fallback defaults.");
        }
        if (!plansPublicSnap.exists()) {
          console.warn("[pay] config/plansPublic missing. Using fallback defaults.");
        }

        if (!isCancelled) {
          setBilling(parsedBilling);
          setPlansPublic(parsedPlansPublic);
          setConfigLoaded(true);
        }
      } catch (error: unknown) {
        console.warn("[pay] config load failed. Using fallback defaults.", error);
        if (!isCancelled) {
          setBilling(DEFAULT_BILLING);
          setPlansPublic(DEFAULT_PLAN_CONFIG);
          setConfigLoaded(false);
        }
      } finally {
        if (!isCancelled) {
          setConfigLoading(false);
        }
      }
    };

    void loadConfig();
    return () => {
      isCancelled = true;
    };
  }, [authState]);

  const getCheckoutErrorText = (error: unknown): string => {
    const err = error as
      | { message?: unknown; code?: unknown; details?: unknown }
      | null;
    const detailText =
      typeof err?.details === "string" ? err.details : String(err?.details ?? "");
    const messageText =
      typeof err?.message === "string" ? err.message : String(err?.message ?? "");
    const codeText =
      typeof err?.code === "string" ? err.code : String(err?.code ?? "");

    return [detailText, messageText, codeText].find((v) => v.trim().length > 0) ?? "";
  };

  const ensureUserDocExists = async (): Promise<boolean> => {
    const uid = auth.currentUser?.uid;

    if (!uid) {
      setStatus("Authentication missing. Please reopen from the QuickSite app.");
      return false;
    }

    const userSnap = await getDoc(doc(db, "users", uid));
    if (!userSnap.exists()) {
      setStatus("Username not set. Please complete onboarding in the app.");
      return false;
    }

    return true;
  };

  const onPay = async () => {
    if (authState !== "ready") {
      setStatus(OPEN_FROM_APP_MESSAGE);
      return;
    }

    setLoading(true);
    setStatus(
      `Creating ${selectedPlanPublic.label} checkout (${formatMoney(
        billing.currency,
        selectedPricing.chargeAmount
      )})...`
    );

    try {
      const hasUserDoc = await ensureUserDocExists();
      if (!hasUserDoc) {
        return;
      }

      const res = await createCheckout({
        plan,
        returnUrl: `${BASE_WEB_URL}/pay/return`,
        cancelUrl: `${BASE_WEB_URL}/pay`,
      });
      const data = res.data as {
        paymentUrl?: string;
        external_reference?: string;
        amount?: number;
        currency?: string;
        durationDays?: number;
      } | null;

      const paymentUrl = data?.paymentUrl ?? "";
      const ref = data?.external_reference ?? "";

      if (typeof data?.amount === "number" || typeof data?.durationDays === "number") {
        setBilling((prev) => {
          const nextAmount =
            typeof data?.amount === "number"
              ? data.amount
              : prev.plans[plan].chargeAmount;
          const nextDuration =
            typeof data?.durationDays === "number"
              ? data.durationDays
              : prev.plans[plan].durationDays;

          return {
            ...prev,
            currency:
              typeof data?.currency === "string" && data.currency.trim()
                ? data.currency.trim().toUpperCase()
                : prev.currency,
            plans: {
              ...prev.plans,
              [plan]: {
                ...prev.plans[plan],
                amount: nextAmount,
                chargeAmount: nextAmount,
                durationDays: nextDuration,
              },
            },
          };
        });
      }

      if (!paymentUrl) {
        setStatus(ref ? `Checkout created. Ref: ${ref}` : "Checkout created.");
        return;
      }

      setStatus("Redirecting to payment...");
      window.location.assign(paymentUrl);
    } catch (error: unknown) {
      const text = getCheckoutErrorText(error);

      if (/config\/billing|invalid price for plan|invalid durationdays/i.test(text)) {
        setStatus(text);
      } else if (/username|users\/\{uid\}|onboarding|not found/i.test(text)) {
        setStatus("Username not set. Please complete onboarding in the app.");
      } else {
        setStatus("Could not create checkout right now. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`${plusJakarta.className} min-h-screen`}
      style={{ backgroundColor: PAY_THEME.background, color: PAY_THEME.emphasis }}
    >
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start justify-between gap-4"
        >
          <div>
            <div className="text-sm font-semibold" style={{ color: "#7a4a12" }}>
              QuickSite
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              Upgrade your website
            </h1>
            <p className="mt-2 text-sm sm:text-base" style={{ color: "#7a4a12" }}>
              Pay securely with MTN MoMo / Orange Money via CamPay.
            </p>
          </div>

          <div
            className="hidden sm:flex items-center gap-2 rounded-2xl border px-4 py-2 shadow-sm"
            style={{
              backgroundColor: "#FFE5BF",
              borderColor: "#F4B777",
            }}
          >
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            <span className="text-sm font-semibold">Secure payment via CamPay</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mt-6 rounded-2xl border p-5 shadow-sm"
          style={{
            backgroundColor: PAY_THEME.surface,
            borderColor: "#f2ba78",
          }}
        >
          <p className="text-sm font-semibold">
            {authState === "ready" ? "Authenticated session" : "App session required"}
          </p>
          <p className="mt-1 text-sm" style={{ color: "#7a4a12" }}>
            {authState === "needs_app" ? OPEN_FROM_APP_MESSAGE : status}
          </p>
        </motion.div>

        {authState === "ready" ? (
          <>
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
              className="mt-10 grid gap-4 md:grid-cols-2"
            >
              {configLoading
                ? paidDisplayOrder.map((planId) => (
                    <div
                      key={`skeleton-${planId}`}
                      className="rounded-2xl border p-6 shadow-sm animate-pulse"
                      style={{
                        borderColor: "#F2BA78",
                        backgroundColor: PAY_THEME.surface,
                      }}
                    >
                      <div className="h-6 w-24 rounded bg-[#FFEADA]" />
                      <div className="mt-3 h-4 w-4/5 rounded bg-[#FFEADA]" />
                      <div className="mt-2 h-4 w-3/5 rounded bg-[#FFEADA]" />
                      <div className="mt-4 h-3 w-4/5 rounded bg-[#FFEADA]" />
                      <div className="mt-2 h-3 w-3/4 rounded bg-[#FFEADA]" />
                      <div className="mt-2 h-3 w-2/3 rounded bg-[#FFEADA]" />
                    </div>
                  ))
                : paidDisplayOrder.map((planId) => {
                    const planDef = plansPublic.plans[planId];
                    const selected = plan === planId;
                    const features =
                      planDef.features.length > 0
                        ? planDef.features
                        : DEFAULT_PLAN_CONFIG.plans[planId].features;

                    return (
                      <button
                        key={planId}
                        onClick={() => setPlan(planId)}
                        className="text-left rounded-2xl border p-6 shadow-sm transition-all duration-200 text-[#562F00]"
                        style={{
                          borderColor: selected ? PAY_THEME.accent : "#F2BA78",
                          backgroundColor: selected ? "#FFD7A9" : PAY_THEME.surface,
                        }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-lg font-semibold">{planDef.label}</div>
                          {planDef.badge ? (
                            <span
                              className="text-xs font-semibold px-2 py-1 rounded-full"
                              style={{
                                backgroundColor: selected ? PAY_THEME.accent : "#FFEADA",
                                color: PAY_THEME.emphasis,
                              }}
                            >
                              {planDef.badge}
                            </span>
                          ) : null}
                        </div>

                        <p className="mt-2 text-sm" style={{ color: "#7a4a12" }}>
                          {planDef.tagline}
                        </p>

                        <ul className="mt-4 text-sm space-y-2">
                          {features.slice(0, 4).map((feature, idx) => (
                            <li key={`${planId}-feature-${idx}`}>• {feature}</li>
                          ))}
                          <li>• {buildLimitsText(planDef)}</li>
                        </ul>
                      </button>
                    );
                  })}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.16 }}
              className="mt-6 rounded-2xl border p-6 shadow-sm"
              style={{
                backgroundColor: PAY_THEME.surface,
                borderColor: "#f2ba78",
              }}
            >
              <div className="rounded-xl border border-[#F4B777] bg-[#FFEADA] p-3 text-sm font-semibold text-[#562F00]">
                <div>Selected plan: {selectedPlanPublic.label}</div>
                <div>Charge: {formatMoney(billing.currency, selectedPricing.chargeAmount)}</div>
                <div>Duration: {selectedPricing.durationDays} Days</div>
                {configLoaded && selectedPricing.amount !== selectedPricing.chargeAmount ? (
                  <div className="mt-1 text-xs font-medium">
                    Base price: {formatMoney(billing.currency, selectedPricing.amount)}
                  </div>
                ) : null}
                {isDemoMode ? (
                  <div className="mt-1 text-xs font-medium">
                    Demo mode is ON. Final charge may be clamped for sandbox limits.
                  </div>
                ) : null}
              </div>

              <button
                onClick={onPay}
                disabled={loading || authState !== "ready"}
                className="mt-4 w-full rounded-xl px-5 py-3 font-extrabold transition-transform duration-200 hover:-translate-y-0.5 disabled:opacity-60"
                style={{
                  backgroundColor: PAY_THEME.accent,
                  color: PAY_THEME.emphasis,
                }}
              >
                {loading ? "Please wait..." : `Continue with ${selectedPlanPublic.label}`}
              </button>

              <p className="mt-4 text-sm font-medium">
                Status: <span>{status}</span>
              </p>

              <div
                className="mt-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold"
                style={{
                  backgroundColor: "#FFE5BF",
                  borderColor: "#F4B777",
                }}
              >
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Secure payment via CamPay
              </div>

              <p className="mt-6 text-xs" style={{ color: "#7a4a12" }}>
                You’ll be redirected back after payment to confirm your subscription.
              </p>
            </motion.div>
          </>
        ) : null}
      </div>
    </div>
  );
}

function PayShell({ status }: { status: string }) {
  return (
    <div
      className={`${plusJakarta.className} min-h-screen`}
      style={{ backgroundColor: PAY_THEME.background, color: PAY_THEME.emphasis }}
    >
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <div
          className="rounded-2xl border p-6 shadow-sm"
          style={{ backgroundColor: PAY_THEME.surface, borderColor: "#f2ba78" }}
        >
          <h1 className="text-2xl font-extrabold">QuickSite payment portal</h1>
          <p className="mt-2 text-sm" style={{ color: "#7a4a12" }}>
            {status}
          </p>
        </div>
      </div>
    </div>
  );
}
