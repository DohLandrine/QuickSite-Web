import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";

const keyPath = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_PATH;
const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

function resolveCredential() {
  // Prefer explicit JSON if provided (CI/Secrets Manager)
  if (serviceAccountJson) {
    return cert(JSON.parse(serviceAccountJson));
  }

  // Only use file path in LOCAL development
  if (process.env.NODE_ENV !== "production" && keyPath) {
    const absolutePath = path.isAbsolute(keyPath)
      ? keyPath
      : path.join(process.cwd(), keyPath);

    if (!fs.existsSync(absolutePath)) {
      throw new Error(`Service account file not found at ${absolutePath}.`);
    }
    return cert(JSON.parse(fs.readFileSync(absolutePath, "utf8")));
  }

  // In production on Firebase/Cloud Run, use Application Default Credentials
  return applicationDefault();
}

const app =
  getApps().length > 0
    ? getApps()[0]
    : initializeApp({
        credential: resolveCredential(),
      });

export const adminDb = getFirestore(app);