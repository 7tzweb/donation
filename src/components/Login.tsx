// src/components/Login.tsx
import React from "react";
import {
  Paper,
  Typography,
  Button,
  Stack,
  Box,
  useTheme,
} from "@mui/material";
import { signInWithGoogle } from "../firebase";

export default function Login() {
  const theme = useTheme();

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: `linear-gradient(180deg, ${theme.palette.grey[100]}, ${theme.palette.grey[200]})`,
        p: 2,
      }}
    >
      <Paper
        elevation={3}
        sx={{
          p: { xs: 3, sm: 5 },
          maxWidth: 520,
          width: "100%",
          borderRadius: 4,
          bgcolor: "background.paper",
          boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
        }}
      >
        <Stack spacing={4} alignItems="center">
          {/* כותרת */}
          <Typography
            variant="h5"
            fontWeight={800}
            textAlign="center"
            sx={{
              color: "text.primary",
              fontFamily: `"Heebo", "Rubik", sans-serif`,
              lineHeight: 1.4,
              fontSize: { xs: "1.3rem", sm: "1.6rem" },
            }}
          >
            חשב תרומות ומעשרות בקלות
          </Typography>

          {/* תיאור */}
          <Typography
            variant="body1"
            color="text.secondary"
            textAlign="center"
            sx={{
              maxWidth: 420,
              fontSize: { xs: "1rem", sm: "1.1rem" },
              lineHeight: 1.7,
            }}
          >
            שומר עבורך את כל הקבלות, ומאפשר הורדה מהירה ונוחה של כולן בסוף השנה.
          </Typography>

          {/* כפתור Google */}
          <Button
            onClick={signInWithGoogle}
            startIcon={
              <Box
                component="img"
                src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                alt="Google"
                sx={{ width: 22, height: 22 }}
              />
            }
            sx={{
              mt: 1,
              bgcolor: "#fff",
              color: "#000",
              fontWeight: 600,
              textTransform: "none",
              borderRadius: 3,
              boxShadow: "0 3px 10px rgba(0,0,0,0.1)",
              "&:hover": {
                bgcolor: "#f5f5f5",
              },
              px: 3,
              py: 1.5,
              width: { xs: "100%", sm: "auto" },
            }}
          >
            התחבר עם Google
          </Button>

         {/* פסוק מעוצב */}
<Box
  sx={{
    mt: 4,
    width: "100%",
    px: { xs: 1, sm: 2 },
  }}
>
  <Box
    dir="rtl"
    style={{
      textAlign: "right",
      fontFamily: `"Noto Sans Hebrew", "Rubik", sans-serif`,
      fontSize: "0.85rem",
      lineHeight: 2,
      color: "#666",
      whiteSpace: "pre-line",
    }}
  >
    {`“הָבִיאוּ אֶת כָּל הַמַּעֲשֵׂר אֶל בֵּית הָאוֹצָר וִיהִי טֶרֶף בְּבֵיתִי וּבְחָנוּנִי נָא בָּזֹאת אָמַר יְהוָה צְבָאוֹת אִם לֹא אֶפְתַּח לָכֶם אֵת אֲרֻבּוֹת הַשָּׁמַיִם וַהֲרִיקֹתִי לָכֶם בְּרָכָה עַד בְּלִי דָי.”`}

    <Box component="span" sx={{ fontSize: "0.75rem", display: "inline-block", mt: 0.5, ml: 1 }}>
      (מלאכי ג׳, י׳)
    </Box>
  </Box>
</Box>


        </Stack>
      </Paper>
    </Box>
  );
}
