import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

// ⚠️ Demo only. Replace with backend/JWT later.
const DEMO_USERS = [
  { username: "admin", password: "Password", role: "admin" },
  { username: "design", password: "design123", role: "design" },
  { username: "production", password: "prod12356", role: "production" },
  { username: "hod", password: "hod1234", role: "viewer" },
   { username: "sales", password: "sales1234", role: "sales" },
];

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("auth_user");
    return raw ? JSON.parse(raw) : null;
  });

  useEffect(() => {
    if (user) localStorage.setItem("auth_user", JSON.stringify(user));
    else localStorage.removeItem("auth_user");
  }, [user]);

  const login = async (username, password) => {
    // simulate server auth
    const found = DEMO_USERS.find(u => u.username === username && u.password === password);
    if (!found) throw new Error("Invalid username or password");
    setUser({ username: found.username, role: found.role });
    return { username: found.username, role: found.role };
  };

  const logout = () => setUser(null);

  const value = useMemo(() => ({ user, login, logout }), [user]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
