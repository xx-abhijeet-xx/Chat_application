"use client";
import { useState, useEffect } from "react";
import type { AuthUser } from "@/types";

export function useAuth() {
  const [user,  setUser]  = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = localStorage.getItem("accessToken");
    const u = localStorage.getItem("user");
    if (t && u) { setToken(t); setUser(JSON.parse(u)); }
    setReady(true);
  }, []);

  const logout = () => {
    localStorage.clear();
    document.cookie = "accessToken=; max-age=0; path=/";
    window.location.href = "/login";
  };

  return { user, token, ready, logout };
}
