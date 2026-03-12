"use client";
import { useState } from "react";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const res  = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
      const data = await res.json();
      if (!data.success) { setError(data.error); return; }
      document.cookie = `accessToken=${data.data.accessToken}; path=/; max-age=900; SameSite=Lax`;
      localStorage.setItem("accessToken", data.data.accessToken);
      localStorage.setItem("user", JSON.stringify(data.data.user));
      window.location.href = "/chat";
    } catch { setError("Something went wrong."); }
    finally { setLoading(false); }
  }

  return (
    <div className="h-full flex items-center justify-center relative overflow-hidden" style={{ background: "radial-gradient(ellipse at 60% 0%, rgba(139,92,246,0.18) 0%, transparent 60%), radial-gradient(ellipse at 20% 100%, rgba(59,130,246,0.15) 0%, transparent 55%), #0d0221" }}>
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 right-0 w-72 h-72 rounded-full bg-purple-600/10 blur-[80px]" />
        <div className="absolute bottom-1/4 left-0 w-56 h-56 rounded-full bg-blue-500/10 blur-[70px]" />
        <div className="absolute top-0 left-1/2 w-64 h-64 rounded-full bg-pink-500/8 blur-[80px]" />
      </div>

      <div className="relative z-10 w-full max-w-[380px] mx-4">
        {/* Card */}
        <div className="rounded-2xl border border-white/[0.07] p-8 shadow-glass" style={{ background: "rgba(255,255,255,0.035)", backdropFilter: "blur(24px)" }}>
          <div className="text-center mb-7">
            <h1 className="font-display font-extrabold text-[1.9rem] text-gradient tracking-tight mb-1">NexChat</h1>
            <p className="text-[0.73rem] text-slate-500">End-to-end encrypted · Real-time</p>
          </div>

          {error && <div className="mb-4 px-3.5 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[0.8rem]">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[0.72rem] text-slate-400 font-medium mb-1.5">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required
                className="w-full rounded-xl px-4 py-2.5 text-[0.88rem] text-slate-200 placeholder:text-slate-600 outline-none transition-all border border-white/[0.07] focus:border-purple-500/40 focus:bg-white/[0.06]"
                style={{ background: "rgba(255,255,255,0.035)" }} />
            </div>
            <div>
              <label className="block text-[0.72rem] text-slate-400 font-medium mb-1.5">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required
                className="w-full rounded-xl px-4 py-2.5 text-[0.88rem] text-slate-200 placeholder:text-slate-600 outline-none transition-all border border-white/[0.07] focus:border-purple-500/40 focus:bg-white/[0.06]"
                style={{ background: "rgba(255,255,255,0.035)" }} />
            </div>
            <button type="submit" disabled={loading}
              className="w-full mt-1 py-3 rounded-xl text-[0.88rem] font-semibold text-white disabled:opacity-50 transition-opacity"
              style={{ background: "linear-gradient(135deg, #7c3aed, #3b82f6)", boxShadow: "0 8px 24px rgba(124,58,237,0.35)" }}>
              {loading ? "Signing in…" : "Sign in →"}
            </button>
          </form>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-white/[0.06]" />
            <span className="text-[0.65rem] text-slate-600">or</span>
            <div className="flex-1 h-px bg-white/[0.06]" />
          </div>
          <p className="text-center text-[0.73rem] text-slate-500">
            No account? <Link href="/register" className="text-purple-400 hover:text-purple-300 transition-colors">Create one free</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
