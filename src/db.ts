import { Low } from "lowdb"
import { LocalStorage } from "lowdb/browser"
import type { DBData, CalcSession } from "./types"

const adapter = new LocalStorage<DBData>("calc_pro_db")
const db = new Low<DBData>(adapter, { sessions: [] })

export async function initDB(): Promise<void> {
  await db.read()
  db.data ||= { sessions: [] }
  await db.write()
}
export async function listSessions(): Promise<CalcSession[]> {
  await db.read()
  return db.data!.sessions
}
export async function getSession(id: string): Promise<CalcSession | null> {
  await db.read()
  return db.data!.sessions.find(s => s.id === id) ?? null
}
export async function saveSession(session: CalcSession): Promise<void> {
  await db.read()
  const idx = db.data!.sessions.findIndex(s => s.id === session.id)
  if (idx === -1) db.data!.sessions.unshift(session)
  else db.data!.sessions[idx] = session
  await db.write()
}
export async function deleteSession(id: string): Promise<void> {
  await db.read()
  db.data!.sessions = db.data!.sessions.filter(s => s.id !== id)
  await db.write()
}
