export type PlanId = "free" | "pro" | "business";

export type PaidPlanId = Exclude<PlanId, "free">;

export type PlanLimits = {
  images: number;
  videos: number;
  maxImageMB: number;
  maxVideoMB: number;
};

export type PlanDefinition = {
  label: string;
  tagline: string;
  cta: string;
  badge: string;
  limits: PlanLimits;
  features: string[];
};

export type PlanConfigPublic = {
  currency: string;
  demoMode: boolean;
  plans: Record<PlanId, PlanDefinition>;
  featureGates: Record<string, PlanId>;
  displayOrder: PlanId[];
  version?: number;
};

export type BillingPlanPricing = {
  amount: number;
  chargeAmount: number;
  durationDays: number;
};

export type BillingData = {
  currency: string;
  demoMode: boolean;
  plans: Record<PaidPlanId, BillingPlanPricing>;
  version?: number;
};

const PLAN_IDS: readonly PlanId[] = ["free", "pro", "business"];
const PAID_PLAN_IDS: readonly PaidPlanId[] = ["pro", "business"];

export const DEFAULT_PLAN_CONFIG: PlanConfigPublic = {
  currency: "XAF",
  demoMode: false,
  plans: {
    free: {
      label: "Free",
      tagline: "Perfect for getting your first page online.",
      cta: "Start Free",
      badge: "",
      limits: {
        images: 1,
        videos: 0,
        maxImageMB: 1,
        maxVideoMB: 0,
      },
      features: ["1 avatar image", "Basic template", "QuickSite branding"],
    },
    pro: {
      label: "Pro",
      tagline: "Best for creators and small teams ready to convert.",
      cta: "Choose Pro",
      badge: "Most Popular",
      limits: {
        images: 20,
        videos: 0,
        maxImageMB: 2,
        maxVideoMB: 0,
      },
      features: [
        "Premium templates",
        "Contact form + inbox",
        "Push notifications",
      ],
    },
    business: {
      label: "Business",
      tagline: "Built for busy businesses with rich media needs.",
      cta: "Choose Business",
      badge: "",
      limits: {
        images: 40,
        videos: 3,
        maxImageMB: 2,
        maxVideoMB: 25,
      },
      features: [
        "Everything in Pro",
        "Business videos",
        "Advanced branding controls",
      ],
    },
  },
  featureGates: {
    contactForm: "pro",
    gallery: "pro",
    videos: "business",
    premiumTemplates: "pro",
    removeBranding: "business",
  },
  displayOrder: ["free", "pro", "business"],
  version: 1,
};

export const DEFAULT_BILLING: BillingData = {
  currency: "XAF",
  demoMode: false,
  plans: {
    pro: {
      amount: 4900,
      chargeAmount: 4900,
      durationDays: 30,
    },
    business: {
      amount: 7900,
      chargeAmount: 7900,
      durationDays: 30,
    },
  },
  version: 1,
};

function warn(path: string, message: string): void {
  console.warn(`[plan-config] ${message} (${path})`);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function parseString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseIntLike(value: unknown): number | null {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    return Math.round(value);
  }
  if (typeof value === "string") {
    const cleaned = value.replace(/[^0-9]/g, "");
    if (!cleaned) return null;
    const parsed = Number(cleaned);
    if (!Number.isFinite(parsed)) return null;
    return Math.round(parsed);
  }
  return null;
}

function parseOptionalVersion(value: unknown): number | undefined {
  const parsed = parseIntLike(value);
  return parsed !== null ? parsed : undefined;
}

function toPlanId(value: unknown): PlanId | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === "free" || normalized === "pro" || normalized === "business") {
    return normalized;
  }
  return null;
}

function validateExactPlanKeys(
  data: Record<string, unknown>,
  required: readonly string[],
  path: string
): boolean {
  const keys = Object.keys(data);
  const missing = required.filter((key) => !keys.includes(key));
  const extras = keys.filter((key) => !required.includes(key));

  if (missing.length > 0 || extras.length > 0) {
    warn(path, `Invalid plan keys. Missing: [${missing.join(", ")}], Extra: [${extras.join(", ")}]`);
    return false;
  }
  return true;
}

