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
  CircularProgress,
  Snackbar,
  Alert,
  Popover,
  Grid,
} from "@mui/material";

import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import VisibilityIcon from "@mui/icons-material/Visibility";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import ChangeCircleIcon from "@mui/icons-material/ChangeCircle";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";

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

// כיווץ תמונה ל־JPEG מתחת ל־~900KB, מקס' ממד 2000px, איכות יורדת עד 0.5
async function compressImageDataUrl(
  inputDataUrl: string,
  opts: { targetMaxBytes?: number; maxDim?: number; minQuality?: number } = {}
): Promise<{ dataUrl: string; mime: string; ext: "jpg" }> {
  const targetMaxBytes = opts.targetMaxBytes ?? 900 * 1024;
  const maxDim = opts.maxDim ?? 2000;
  const minQuality = opts.minQuality ?? 0.5;

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = reject;
    im.src = inputDataUrl;
  });

  let { width, height } = img;
  const scale = Math.min(1, maxDim / Math.max(width, height));
  width = Math.max(1, Math.round(width * scale));
  height = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  canvas.width = width;
  canvas.height = height;
  ctx.drawImage(img, 0, 0, width, height);

  let quality = 0.82;
  let out = canvas.toDataURL("image/jpeg", quality);

  const bytes = (s: string) => Math.ceil((s.length * 3) / 4) - (s.endsWith("==") ? 2 : s.endsWith("=") ? 1 : 0);
  while (bytes(out) > targetMaxBytes && quality > minQuality) {
    quality = Math.max(minQuality, quality - 0.07);
    out = canvas.toDataURL("image/jpeg", quality);
  }

  let shrink = 0.9;
  while (bytes(out) > targetMaxBytes && Math.max(canvas.width, canvas.height) > 800) {
    const nw = Math.round(canvas.width * shrink);
    const nh = Math.round(canvas.height * shrink);
    canvas.width = nw;
    canvas.height = nh;
    ctx.drawImage(img, 0, 0, nw, nh);
    out = canvas.toDataURL("image/jpeg", quality);
    shrink -= 0.08;
    if (shrink < 0.6) break;
  }

  return { dataUrl: out, mime: "image/jpeg", ext: "jpg" };
}

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

/* ===============================
   MonthYearField – שדה חודש/שנה
   שומר value כ- "YYYY-MM"
   מציג "MM/YYYY" + פופאובר 01–12
   =============================== */
function formatDisplay(v: string) {
  const [yyyy, mm] = (v || "").split("-");
  if (!yyyy || !mm) return "";
  return `${mm}/${yyyy}`;
}
function clampYear(y: number) {
  if (!Number.isFinite(y)) return new Date().getFullYear();
  return Math.min(9999, Math.max(1900, y));
}
function MonthYearField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
}) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);
  const [yyyy, mm] = (value || monthInputDefault()).split("-");
  const [yearEdit, setYearEdit] = useState<string>(yyyy);

  useEffect(() => {
    const [y] = (value || monthInputDefault()).split("-");
    setYearEdit(y);
  }, [value]);

  const handleOpen = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const setMonth = (m: number) => {
    const y = clampYear(parseInt(yearEdit || yyyy, 10));
    const next = `${y}-${String(m).padStart(2, "0")}`;
    onChange(next);
    handleClose();
  };

  const setThisMonth = () => {
    const d = new Date();
    onChange(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    handleClose();
  };

  const clearVal = () => {
    const d = new Date();
    onChange(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    handleClose();
  };

  return (
    <>
      <TextField
        label={label}
        value={formatDisplay(value)}
        onClick={handleOpen}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setAnchorEl(e.currentTarget as HTMLElement);
          }
        }}
        InputProps={{
          readOnly: true,
          endAdornment: (
            <InputAdornment position="end">
              <CalendarMonthIcon fontSize="small" />
            </InputAdornment>
          ),
        }}
        sx={{ width: 160, "& .MuiFilledInput-input": { py: 1.4, px: 2 }, cursor: "pointer" }}
      />
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      >
        <Box sx={{ p: 1.5, width: 300 }}>
          <TextField
            label="שנה"
            type="number"
            value={yearEdit}
            onChange={(e) => setYearEdit(e.target.value.replace(/\D/g, ""))}
            sx={{ width: "100%", "& .MuiFilledInput-input": { py: 1.2, px: 1.5 }, mb: 1.25 }}
            inputProps={{ step: 1 }}
          />
          <Grid container spacing={1}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <Grid item xs={3} key={m}>
                <Button
                  fullWidth
                  variant={String(m).padStart(2, "0") === mm ? "contained" : "outlined"}
                  onClick={() => setMonth(m)}
                  sx={{ minWidth: 0, py: 1 }}
                >
                  {String(m).padStart(2, "0")}
                </Button>
              </Grid>
            ))}
          </Grid>

          <Stack direction="row" justifyContent="space-between" sx={{ mt: 1.25 }}>
            <Button onClick={clearVal} color="inherit">
              נקה/איפוס
            </Button>
            <Button onClick={setThisMonth}>החודש</Button>
          </Stack>
        </Box>
      </Popover>
    </>
  );
}

// ---------- component ----------
type Props = { initial?: Partial<CalcSession>; onSave: (s: CalcSession) => Promise<void> };

