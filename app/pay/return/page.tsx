"use client";

import { Plus_Jakarta_Sans } from "next/font/google";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { signInWithCustomToken } from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import { auth, functions } from "@/src/lib/firebaseClient";
import { PAY_THEME } from "@/src/lib/constants";
import { motion } from "framer-motion";

type AuthState = "loading" | "ready" | "needs_app" | "error";

type VerifyCheckoutResult = {
  paid?: boolean;
  status?: string;
  plan?: string;
  expiresAt?: unknown;
};

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const RETURN_TO_APP_RETRY_MESSAGE =
  "Return to app and retry payment verification";

function parseDateValue(raw: unknown): Date | null {
  if (!raw) {
    return null;
  }

  if (raw instanceof Date) {
    return raw;
  }

  if (typeof raw === "string") {
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  if (typeof raw === "number") {
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  if (typeof raw === "object") {
    const maybeMap = raw as { toDate?: () => Date; _seconds?: unknown; seconds?: unknown };
    if (typeof maybeMap.toDate === "function") {
      const parsed = maybeMap.toDate();
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    const seconds =
      typeof maybeMap._seconds === "number"
        ? maybeMap._seconds
        : typeof maybeMap.seconds === "number"
          ? maybeMap.seconds
          : null;
    if (seconds !== null) {
      const parsed = new Date(seconds * 1000);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
  }

  return null;
}

function formatPlanLabel(plan: string | null): string {
  const normalized = String(plan ?? "").trim().toLowerCase();
  if (normalized === "business") {
    return "Business";
  }
  if (normalized === "pro") {
    return "Pro";
  }
  return "-";
}

function formatExpiry(raw: Date | null): string {
  if (!raw) {
    return "-";
  }
  return raw.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function PayReturnPage() {
  return (
    <Suspense fallback={<PayReturnShell status="Loading payment verification..." />}>
      <PayReturnContent />
    </Suspense>
  );
}

function PayReturnContent() {
  const params = useSearchParams();
  const ref = params.get("ref")?.trim() ?? "";
  const rs = params.get("rs")?.trim() ?? "";

  const [status, setStatus] = useState("Preparing verification...");
  const [paid, setPaid] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [authState, setAuthState] = useState<AuthState>("loading");
  const [activatedPlan, setActivatedPlan] = useState<string | null>(null);
  const [activatedExpiresAt, setActivatedExpiresAt] = useState<Date | null>(null);

  const authAttemptedRef = useRef(false);
  const autoVerifyAttemptedRef = useRef(false);

  const verifyCheckout = useMemo(
    () => httpsCallable(functions, "verifyCheckout"),
    []
  );
  const exchangePayReturnSessionForCustomToken = useMemo(
    () => httpsCallable(functions, "exchangePayReturnSessionForCustomToken"),
    []
  );

  const getFriendlyAuthError = (error: unknown) => {
    const code = String((error as { code?: unknown } | null)?.code ?? "").toLowerCase();
    const message = String(
      (error as { message?: unknown } | null)?.message ?? ""
    ).toLowerCase();

    if (code.includes("failed-precondition") || message.includes("expired")) {
      return "Verification session expired. Return to app and retry payment verification";
    }

    if (
      code.includes("invalid-argument") ||
      code.includes("unauthenticated") ||
      code.includes("not-found") ||
      message.includes("invalid")
    ) {
      return RETURN_TO_APP_RETRY_MESSAGE;
    }

    return "Could not start payment verification. Return to app and retry payment verification";
  };

  const getFriendlyVerifyError = (error: unknown) => {
    const code = String((error as { code?: unknown } | null)?.code ?? "").toLowerCase();
    const message = String(
      (error as { message?: unknown } | null)?.message ?? ""
    ).toLowerCase();

    if (code.includes("unauthenticated") || code.includes("permission-denied")) {
      return RETURN_TO_APP_RETRY_MESSAGE;
    }

    if (code.includes("not-found") || message.includes("not found")) {
      return "Payment reference not found. Return to app and retry payment verification";
    }

    return "Could not verify payment right now. Please try again.";
  };

  useEffect(() => {
    let isCancelled = false;

    if (authAttemptedRef.current) {
      return;
    }
    authAttemptedRef.current = true;

    const bootstrapAuth = async () => {
      setAuthState("loading");

      if (!rs) {
        if (!isCancelled) {
          setAuthState("needs_app");
          setStatus(RETURN_TO_APP_RETRY_MESSAGE);
        }
        return;
      }

      try {
        setStatus("Signing you in for payment verification...");
        const res = await exchangePayReturnSessionForCustomToken({ rs });
        const customToken = (res.data as { customToken?: string } | null)
          ?.customToken;

        if (!customToken) {
          throw new Error("Missing custom token from return-session exchange.");
        }

        await signInWithCustomToken(auth, customToken);
        if (!isCancelled) {
          setAuthState("ready");
          setStatus("Signed in. Verifying payment...");
        }
      } catch (error: unknown) {
        console.error("[pay/return] auth bootstrap failed", error);
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
  }, [exchangePayReturnSessionForCustomToken, rs]);

  const runVerify = useCallback(async () => {
    if (!ref) {
      setStatus("Missing payment reference. Return to app and retry payment verification");
      setPaid(false);
      return;
    }

    setLoading(true);
    setStatus("Verifying payment...");

    try {
      if (!auth.currentUser) {
        setStatus(RETURN_TO_APP_RETRY_MESSAGE);
        setPaid(false);
        return;
      }

      const res = await verifyCheckout({ external_reference: ref });
      const data = (res.data as VerifyCheckoutResult | null) ?? {};

      const isPaid = data.paid === true;
      const txStatus = String(data.status ?? "UNKNOWN").toUpperCase();
      const plan = String(data.plan ?? "").trim().toLowerCase();
      const expiresAt = parseDateValue(data.expiresAt);

      setPaid(isPaid);
      setActivatedPlan(plan || null);
      setActivatedExpiresAt(expiresAt);

      if (isPaid) {
        const planLabel = formatPlanLabel(plan);
        const expiryLabel = formatExpiry(expiresAt);
        setStatus(`Payment successful ✅ ${planLabel} plan active until ${expiryLabel}.`);
      } else if (txStatus === "PENDING") {
        setStatus("Payment pending ⏳ Please wait a moment, then check again.");
      } else {
        setStatus(`Payment not completed ❌ Status: ${txStatus}`);
      }
    } catch (error: unknown) {
      console.error("[pay/return] verifyCheckout failed", error);
      setPaid(false);
      setStatus(getFriendlyVerifyError(error));
    } finally {
      setLoading(false);
    }
  }, [ref, verifyCheckout]);

  useEffect(() => {
    if (authState !== "ready") {
      return;
    }

    if (autoVerifyAttemptedRef.current) {
      return;
    }
    autoVerifyAttemptedRef.current = true;

    void runVerify();
  }, [authState, runVerify]);

  const pill =
    paid === true
      ? "bg-emerald-100 text-emerald-800 border-emerald-300"
      : paid === false
        ? "bg-rose-100 text-rose-800 border-rose-300"
        : "bg-[#FFEADA] text-[#562F00] border-[#F4B777]";

  return (
    <div
      className={`${plusJakarta.className} min-h-screen`}
      style={{ backgroundColor: PAY_THEME.background, color: PAY_THEME.emphasis }}
    >
      <div className="mx-auto max-w-xl px-4 py-10 sm:px-6 sm:py-16">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border p-6 shadow-sm"
          style={{ backgroundColor: PAY_THEME.surface, borderColor: "#f2ba78" }}
        >
          <div className="text-sm font-semibold" style={{ color: "#7a4a12" }}>
            QuickSite
          </div>
          <h1 className="mt-1 text-2xl font-extrabold">Payment verification</h1>

          <div
            className="mt-3 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold"
            style={{
              backgroundColor: "#FFE5BF",
              borderColor: "#F4B777",
            }}
          >
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Secure payment via CamPay
          </div>

          <p className="mt-4 text-sm" style={{ color: "#7a4a12" }}>
            Reference: <span className="font-mono">{ref || "(missing)"}</span>
          </p>

          {paid === true ? (
            <div className="mt-4 rounded-xl border border-emerald-300 bg-emerald-100 p-4 text-sm font-semibold text-emerald-900">
              <div>Activated plan: {formatPlanLabel(activatedPlan)}</div>
              <div>Expires on: {formatExpiry(activatedExpiresAt)}</div>
            </div>
          ) : null}

          <div className={`mt-6 rounded-xl border p-4 font-medium ${pill}`}>
            <div className="text-sm font-medium">{status}</div>
          </div>

          {(authState === "needs_app" || authState === "error") && (
            <p className="mt-4 text-sm font-medium">
              {RETURN_TO_APP_RETRY_MESSAGE}
            </p>
          )}

          <button
            onClick={() => {
              void runVerify();
            }}
            disabled={loading || authState !== "ready"}
            className="mt-5 w-full rounded-xl px-5 py-3 font-extrabold transition-transform duration-200 hover:-translate-y-0.5 disabled:opacity-60"
            style={{
              backgroundColor: PAY_THEME.accent,
              color: PAY_THEME.emphasis,
            }}
          >
            {loading ? "Checking..." : "Check payment again"}
          </button>
        </motion.div>
      </div>
    </div>
  );
}

function PayReturnShell({ status }: { status: string }) {
  return (
    <div
      className={`${plusJakarta.className} min-h-screen`}
      style={{ backgroundColor: PAY_THEME.background, color: PAY_THEME.emphasis }}
    >
      <div className="mx-auto max-w-xl px-4 py-10 sm:px-6 sm:py-16">
        <div
          className="rounded-2xl border p-6 shadow-sm"
          style={{ backgroundColor: PAY_THEME.surface, borderColor: "#f2ba78" }}
        >
          <h1 className="text-2xl font-extrabold">Payment verification</h1>
          <p className="mt-2 text-sm" style={{ color: "#7a4a12" }}>
            {status}
          </p>
        </div>
      </div>
    </div>
  );
}
