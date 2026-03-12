"use client";
import { useState } from "react";
import Link from "next/link";

export default function RegisterPage() {
  const [form, setForm]       = useState({ username: "", email: "", password: "", displayName: "" });
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const res  = await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
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
      </div>
      <div className="relative z-10 w-full max-w-[400px] mx-4">
        <div className="rounded-2xl border border-white/[0.07] p-8 shadow-glass" style={{ background: "rgba(255,255,255,0.035)", backdropFilter: "blur(24px)" }}>
          <div className="text-center mb-6">
            <h1 className="font-display font-extrabold text-[1.9rem] text-gradient tracking-tight mb-1">NexChat</h1>
            <p className="text-[0.73rem] text-slate-500">Create your account</p>
          </div>
          {error && <div className="mb-4 px-3.5 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[0.8rem]">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {[
              { name: "displayName", label: "Display name",    type: "text",     placeholder: "Abhijeet Verma",  required: false },
              { name: "username",    label: "Username",         type: "text",     placeholder: "abhijeet_v",      required: true  },
              { name: "email",       label: "Email",            type: "email",    placeholder: "you@example.com", required: true  },
              { name: "password",    label: "Password (min 8)", type: "password", placeholder: "••••••••••",      required: true  },
            ].map(f => (
              <div key={f.name}>
                <label className="block text-[0.72rem] text-slate-400 font-medium mb-1.5">{f.label}</label>
                <input name={f.name} type={f.type} value={(form as any)[f.name]} onChange={onChange} placeholder={f.placeholder} required={f.required}
                  className="w-full rounded-xl px-4 py-2.5 text-[0.88rem] text-slate-200 placeholder:text-slate-600 outline-none transition-all border border-white/[0.07] focus:border-purple-500/40"
                  style={{ background: "rgba(255,255,255,0.035)" }} />
              </div>
            ))}
            <button type="submit" disabled={loading}
              className="w-full mt-1 py-3 rounded-xl text-[0.88rem] font-semibold text-white disabled:opacity-50 transition-opacity"
              style={{ background: "linear-gradient(135deg, #7c3aed, #3b82f6)", boxShadow: "0 8px 24px rgba(124,58,237,0.35)" }}>
              {loading ? "Creating…" : "Create account →"}
            </button>
          </form>
          <p className="text-center text-[0.73rem] text-slate-500 mt-4">
            Already have an account? <Link href="/login" className="text-purple-400 hover:text-purple-300 transition-colors">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
