// src/App.tsx
import React, { useEffect, useMemo, useState } from "react";
import { v4 as uuid } from "uuid";
import {
  AppBar,
  Toolbar,
  Container,
  Typography,
  Button,
  Stack,
  TextField,
  Card,
  CardContent,
  CardActions,
  Grid,
  IconButton,
  Select,
  MenuItem,
  Checkbox,
  ListItemText,
} from "@mui/material";

import RefreshIcon from "@mui/icons-material/Refresh";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";

import { Routes, Route, Navigate, useNavigate } from "react-router-dom";

import JSZip from "jszip";
import { saveAs } from "file-saver";

import Calculator from "./components/Calculator";
import type { CalcSession } from "./types";
import { initDB, listSessions, saveSession, getSession, deleteSession } from "./db";

import { auth, signOutUser } from "./firebase";
import { onAuthStateChanged, type User } from "firebase/auth";

import Login from "./components/Login";
import ProtectedRoute from "./components/ProtectedRoute";

type Mode = { kind: "list" } | { kind: "new" } | { kind: "open"; id: string };

// עזרי פורמט
const toMmYyyy = (yyyyMm: string) => {
  const [y, m] = (yyyyMm || "").split("-");
  if (!y || !m) return "";
  return `${m}/${y}`;
};
const normalizeMonthYear = (raw?: string, title?: string, createdAt?: string) => {
  let v = (raw || "").trim();

  // monthYear קיים
  if (v) {
    // 2025-10
    if (/^\d{4}-\d{1,2}$/.test(v)) {
      const [y, m] = v.split("-");
      return `${y}-${m.padStart(2, "0")}`;
    }
    // 10-2025
    if (/^\d{1,2}-\d{4}$/.test(v)) {
      const [m, y] = v.split("-");
      return `${y}-${m.padStart(2, "0")}`;
    }
    // 2025/10
    if (/^\d{4}\/\d{1,2}$/.test(v)) {
      const [y, m] = v.split("/");
      return `${y}-${m.padStart(2, "0")}`;
    }
    // 10/2025
    if (/^\d{1,2}\/\d{4}$/.test(v)) {
      const [m, y] = v.split("/");
      return `${y}-${m.padStart(2, "0")}`;
    }
  }

  // כותרת בסגנון " ... 10/2025" או "10-2025"
  const t = (title || "").trim();
  const m1 = t.match(/(\d{1,2})[\/\-](\d{4})$/);
  if (m1) return `${m1[2]}-${m1[1].padStart(2, "0")}`;

  // נפילה ל-createdAt
  const d = createdAt ? new Date(createdAt) : new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

function Home() {
  const [mode, setMode] = useState<Mode>({ kind: "list" });
  const [sessions, setSessions] = useState<CalcSession[]>([]);
  const [current, setCurrent] = useState<CalcSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  // בחירה
  const [selectedYears, setSelectedYears] = useState<string[]>([]);
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]); // ערכים בפורמט YYYY-MM

  useEffect(() => {
    (async () => {
      await initDB();
      const s = await listSessions();
      setSessions(s);
      setLoading(false);
    })();
  }, []);

  // חיפוש
  const filtered = useMemo(() => {
    const qq = q.trim();
    if (!qq) return sessions;
    return sessions.filter((s) => s.title.includes(qq));
  }, [sessions, q]);

  // הפקת שנים + כל החודשים הקיימים (unique) מהדאטה
  const { years, monthsAll } = useMemo(() => {
    const ySet = new Set<string>();
    const mSet = new Set<string>(); // YYYY-MM

    sessions.forEach((s) => {
      const yyyyMm = normalizeMonthYear((s as any).monthYear, s.title, s.createdAt);
      const [y, m] = yyyyMm.split("-");
      if (!y || !m) return;
      ySet.add(y);
      mSet.add(`${y}-${m}`);
    });

    const yearsArr = Array.from(ySet).sort((a, b) => Number(b) - Number(a));
    // מיין חודש-שנה: קודם שנה יורדת, אחר כך חודש יורד
    const monthsArr = Array.from(mSet).sort((a, b) => {
      const [ya, ma] = a.split("-");
      const [yb, mb] = b.split("-");
      if (ya !== yb) return Number(yb) - Number(ya);
      return Number(mb) - Number(ma);
    });

    return { years: yearsArr, monthsAll: monthsArr };
  }, [sessions]);

  // לוגיקת נעילה/איפוס
  const handleYearChange = (event: any) => {
    const value = event.target.value as string[];
    if (value.includes("all")) {
      if (selectedYears.length === years.length) setSelectedYears([]);
      else {
        setSelectedYears(years);
        setSelectedMonths([]); // נעל חודשים
      }
    } else {
      setSelectedYears(value);
      if (value.length > 0) setSelectedMonths([]); // נעל חודשים
    }
  };

  const handleMonthChange = (event: any) => {
    const value = event.target.value as string[]; // ערכים של YYYY-MM
    if (value.includes("all")) {
      if (selectedMonths.length === monthsAll.length) setSelectedMonths([]);
      else {
        setSelectedMonths(monthsAll);
        setSelectedYears([]); // נעל שנים
      }
    } else {
      setSelectedMonths(value);
      if (value.length > 0) setSelectedYears([]); // נעל שנים
    }
  };

  // הורדה
  async function handleDownload() {
    if (selectedYears.length === 0 && selectedMonths.length === 0) {
      alert("אנא בחר שנה או חודשים להורדה.");
      return;
    }

    const zip = new JSZip();
    let count = 0;

    sessions.forEach((s) => {
      const yyyyMm = normalizeMonthYear((s as any).monthYear, s.title, s.createdAt);
      const [yyyy, mm] = yyyyMm.split("-");
      const key = `${yyyy}-${mm}`;

      const isYearMatch = selectedYears.includes(yyyy);
      const isMonthMatch = selectedMonths.includes(key);

      if (isYearMatch || isMonthMatch) {
        s.deductions?.forEach((d) => {
          if (d.attachment) {
            const base64 = d.attachment.dataUrl.split(",")[1];
            zip.file(d.attachment.filename, base64, { base64: true });
            count++;
          }
        });
      }
    });

    if (count === 0) {
      alert("לא נמצאו קבלות להורדה.");
      return;
    }

    const zipName =
      selectedYears.length > 0
        ? `קבלות_${selectedYears.join("_")}.zip`
        : `קבלות_חודשים_${selectedMonths.map(toMmYyyy).join("_")}.zip`;

    const blob = await zip.generateAsync({ type: "blob" });
    saveAs(blob, zipName);
  }

  // CRUD
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
                <Button variant="contained" onClick={() => { setMode({ kind: "new" }); setCurrent(null); }}>חישוב חדש ✨</Button>
                <Button variant="text" color="inherit" onClick={signOutUser}>התנתק</Button>
              </Stack>
            </Stack>
          </Container>
        </Toolbar>
      </AppBar>

      <Container sx={{ py: 4 }}>
        {mode.kind === "list" && (
          <Stack spacing={3}>
            {/* חיפוש + הורדות */}
            <Stack direction={{ xs: "column", md: "row" }} alignItems="center" justifyContent="space-between" spacing={2}>
              <TextField
                label="חיפוש לפי שם"
                placeholder="לדוגמה: חישוב חודש 10/2025"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                sx={{ width: { xs: "100%", md: "30%" } }}
              />

              <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                <Typography fontWeight={700}>הורדת קבלות:</Typography>

                {/* לפי שנה (מרובה בחירה) */}
                <Select
                  multiple
                  size="small"
                  value={selectedYears}
                  onChange={handleYearChange}
                  displayEmpty
                  disabled={selectedMonths.length > 0}
                  renderValue={(sel) => (sel.length === 0 ? "בחר שנה" : sel.join(", "))}
                  sx={{ minWidth: 150, "& .MuiSelect-select": { display: "flex", alignItems: "center" } }}
                >
                  <MenuItem value="all">
                    <Checkbox checked={selectedYears.length === years.length && years.length > 0} />
                    <ListItemText primary="סמן הכול / בטל הכול" />
                  </MenuItem>
                  {years.map((y) => (
                    <MenuItem key={y} value={y}>
                      <Checkbox checked={selectedYears.includes(y)} />
                      <ListItemText primary={y} />
                    </MenuItem>
                  ))}
                </Select>

                {/* לפי חודשים (מרובה בחירה) — מציג MM/YYYY, שומר YYYY-MM */}
                <Select
                  multiple
                  size="small"
                  value={selectedMonths}
                  onChange={handleMonthChange}
                  displayEmpty
                  disabled={selectedYears.length > 0}
                  renderValue={(sel) =>
                    sel.length === 0 ? "בחר חודשים" : sel.map(toMmYyyy).join(", ")
                  }
                  sx={{ minWidth: 240, "& .MuiSelect-select": { display: "flex", alignItems: "center" } }}
                >
                  <MenuItem value="all">
                    <Checkbox checked={selectedMonths.length === monthsAll.length && monthsAll.length > 0} />
                    <ListItemText primary="סמן הכול / בטל הכול" />
                  </MenuItem>
                  {monthsAll.map((yyyyMm) => (
                    <MenuItem key={yyyyMm} value={yyyyMm}>
                      <Checkbox checked={selectedMonths.includes(yyyyMm)} />
                      <ListItemText primary={toMmYyyy(yyyyMm)} />
                    </MenuItem>
                  ))}
                </Select>

                {/* הורדה */}
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<DownloadOutlinedIcon />}
                  onClick={handleDownload}
                  disabled={selectedYears.length === 0 && selectedMonths.length === 0}
                  sx={{ height: 38 }}
                >
                  הורד קבלות נבחרים
                </Button>
              </Stack>
            </Stack>

            {/* רשימת חישובים */}
            {loading ? (
              <Typography color="text.secondary">טוען…</Typography>
            ) : filtered.length === 0 ? (
              <Typography color="text.secondary">אין חישובים שמורים.</Typography>
            ) : (
              <Grid container spacing={2}>
                {filtered.map((s) => (
                  <Grid item xs={12} md={6} key={s.id}  className="calc-grid">
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

        {mode.kind === "open" && current && <Calculator initial={current} onSave={handleSave} />}
      </Container>
    </>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [checking, setChecking] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setChecking(false);
      if (u && location.pathname === "/login") navigate("/", { replace: true });
    });
    return () => unsub();
  }, [navigate]);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute user={user} loading={checking}>
            <Home />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to={user ? "/" : "/login"} replace />} />
    </Routes>
  );
}
