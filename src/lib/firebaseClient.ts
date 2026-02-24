import { getAuth } from "firebase/auth";
import { getFunctions } from "firebase/functions";

import { app } from "@/src/lib/firebase";

const functionsRegion =
  process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_REGION ?? "us-central1";

export const auth = getAuth(app);
export const functions = getFunctions(app, functionsRegion);
