import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";
import AccessDenied from "../AccessDenied"; // adjust the path if different

export function RequireAuth({ children }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    // Not logged in -> go to login, preserve where they came from
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return children;
}

export function RequireRole({ roles = [], children }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    // Not logged in -> go to login
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Logged in but role not allowed -> show AccessDenied (no auto-redirect)
  if (!roles.includes(user.role)) {
    return <AccessDenied />;
  }

  return children;
}
