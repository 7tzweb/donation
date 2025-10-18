// src/components/Calculator.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { v4 as uuid } from "uuid";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import type { CalcItem, Deduction, CalcSession, ImageAttachment } from "../types";

import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Stack,
  Button,
  IconButton,
  TextField,
  Typography,
  Divider,
  ToggleButton,
  ToggleButtonGroup,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  InputAdornment,
  Paper,
} from "@mui/material";

import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import VisibilityIcon from "@mui/icons-material/Visibility";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import ChangeCircleIcon from "@mui/icons-material/ChangeCircle";
import AddCircleIcon from "@mui/icons-material/AddCircle";

// ---------- helpers ----------
const nf = new Intl.NumberFormat("he-IL", { maximumFractionDigits: 2 });
const sanitizeFilename = (s: string) =>
  s.replace(/[<>:"/\\|?*\x00-\x1F]/g, " ").replace(/\s+/g, " ").trim();

const monthInputDefault = () => {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = String(d.getFullYear());
  return `${yyyy}-${mm}`;
};

// 0 -> "" להצגה ריקה בשדות המספר
type CalcItemLocal = Omit<CalcItem, "value"> & { value: number | "" };
type DeductionLocal = Omit<Deduction, "amount"> & { amount: number | "" };

const toLocalItems = (arr?: CalcItem[]): CalcItemLocal[] =>
  (arr ?? [{ id: uuid(), value: 0 }, { id: uuid(), value: 0 }]).map((i) => ({
    ...i,
    value: i.value === 0 ? "" : i.value,
  }));

const toLocalDeductions = (arr?: Deduction[]): DeductionLocal[] =>
  (arr ?? []).map((d) => ({
    ...d,
    amount: d.amount === 0 ? "" : d.amount,
  }));

const toNum = (v: number | "" | undefined) => (v === "" || v == null ? 0 : Number(v));

// ---------- component ----------
type Props = { initial?: Partial<CalcSession>; onSave: (s: CalcSession) => Promise<void> };

export default function Calculator({ initial, onSave }: Props) {
  const [title, setTitle] = useState(initial?.title ?? "חישוב חדש");
  const [percent, setPercent] = useState<number>(initial?.percent ?? 10);
  const [items, setItems] = useState<CalcItemLocal[]>(toLocalItems(initial?.items));
  const [deductions, setDeductions] = useState<DeductionLocal[]>(toLocalDeductions(initial?.deductions));
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<{ att: ImageAttachment; did: string } | null>(null);

  // חודש/שנה (type=month) – משולב בשם
  const [monthYear, setMonthYear] = useState<string>(() => {
    const found = (initial?.title || "").match(/(\d{1,2})\/(\d{4})$/);
    if (found) {
      const mm = found[1].padStart(2, "0");
      const yyyy = found[2];
      return `${yyyy}-${mm}`;
    }
    return monthInputDefault();
  });
  useEffect(() => {
    const [yyyy, mm] = monthYear.split("-");
    if (!yyyy || !mm) return;
    const suffix = `${parseInt(mm, 10)}/${yyyy}`;
    const next = title.replace(/\s+\d{1,2}\/\d{4}$/, "").trim() + " " + suffix;
    setTitle(next.trim());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthYear]);

  // חישובים
  const sum = useMemo(() => items.reduce((a, b) => a + toNum(b.value), 0), [items]);
  const percentAmount = useMemo(() => sum * (percent / 100), [sum, percent]);
  const deductionsSum = useMemo(() => deductions.reduce((a, d) => a + toNum(d.amount), 0), [deductions]);
  const percentMinusDeductions = useMemo(
    () => percentAmount - deductionsSum,
    [percentAmount, deductionsSum]
  );
  const remainingToDeduct = Math.max(percentMinusDeductions, 0);
  const overDeducted = Math.max(-percentMinusDeductions, 0);
  const total = useMemo(() => sum + percentAmount - deductionsSum, [sum, percentAmount, deductionsSum]);

  // קלטי קבצים לניכויים
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  // עזר – פריטים
  function addItem() {
    setItems((p) => [...p, { id: uuid(), value: "" }]);
  }
  function removeItem(id: string) {
    setItems((p) => (p.length > 2 ? p.filter((i) => i.id !== id) : p));
  }
  function updateItem(id: string, value: number | "") {
    setItems((p) => p.map((i) => (i.id === id ? { ...i, value } : i)));
  }

  // עזר – ניכויים
  function addDeduction() {
    setDeductions((p) => [...p, { id: uuid(), amount: "", note: "" }]);
  }
  function removeDeduction(id: string) {
    setDeductions((p) => p.filter((d) => d.id !== id));
  }
  function updateDeduction(id: string, patch: Partial<DeductionLocal>) {
    setDeductions((p) => p.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  }

  // קבצים
  function readFileAsDataURL(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = reject;
      r.readAsDataURL(file);
    });
  }
  const pickImage = (d: DeductionLocal) => fileInputs.current[d.id]?.click();

  async function onFileChanged(d: DeductionLocal, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await readFileAsDataURL(file);
    const datePart = new Date().toISOString().slice(0, 10);
    const ext = file.name.includes(".")
      ? file.name.split(".").pop()!
      : file.type.split("/").pop() || "img";
    const filename = `${sanitizeFilename(title || "חישוב")} - ${sanitizeFilename(
      d.note || "ניכוי"
    )} - ${datePart}.${ext}`;
    const att: ImageAttachment = {
      filename,
      mime: file.type || "application/octet-stream",
      dataUrl,
      addedAt: new Date().toISOString(),
    };
    updateDeduction(d.id, { attachment: att });
    e.target.value = "";
  }

  const openPreview = (d: DeductionLocal) => d.attachment && setPreview({ att: d.attachment, did: d.id });
  const closePreview = () => setPreview(null);
  function downloadAttachment(att?: ImageAttachment) {
    if (!att) return;
    const a = document.createElement("a");
    a.href = att.dataUrl;
    a.download = att.filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
  const removeAttachment = (did: string) => updateDeduction(did, { attachment: undefined });

  async function downloadAllAttachmentsZip() {
    const withFiles = deductions.filter((d) => d.attachment);
    if (withFiles.length === 0) return;
    const zip = new JSZip();
    withFiles.forEach((d) => {
      const att = d.attachment!;
      const b64 = att.dataUrl.split(",")[1] || "";
      zip.file(att.filename, b64, { base64: true });
    });
    const blob = await zip.generateAsync({ type: "blob" });
    saveAs(blob, `${sanitizeFilename(title || "חישוב")} - כל התמונות.zip`);
  }

  async function handleSave() {
    const session: CalcSession = {
      id: initial?.id ?? uuid(),
      title: title?.trim() || "חישוב ללא שם",
      createdAt: initial?.createdAt ?? new Date().toISOString(),
      percent,
      // המרה חזרה למספרים בעת שמירה
      items: items.map<CalcItem>(({ id, value }) => ({ id, value: toNum(value) })),
      deductions: deductions.map<Deduction>(({ id, note, amount, attachment }) => ({
        id,
        note: note || "",
        amount: toNum(amount),
        attachment,
      })),
    };
    setSaving(true);
    try {
      await onSave(session);
    } finally {
      setSaving(false);
    }
  }

  // ESC לסגירה
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePreview();
    };
    if (preview) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [preview]);

  // כותרת – בקרים משמאל
  const headerControls = (
    <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" sx={{ rowGap: 1 }}>
      <TextField
        label="חודש/שנה"
        type="month"
        value={monthYear}
        onChange={(e) => setMonthYear(e.target.value)}
        sx={{ width: 160, "& .MuiFilledInput-input": { py: 1.4, px: 2 } }}
      />
      <ToggleButtonGroup
        exclusive
        value={[10, 20].includes(percent) ? percent : null}
        onChange={(_, val) => {
          if (typeof val === "number") setPercent(val);
        }}
      >
        {[10, 20].map((p) => (
          <ToggleButton key={p} value={p}>
            {p}%
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
      <TextField
        label="מותאם אישית"
        type="number"
        value={percent}
        onChange={(e) => setPercent(Number((e.target.value || "0").replace(",", ".")) || 0)}
        sx={{ width: 120, "& .MuiFilledInput-input": { py: 1.4, px: 2 } }}
        inputProps={{ step: "any" }}
      />
      <TextField
        label="שם החישוב"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="לדוגמה: חודש אלול"
        sx={{ width: { xs: 240, md: 280 }, "& .MuiFilledInput-input": { py: 1.4, px: 2 } }}
      />
    </Stack>
  );

  return (
    <Card variant="outlined" sx={{ width: "100%" }}>
      <CardHeader
        titleTypographyProps={{ fontWeight: 900 }}
        title="מחשבון + אחוזים"
        subheader="RTL מינימליסטי, ברור ומותאם"
        action={headerControls}
        sx={{ pb: 1 }}
      />

      <CardContent sx={{ pt: 1.25 }}>
        <Stack spacing={2.5} sx={{ width: "100%" }}>
          {/* סכומים — 1/2/4 טורים */}
          <Box sx={{ width: "100%" }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.25 }}>
              <Typography variant="h6" fontWeight={800} sx={{ mb: 0.25 }}>
                סכומים
              </Typography>
              <Button startIcon={<AddCircleIcon />} onClick={addItem}>
                הוסף שורה
              </Button>
            </Stack>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(4, 1fr)" },
                gap: 1.5,
                width: "100%",
              }}
            >
              {items.map((it, idx) => (
                <TextField
                  key={it.id}
                  fullWidth
                  type="number"
                  placeholder={`מספר ${idx + 1}`}
                  value={it.value === 0 ? "" : it.value}
                  onChange={(e) => {
                    const raw = e.target.value.replace(",", ".");
                    updateItem(it.id, raw === "" ? "" : Number(raw));
                  }}
                  sx={{
                    "& .MuiFilledInput-input": { py: 1.45, px: 2 },
                    "& .MuiInputLabel-root.MuiInputLabel-shrink": { marginBottom: "6px" },
                  }}
                  InputProps={{
                    inputProps: { step: "any" },
                    endAdornment: (
                      <InputAdornment position="end">
                        <Tooltip title="מחק שורה">
                          <span>
                            <IconButton
                              color="error"
                              size="small"
                              onClick={() => removeItem(it.id)}
                              disabled={items.length <= 2}
                            >
                              <DeleteOutlineIcon />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </InputAdornment>
                    ),
                  }}
                />
              ))}
            </Box>
          </Box>

          {/* ניכויים */}
          <Box sx={{ width: "100%" }}>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1.25}
              alignItems={{ xs: "stretch", sm: "center" }}
              justifyContent="space-between"
              sx={{ mb: 1.25 }}
            >
              <Typography variant="h6" fontWeight={800} sx={{ mb: 0.25 }}>
                ניכויים{" "}
                <Typography component="span" color="text.secondary" fontWeight={500} ml={1}>
                  (יורד מהסכום הסופי)
                </Typography>
              </Typography>
              <Stack direction="row" spacing={1}>
                <Button variant="outlined" onClick={addDeduction}>
                  ➖ הוסף ניכוי
                </Button>
                <Button
                  variant="outlined"
                  onClick={downloadAllAttachmentsZip}
                  disabled={deductions.every((d) => !d.attachment)}
                >
                  ⬇️ הורד כל התמונות
                </Button>
              </Stack>
            </Stack>

            <Stack spacing={1.5} sx={{ width: "100%" }}>
              {deductions.map((d) => (
                <Box
                  key={d.id}
                  sx={{
                    display: "flex",
                    flexWrap: { xs: "wrap", sm: "nowrap" },
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 1.25,
                    width: "100%",
                  }}
                >
                  <Box sx={{ flex: { xs: "1 1 100%", sm: "0 0 14%" } }}>
                    <TextField
                      fullWidth
                      label="סכום"
                      type="number"
                      value={d.amount === 0 ? "" : d.amount}
                      onChange={(e) => {
                        const raw = e.target.value.replace(",", ".");
                        updateDeduction(d.id, { amount: raw === "" ? "" : Number(raw) });
                      }}
                      InputProps={{ inputProps: { step: "any" } }}
                      sx={{
                        "& .MuiFilledInput-input": { py: 1.45, px: 2 },
                        "& .MuiInputLabel-root.MuiInputLabel-shrink": { marginBottom: "6px" },
                      }}
                    />
                  </Box>

                  <Box sx={{ flex: { xs: "1 1 100%", sm: "1 1 auto" }, minWidth: 0 }}>
                    <TextField
                      fullWidth
                      label="הסבר/תיאור"
                      value={d.note}
                      onChange={(e) => updateDeduction(d.id, { note: e.target.value })}
                      sx={{
                        "& .MuiFilledInput-input": { py: 1.45, px: 2 },
                        "& .MuiInputLabel-root.MuiInputLabel-shrink": { marginBottom: "6px" },
                      }}
                    />
                  </Box>

                  <Box sx={{ flex: { xs: "1 1 100%", sm: "0 0 16%" } }}>
                    <Tooltip title={d.attachment ? "החלף תמונה" : "צרף תמונה"}>
                      <Button
                        fullWidth
                        variant="outlined"
                        onClick={() => pickImage(d)}
                        startIcon={d.attachment ? <ChangeCircleIcon /> : <AttachFileIcon />}
                        sx={{ minWidth: 0, px: 1.25, height: "100%" }}
                      >
                        {d.attachment ? "החלף" : "צרף"}
                      </Button>
                    </Tooltip>
                    <input
                      type="file"
                      accept="image/*"
                      hidden
                      ref={(el) => (fileInputs.current[d.id] = el)}
                      onChange={(e) => onFileChanged(d, e)}
                    />
                  </Box>

                  <Box sx={{ flex: { xs: "1 1 100%", sm: "0 0 16%" } }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Tooltip title="צפה">
                        <span>
                          <IconButton onClick={() => openPreview(d)} disabled={!d.attachment}>
                            <VisibilityIcon />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title="הורד">
                        <span>
                          <IconButton onClick={() => downloadAttachment(d.attachment)} disabled={!d.attachment}>
                            <DownloadOutlinedIcon />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title="מחק ניכוי">
                        <IconButton color="error" onClick={() => removeDeduction(d.id)}>
                        <DeleteOutlineIcon />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </Box>
                </Box>
              ))}
              {deductions.length === 0 && (
                <Typography color="text.secondary" variant="body2">
                  אין ניכויים. לחץ “➖ הוסף ניכוי”.
                </Typography>
              )}
            </Stack>
          </Box>

          <Divider sx={{ my: 1.25 }} />

          {/* KPIs – 6 טורים בשורה אחת ב-md+ */}
          <Box
            sx={{
              width: "100%",
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)", md: "repeat(6, 1fr)" },
              gap: 1.25,
            }}
          >
            <Kpi title="סכום (ללא אחוז)" value={nf.format(sum)} />
            <Kpi title={`${percent}% מהסכום`} value={nf.format(percentAmount)} />
            <Kpi title="סה״כ לתשלום (כולל אחוז פחות ניכויים)" value={nf.format(total)} />
            <Kpi title={`${percent}% פחות ניכויים`} value={nf.format(Math.max(percentMinusDeductions, 0))} />
            <Kpi title="נשאר להוריד" value={nf.format(remainingToDeduct)} />
            <Kpi title="חריגת ניכויים (אם יש)" value={overDeducted > 0 ? nf.format(overDeducted) : "—"} />
          </Box>

          <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" sx={{ width: "100%" }}>
            <Chip label={`ניכויים עד כה: ${nf.format(deductionsSum)}`} variant="outlined" />
            <Button onClick={handleSave} disabled={saving}>
              💾 שמירה
            </Button>
          </Stack>
        </Stack>
      </CardContent>

      {/* תצוגת תמונה */}
      <Dialog open={!!preview} onClose={closePreview} maxWidth="md" fullWidth>
        {preview && (
          <>
            <DialogTitle sx={{ fontWeight: 800 }}>{preview.att.filename}</DialogTitle>
            <DialogContent dividers sx={{ display: "grid", placeItems: "center", bgcolor: "#fafafa" }}>
              <img
                src={preview.att.dataUrl}
                alt={preview.att.filename}
                style={{ maxWidth: "100%", maxHeight: "70vh", borderRadius: 10 }}
              />
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button variant="outlined" startIcon={<DownloadOutlinedIcon />} onClick={() => downloadAttachment(preview.att)}>
                הורד
              </Button>
              <Button
                variant="outlined"
                startIcon={<ChangeCircleIcon />}
                onClick={() => {
                  closePreview();
                  fileInputs.current[preview.did]?.click();
                }}
              >
                החלף
              </Button>
              <Button
                color="error"
                startIcon={<DeleteOutlineIcon />}
                onClick={() => {
                  removeAttachment(preview.did);
                  closePreview();
                }}
              >
                מחק
              </Button>
              <Box flex={1} />
              <Chip variant="outlined" label={`נוסף: ${new Date(preview.att.addedAt).toLocaleString("he-IL")}`} />
              <Button onClick={closePreview}>סגור</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Card>
  );
}

// ===== KPI card =====
function Kpi({ title, value }: { title: string; value: string }) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        borderRadius: "14px",
        boxShadow: "0 6px 22px rgba(2,6,23,0.06)",
        width: "100%",
      }}
    >
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
        {title}
      </Typography>
      <Typography variant="h6" fontWeight={900}>
        {value}
      </Typography>
    </Paper>
  );
}
