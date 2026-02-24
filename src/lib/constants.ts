export const BASE_WEB_URL = "https://quicksite-cm.web.app";
export const PLAY_STORE_URL = (process.env.NEXT_PUBLIC_PLAY_STORE_URL ?? "").trim();

export const PAY_THEME = {
  background: "#FFFDF1",
  surface: "#FFCE99",
  accent: "#FF9644",
  emphasis: "#562F00",
} as const;