function cloneDefaultPlanConfig(): PlanConfigPublic {
  return {
    ...DEFAULT_PLAN_CONFIG,
    plans: {
      free: {
        ...DEFAULT_PLAN_CONFIG.plans.free,
        limits: {...DEFAULT_PLAN_CONFIG.plans.free.limits},
        features: [...DEFAULT_PLAN_CONFIG.plans.free.features],
      },
      pro: {
        ...DEFAULT_PLAN_CONFIG.plans.pro,
        limits: {...DEFAULT_PLAN_CONFIG.plans.pro.limits},
        features: [...DEFAULT_PLAN_CONFIG.plans.pro.features],
      },
      business: {
        ...DEFAULT_PLAN_CONFIG.plans.business,
        limits: {...DEFAULT_PLAN_CONFIG.plans.business.limits},
        features: [...DEFAULT_PLAN_CONFIG.plans.business.features],
      },
    },
    featureGates: {...DEFAULT_PLAN_CONFIG.featureGates},
    displayOrder: [...DEFAULT_PLAN_CONFIG.displayOrder],
  };
}

function cloneDefaultBilling(): BillingData {
  return {
    ...DEFAULT_BILLING,
    plans: {
      pro: {...DEFAULT_BILLING.plans.pro},
      business: {...DEFAULT_BILLING.plans.business},
    },
  };
}

function parsePlanFeatures(
  value: unknown,
  fallback: string[],
  path: string
): string[] {
  if (!Array.isArray(value)) {
    warn(path, "Missing or invalid list. Using fallback.");
    return [...fallback];
  }

  const parsed = value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0);

  if (parsed.length === 0) {
    warn(path, "Empty list. Using fallback.");
    return [...fallback];
  }

  return parsed;
}

function parsePlanLimits(
  value: unknown,
  fallback: PlanLimits,
  path: string
): PlanLimits {
  const data = asRecord(value);
  if (!data) {
    warn(path, "Missing or invalid object. Using fallback.");
    return {...fallback};
  }

  const images = parseIntLike(data.images);
  const videos = parseIntLike(data.videos);
  const maxImageMB = parseIntLike(data.maxImageMB);
  const maxVideoMB = parseIntLike(data.maxVideoMB);

  return {
    images: images !== null && images >= 0 ? images : fallback.images,
    videos: videos !== null && videos >= 0 ? videos : fallback.videos,
    maxImageMB:
      maxImageMB !== null && maxImageMB >= 0 ? maxImageMB : fallback.maxImageMB,
    maxVideoMB:
      maxVideoMB !== null && maxVideoMB >= 0 ? maxVideoMB : fallback.maxVideoMB,
  };
}

