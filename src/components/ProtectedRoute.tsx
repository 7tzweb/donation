import React from "react";
import { Navigate } from "react-router-dom";
import { CircularProgress, Box } from "@mui/material";
import type { User } from "firebase/auth";

type Props = {
  user: User | null;
  loading: boolean;
  children: React.ReactNode;
};

export default function ProtectedRoute({ user, loading, children }: Props) {
  if (loading) {
    return (
      <Box sx={{ display: "grid", placeItems: "center", minHeight: "60vh" }}>
        <CircularProgress />
      </Box>
    );
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}
