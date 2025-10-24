// src/firebase.ts
import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

// ⚙️ קריאה לערכים מקובץ ה-.env.local שלך (Vite דורש קידומת VITE_)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string,
  // ⚠️ חשוב! שים לב שהסיומת היא appspot.com ולא firebasestorage.app
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID as string,
};

// אתחול האפליקציה
export const app = initializeApp(firebaseConfig);

// Analytics (לא חובה, רק אם measurementId קיים)
export const analytics = getAnalytics(app);

// Auth
export const auth = getAuth(app);
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" });

// פונקציות התחברות/התנתקות
export async function signInWithGoogle(): Promise<void> {
  try {
    await signInWithPopup(auth, provider);
  } catch (err) {
    console.error("Google sign-in failed:", err);
    alert((err as Error).message);
    throw err;
  }
}

export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

// בדיקה בזמן פיתוח שהחיבור תקין
if (import.meta.env.DEV) {
  console.log("🔌 Firebase initialized:", app.name);
  console.log("ENV check:", {
    apiKey_ok: !!import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  });
}