export default function Calculator({ initial, onSave }: Props) {
  const [title, setTitle] = useState(initial?.title ?? "חישוב חדש");
  const [percent, setPercent] = useState<number>(initial?.percent ?? 10);
  const [items, setItems] = useState<CalcItemLocal[]>(toLocalItems(initial?.items));
  const [deductions, setDeductions] = useState<DeductionLocal[]>(toLocalDeductions(initial?.deductions));
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<{ att: ImageAttachment; did: string } | null>(null);

  // אינדיקציות שמירה
  const [justSaved, setJustSaved] = useState(false);
  const [snack, setSnack] = useState<{ open: boolean; msg: string; severity: "success" | "error" }>({
    open: false,
    msg: "",
    severity: "success",
  });

  // חודש/שנה – ערך שמור כ-YYYY-MM (ללא שינוי)
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
  const percentMinusDeductions = useMemo(() => percentAmount - deductionsSum, [percentAmount, deductionsSum]);
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

    const rawDataUrl = await readFileAsDataURL(file);
    const compressed = await compressImageDataUrl(rawDataUrl);

    const datePart = new Date().toISOString().slice(0, 10);
    const filename = `${sanitizeFilename(title || "חישוב")} - ${sanitizeFilename(
      d.note || "ניכוי"
    )} - ${datePart}.${compressed.ext}`;

    const att: ImageAttachment = {
      filename,
      mime: compressed.mime,
      dataUrl: compressed.dataUrl,
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
      monthYear, // ✅ השדה החדש
      items: items.map<CalcItem>(({ id, value }) => ({ id, value: toNum(value) })),
      deductions: deductions.map<Deduction>(({ id, note, amount, attachment }) => {
        const base = { id, note: note || "", amount: toNum(amount) } as Deduction;
        return attachment ? { ...base, attachment } : base;
      }),
    };

    setSaving(true);
    try {
      await onSave(session);
      setSnack({ open: true, msg: "נשמר בהצלחה", severity: "success" });
      setJustSaved(true);
      window.setTimeout(() => setJustSaved(false), 1600);
    } catch (err) {
      console.error(err);
      setSnack({ open: true, msg: "שמירה נכשלה", severity: "error" });
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
      {/* החלפת type="month" לשדה ממוספר עם פופאובר */}
      <MonthYearField label="חודש/שנה" value={monthYear} onChange={setMonthYear} />

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
    <Card variant="outlined" sx={{ width: "100%", borderRadius: 3 }}>
      <CardHeader
        titleTypographyProps={{ fontWeight: 900 }}
        title="מחשבון + אחוזים"
        subheader="RTL מינימליסטי, ברור ומותאם"
        action={headerControls}
        sx={{ px: 3, pt: 2, pb: 1.5 }}
      />

      <CardContent sx={{ p: 3 }}>
        <Stack spacing={3} sx={{ width: "100%" }}>
          {/* סכומים — 1/2/4 טורים */}
          <Box
            sx={{
              width: "100%",
              p: 2.25,
              bgcolor: "grey.50",
              borderRadius: 2,
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
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
                gap: 2,
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
                    "& .MuiFilledInput-input": { py: 1.6, px: 2 },
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
          <Box
            sx={{
              width: "100%",
              p: 2.5,
              bgcolor: "grey.50",
              borderRadius: 2,
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1.5}
              alignItems={{ xs: "stretch", sm: "center" }}
              justifyContent="space-between"
              sx={{ mb: 1.5 }}
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

            <Stack spacing={2} sx={{ width: "100%" }}>
              {deductions.map((d) => (
                <Box
                  key={d.id}
                  sx={{
                    display: "flex",
                    flexWrap: { xs: "wrap", sm: "nowrap" },
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 1.5,
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
                        "& .MuiFilledInput-input": { py: 1.6, px: 2 },
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
                        "& .MuiFilledInput-input": { py: 1.6, px: 2 },
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

          <Divider sx={{ my: 2.5 }} />

          {/* KPIs – 6 טורים בשורה אחת ב-md+ */}
          <Box
            sx={{
              width: "100%",
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)", md: "repeat(6, 1fr)" },
              gap: 1.5,
            }}
          >
            <Kpi title="סכום (ללא אחוז)" value={nf.format(sum)} />
            <Kpi title={`${percent}% מהסכום`} value={nf.format(percentAmount)} />
            <Kpi title="סה״כ לתשלום (כולל אחוז פחות ניכויים)" value={nf.format(total)} />
            <Kpi title={`${percent}% פחות ניכויים`} value={nf.format(Math.max(percentMinusDeductions, 0))} />
            <Kpi title="נשאר להוריד" value={nf.format(remainingToDeduct)} />
            <Kpi title="חריגת ניכויים (אם יש)" value={overDeducted > 0 ? nf.format(overDeducted) : "—"} />
          </Box>

          {/* שורת פעולה תחתונה */}
          <Stack
            direction="row"
            spacing={1.5}
            alignItems="center"
            justifyContent="space-between"
            sx={{ width: "100%", mt: 2, pt: 1 }}
          >
            <Chip label={`ניכויים עד כה: ${nf.format(deductionsSum)}`} variant="outlined" />

            <Button
              onClick={handleSave}
              disabled={saving}
              variant="contained"
              color={justSaved ? "success" : "primary"}
              size="large"
              startIcon={
                saving ? (
                  <CircularProgress size={18} thickness={5} />
                ) : justSaved ? (
                  <CheckCircleOutlineIcon />
                ) : (
                  <SaveOutlinedIcon />
                )
              }
              sx={{ minWidth: 140, fontWeight: 700 }}
            >
              {saving ? "שומר…" : justSaved ? "נשמר" : "שמירה"}
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

      {/* Snackbar לחיווי שמירה */}
      <Snackbar
        open={snack.open}
        autoHideDuration={2200}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      >
        <Alert
          onClose={() => setSnack((s) => ({ ...s, open: false }))}
          severity={snack.severity}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {snack.msg}
        </Alert>
      </Snackbar>
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
