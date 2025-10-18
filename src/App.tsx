import React, { useEffect, useMemo, useState } from "react";
import { v4 as uuid } from "uuid";
import {
  AppBar, Toolbar, Container, Typography, Button, Stack, TextField,
  Card, CardContent, CardActions, Grid, IconButton
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";

import Calculator from "./components/Calculator";
import type { CalcSession } from "./types";
import { initDB, listSessions, saveSession, getSession, deleteSession } from "./db";

type Mode = { kind: "list" } | { kind: "new" } | { kind: "open"; id: string };

export default function App() {
  const [mode, setMode] = useState<Mode>({ kind: "list" });
  const [sessions, setSessions] = useState<CalcSession[]>([]);
  const [current, setCurrent] = useState<CalcSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      await initDB();
      const s = await listSessions();
      setSessions(s);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const qq = q.trim();
    if (!qq) return sessions;
    return sessions.filter(s => s.title.includes(qq));
  }, [sessions, q]);

  async function openSession(id: string) {
    setLoading(true);
    const s = await getSession(id);
    setCurrent(s);
    setMode({ kind: "open", id });
    setLoading(false);
  }

  async function handleSave(s: CalcSession) {
    await saveSession(s);
    const all = await listSessions();
    setSessions(all);
    setCurrent(s);
    setMode({ kind: "open", id: s.id });
  }

  async function handleDelete(id: string) {
    if (!confirm("למחוק את החישוב לצמיתות?")) return;
    await deleteSession(id);
    const all = await listSessions();
    setSessions(all);
    setMode({ kind: "list" });
    setCurrent(null);
  }

  async function refreshToHome() {
    setMode({ kind: "list" });
    setCurrent(null);
    setQ("");
    setLoading(true);
    const s = await listSessions();
    setSessions(s);
    setLoading(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <>
      <AppBar position="sticky" color="transparent" elevation={0} sx={{ borderBottom: "1px solid rgba(0,0,0,.06)", backdropFilter: "blur(6px)" }}>
        <Toolbar>
          <Container>
            <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Typography variant="h6" fontWeight={900}>Calc Pro</Typography>
                <Typography color="text.secondary">ניהול חישובים שמורים</Typography>
              </Stack>
              <Stack direction="row" spacing={1}>
                <Button variant="outlined" startIcon={<RefreshIcon />} onClick={refreshToHome}>רענון</Button>
                <Button variant="contained" onClick={() => { setMode({ kind: "new" }); setCurrent(null); }}>
                  חישוב חדש ✨
                </Button>
              </Stack>
            </Stack>
          </Container>
        </Toolbar>
      </AppBar>

      <Container sx={{ py: 4 }}>
        {mode.kind === "list" && (
          <Stack spacing={3}>
            <TextField
              label="חיפוש לפי שם"
              placeholder="לדוגמה: הצעת מחיר"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              fullWidth
            />

            {loading ? (
              <Typography color="text.secondary">טוען…</Typography>
            ) : filtered.length === 0 ? (
              <Typography color="text.secondary">אין חישובים שמורים.</Typography>
            ) : (
              <Grid container spacing={2}>
                {filtered.map(s => (
                  <Grid item xs={12} md={6} key={s.id}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="subtitle1" fontWeight={800}>{s.title}</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                          נוצר: {new Date(s.createdAt).toLocaleString("he-IL")}
                          {" · "} אחוז: {s.percent}% {" · "}
                          שורות: {s.items.length} {" · "}
                          ניכויים: {s.deductions.length}
                        </Typography>
                      </CardContent>
                      <CardActions sx={{ justifyContent: "space-between" }}>
                        <Button startIcon={<FolderOpenIcon />} onClick={() => openSession(s.id)}>פתח</Button>
                        <IconButton color="error" onClick={() => handleDelete(s.id)}><DeleteOutlineIcon /></IconButton>
                      </CardActions>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Stack>
        )}

        {mode.kind === "new" && (
          <Calculator
            initial={{
              id: uuid(),
              title: "חישוב חדש",
              createdAt: new Date().toISOString(),
              percent: 10,
              items: [{ id: uuid(), value: 0 }, { id: uuid(), value: 0 }],
              deductions: [],
            }}
            onSave={handleSave}
          />
        )}

        {mode.kind === "open" && current && (
          <Calculator initial={current} onSave={handleSave} />
        )}
      </Container>
    </>
  );
}