export function parsePlansPublicDoc(raw: unknown): PlanConfigPublic {
  const fallback = cloneDefaultPlanConfig();
  const data = asRecord(raw);
  if (!data) {
    warn("config/plansPublic", "Invalid document. Using default config.");
    return fallback;
  }

  const plansRaw = asRecord(data.plans);
  if (!plansRaw || !validateExactPlanKeys(plansRaw, PLAN_IDS, "config/plansPublic.plans")) {
    warn("config/plansPublic.plans", "Plan map missing required keys. Using default config.");
    return fallback;
  }

  const parsedPlans = {} as Record<PlanId, PlanDefinition>;
  for (const planId of PLAN_IDS) {
    const planFallback = fallback.plans[planId];
    const rawPlan = asRecord(plansRaw[planId]);
    if (!rawPlan) {
      warn(`config/plansPublic.plans.${planId}`, "Missing plan object. Using fallback.");
      parsedPlans[planId] = {
        ...planFallback,
        limits: {...planFallback.limits},
        features: [...planFallback.features],
      };
      continue;
    }

    parsedPlans[planId] = {
      label: parseString(rawPlan.label) ?? planFallback.label,
      tagline: parseString(rawPlan.tagline) ?? planFallback.tagline,
      cta: parseString(rawPlan.cta) ?? planFallback.cta,
      badge: parseString(rawPlan.badge) ?? planFallback.badge,
      limits: parsePlanLimits(
        rawPlan.limits,
        planFallback.limits,
        `config/plansPublic.plans.${planId}.limits`
      ),
      features: parsePlanFeatures(
        rawPlan.features,
        planFallback.features,
        `config/plansPublic.plans.${planId}.features`
      ),
    };
  }

  const displayOrderRaw = Array.isArray(data.displayOrder) ? data.displayOrder : null;
  const parsedDisplayOrder = displayOrderRaw
    ? displayOrderRaw
        .map((item) => toPlanId(item))
        .filter((item): item is PlanId => item !== null)
    : [];

  const displayOrder =
    parsedDisplayOrder.length > 0 ? parsedDisplayOrder : [...fallback.displayOrder];
  if (parsedDisplayOrder.length === 0 && displayOrderRaw !== null) {
    warn("config/plansPublic.displayOrder", "Invalid displayOrder. Using fallback.");
  }

  const featureGates = {...fallback.featureGates};
  const rawGates = asRecord(data.featureGates);
  if (!rawGates) {
    warn("config/plansPublic.featureGates", "Missing featureGates object. Using fallback.");
  } else {
    for (const [key, value] of Object.entries(rawGates)) {
      const gatePlan = toPlanId(value);
      if (!gatePlan) {
        warn(`config/plansPublic.featureGates.${key}`, "Invalid plan id. Using fallback.");
        continue;
      }
      featureGates[key] = gatePlan;
    }
  }

  return {
    currency: (parseString(data.currency) ?? fallback.currency).toUpperCase(),
    demoMode:
      typeof data.demoMode === "boolean" ? data.demoMode : fallback.demoMode,
    plans: parsedPlans,
    featureGates,
    displayOrder,
    version: parseOptionalVersion(data.version) ?? fallback.version,
  };
}

function parseAmount(value: unknown, fallback: number, path: string): number {
  const parsed = parseIntLike(value);
  if (parsed === null || parsed <= 0) {
    warn(path, "Invalid amount. Using fallback.");
    return fallback;
  }
  return parsed;
}

function parseChargeAmount(value: unknown, fallback: number): number {
  const parsed = parseIntLike(value);
  if (parsed === null || parsed < 0) {
    return fallback;
  }
  return parsed;
}

function parseDurationDays(value: unknown, fallback: number, path: string): number {
  const parsed = parseIntLike(value);
  if (parsed === null || parsed <= 0) {
    warn(path, "Invalid durationDays. Using fallback.");
    return fallback;
  }
  return parsed;
}

export function parseBillingDoc(raw: unknown): BillingData {
  const fallback = cloneDefaultBilling();
  const data = asRecord(raw);
  if (!data) {
    warn("config/billing", "Invalid document. Using default billing.");
    return fallback;
  }

  const plansRaw = asRecord(data.plans);
  if (!plansRaw || !validateExactPlanKeys(plansRaw, PAID_PLAN_IDS, "config/billing.plans")) {
    warn("config/billing.plans", "Plan map missing required keys. Using default billing.");
    return fallback;
  }

  const parsedPlans = {} as Record<PaidPlanId, BillingPlanPricing>;
  for (const planId of PAID_PLAN_IDS) {
    const planFallback = fallback.plans[planId];
    const rawPlan = asRecord(plansRaw[planId]);
    if (!rawPlan) {
      warn(`config/billing.plans.${planId}`, "Missing plan object. Using fallback.");
      parsedPlans[planId] = {...planFallback};
      continue;
    }

    const amount = parseAmount(
      rawPlan.amount,
      planFallback.amount,
      `config/billing.plans.${planId}.amount`
    );
    const chargeAmount = parseChargeAmount(rawPlan.chargeAmount, amount);
    const durationDays = parseDurationDays(
      rawPlan.durationDays,
      planFallback.durationDays,
      `config/billing.plans.${planId}.durationDays`
    );

    parsedPlans[planId] = {
      amount,
      chargeAmount,
      durationDays,
    };
  }

  return {
    currency: (parseString(data.currency) ?? fallback.currency).toUpperCase(),
    demoMode:
      typeof data.demoMode === "boolean" ? data.demoMode : fallback.demoMode,
    plans: parsedPlans,
    version: parseOptionalVersion(data.version) ?? fallback.version,
  };
}
