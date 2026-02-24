import { getApp, getApps, initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const getRequiredEnv = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
};

const firebaseConfig = {
  apiKey: "AIzaSyCfZ4kXlgeVS6-uS8TCX82i-KH7ezBKZLw",
  authDomain: "quicksite-cm.firebaseapp.com",
  projectId: "quicksite-cm",
  storageBucket: "quicksite-cm.firebasestorage.app",
  messagingSenderId: "28191793416",
  appId: "1:28191793416:web:46db50b37f05a8bc548cbd"
};

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app);
