"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PocketBase from "pocketbase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const pb = new PocketBase(process.env.NEXT_PUBLIC_PB_URL || "");
pb.autoCancellation(false);

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (pb.authStore.isValid) {
      router.replace("/dashboard");
    }
  }, [router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (mode === "register") {
        await pb.collection("users").create({
          email,
          password,
          passwordConfirm: password,
          emailVisibility: true
        });
      }
      await pb.collection("users").authWithPassword(email, password);
      router.replace("/dashboard");
    } catch (err: any) {
      if (err?.isAbort) return;
      const message = err?.data?.message || err?.message || "Autentikasi gagal";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-slate-950 px-4 py-8">
      <div className="w-full max-w-md card-grad border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-emerald-600/10 rounded-full blur-3xl" />

        <div className="relative z-10 space-y-6">
          <header>
            <h1 className="text-3xl font-black tracking-tighter text-blue-400 italic">BITLAB</h1>
            <p className="text-slate-400 text-[10px] mt-2 font-bold uppercase tracking-[0.2em]">
              {mode === "login" ? "Masuk ke Portfolio" : "Daftar Akun Baru"}
            </p>
          </header>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="nama@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <p className="text-xs text-red-400 bg-red-500/10 px-3 py-2 rounded-xl">{error}</p>
            )}

            <div className="pt-4">
              <Button type="submit" className="w-full h-11" disabled={loading}>
                {loading ? "Processing..." : mode === "login" ? "Masuk Sekarang" : "Daftar Sekarang"}
              </Button>
            </div>
          </form>

          <button
            type="button"
            onClick={() => setMode((m) => (m === "login" ? "register" : "login"))}
            className="w-full text-center text-[10px] text-slate-500 hover:text-white uppercase font-bold mt-4 tracking-widest transition-colors"
          >
            {mode === "login" ? (
              <>
                Belum punya akun? <span className="text-blue-400">Daftar Gratis</span>
              </>
            ) : (
              <>
                Sudah punya akun? <span className="text-blue-400">Masuk</span>
              </>
            )}
          </button>

          <div className="pt-4 text-center text-[10px] text-slate-600">
            <Link href="/" className="hover:text-blue-400">
              ← Kembali ke halaman utama
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
