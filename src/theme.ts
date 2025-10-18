import { createTheme } from "@mui/material/styles";

const palettePrimary = "#2563eb";     // כחול מודרני
const paletteBorder  = "#e6e8f0";     // מסגרת בהירה
const paletteHover   = "#cfd6e6";     // מסגרת בהובר
const surfaceSoft    = "#f7f9fc";     // רקע עדין לשדות
const focusRing      = "rgba(37, 99, 235, 0.12)"; // הילה בפוקוס

const theme = createTheme({
  direction: "rtl",
  palette: {
    mode: "light",
    primary: { main: palettePrimary },
    background: {
      default: "#f5f7fb",
      paper: "#ffffff",
    },
  },
  shape: { borderRadius: 14 },

  typography: {
    fontFamily:
      'Heebo, "Assistant", "Rubik", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", "Apple Color Emoji", "Segoe UI Emoji"',
    fontSize: 15,
    h5: { fontWeight: 800 },
  },

  components: {
    // ====== מראה “רך” ובלי קו תחתון לכל השדות ======
    MuiTextField: {
      defaultProps: {
        variant: "outlined",
        size: "small",
        fullWidth: true,
      },
    },

    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: surfaceSoft,
          borderRadius: 14,
          transition: "box-shadow .2s, border-color .15s, background-color .15s",

          // הילה בפוקוס + מסגרת מודגשת
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: palettePrimary,
            borderWidth: 2,
          },
          "&.Mui-focused": {
            boxShadow: `0 0 0 6px ${focusRing}`,
            backgroundColor: "#fff",
          },

          // hover עדין
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: paletteHover,
          },
        },

        // מסגרת הבסיס
        notchedOutline: {
          borderColor: paletteBorder,
          borderWidth: 1,
        },

        // padding פנימי — זה שומר על המראה עם label למעלה
        input: {
          paddingTop: "20.2px",
          paddingBottom: "3.2px",
          paddingInline: "16px",
        },

        // מרווח קטן בין איקונים/אדג'ורנמנטים לתוכן
        adornedStart: { paddingLeft: 8 },
        adornedEnd: { paddingRight: 8 },
      },
    },

    // אם יש לך גם Filled איפשהו — נשמור אותו נקי בלי קו תחתון
    MuiFilledInput: {
      styleOverrides: {
        root: {
          backgroundColor: surfaceSoft,
          borderRadius: 14,
          boxShadow: "inset 0 0 0 1px " + paletteBorder,
          "&:before, &:after": { display: "none" }, // בלי קו תחתון
          "&.Mui-focused": {
            boxShadow: `0 0 0 6px ${focusRing}, inset 0 0 0 2px ${palettePrimary}`,
            backgroundColor: "#fff",
          },
          "&:hover": {
            boxShadow: "inset 0 0 0 1px " + paletteHover,
          },
        },
        input: {
          paddingTop: "20.2px",
          paddingBottom: "3.2px",
          paddingInline: "16px",
        },
      },
    },

    MuiInputLabel: {
      styleOverrides: {
        root: { fontWeight: 500, color: "#5b6474" },
        shrink: { transformOrigin: "top right" },
      },
    },

    // כרטיסים/נייר – רך ומעודכן
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 16,
        },
        elevation1: {
          boxShadow: "0 10px 24px rgba(2, 6, 23, 0.06)",
        },
      },
    },
    MuiCard: {
      defaultProps: { elevation: 0, variant: "outlined" },
      styleOverrides: {
        root: {
          borderColor: paletteBorder,
          borderRadius: 18,
        },
      },
    },

    // כפתורים
    MuiButton: {
      defaultProps: { size: "medium" },
      styleOverrides: {
        root: { borderRadius: 12, textTransform: "none", fontWeight: 700 },
        containedPrimary: { boxShadow: "0 10px 22px rgba(37,99,235,.20)" },
      },
    },

    // Toggle buttons (אחוזים)
    MuiToggleButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          borderColor: paletteBorder,
          "&.Mui-selected": {
            backgroundColor: "rgba(37,99,235,0.12)",
            color: palettePrimary,
            borderColor: "rgba(37,99,235,0.25)",
          },
        },
      },
    },

    // צ'יפים KPI קטנים/מסגרות
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 12 },
        outlined: { borderColor: paletteBorder },
      },
    },
  },
});

export default theme;
