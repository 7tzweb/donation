// src/db.ts
import type { CalcSession } from "./types";
import { auth } from "./firebase";

import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  orderBy,
} from "firebase/firestore";

/** מוודא שיש משתמש מחובר ומחזיר UID, אחרת זורק שגיאה */
function ensureUser(): string {
  const uid = auth.currentUser?.uid;
  if (!uid) {
    throw new Error("Not authenticated. Please sign in first.");
  }
  return uid;
}

/** מופעי השירותים */
const db = getFirestore();

/** אוסף הסשנים למשתמש */
function sessionsCol(uid: string) {
  return collection(db, "users", uid, "sessions");
}

// ========================= API ציבורי (כמו שהיה) =========================

export async function initDB(): Promise<void> {
  // אין אתחול מיוחד – רק מאשר שיש משתמש מחובר
  ensureUser();
}

export async function listSessions(): Promise<CalcSession[]> {
  const uid = ensureUser();
  const q = query(sessionsCol(uid), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  const results: CalcSession[] = [];
  snap.forEach((d) => results.push(d.data() as CalcSession));
  return results;
}

export async function getSession(id: string): Promise<CalcSession | null> {
  const uid = ensureUser();
  const ref = doc(db, "users", uid, "sessions", id);
  const s = await getDoc(ref);
  return s.exists() ? (s.data() as CalcSession) : null;
}

export async function saveSession(session: CalcSession): Promise<void> {
  const uid = ensureUser();

  // כאן אין העלאה ל-Storage: attachment.dataUrl נשמר כמו שהוא במסמך (Base64)
  // שים לב למגבלת ~1MiB למסמך – ברוב הקבלות זה מספיק.
  const ref = doc(db, "users", uid, "sessions", session.id);
  await setDoc(ref, session, { merge: true });
}

export async function deleteSession(id: string): Promise<void> {
  const uid = ensureUser();
  const ref = doc(db, "users", uid, "sessions", id);
  await deleteDoc(ref);
}
