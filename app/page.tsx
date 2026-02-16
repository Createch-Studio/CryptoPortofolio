"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import PocketBase from "pocketbase";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const pb = new PocketBase(process.env.NEXT_PUBLIC_PB_URL || "");
pb.autoCancellation(false);

function formatIDR(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0
  }).format(value);
}

export default function HomePage() {
  const [heroTotal, setHeroTotal] = useState<string>("Rp ---");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    async function loadQuickSummary() {
      try {
        const stats = await pb.collection("asset_stats").getFullList({
          expand: "coin"
        });

        let totalVal = 0;
        stats.forEach((asset: any) => {
          const price = asset.expand.coin.current_price || 0;
          totalVal += asset.total_qty * price;
        });

        setHeroTotal(formatIDR(totalVal));
      } catch {
        setHeroTotal("Rp 0");
      }
    }

    loadQuickSummary();
  }, []);

  return (
    <>
      <nav className="fixed w-full z-50 border-b border-slate-800/50 glass-nav">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-black tracking-tighter bg-gradient-to-tr from-blue-400 to-emerald-400 bg-clip-text text-transparent italic">
              BITLAB
            </span>
          </div>

          <div className="hidden md:flex gap-8 text-[11px] uppercase tracking-[0.2em] font-bold">
            <Link href="/" className="text-blue-400">
              Home
            </Link>
            <Link href="/dashboard" className="text-slate-500 hover:text-white transition-all">
              Dashboard
            </Link>
            <Link href="/transaksi" className="text-slate-500 hover:text-white transition-all">
              Transactions
            </Link>
            <Link href="/rebalance" className="text-slate-500 hover:text-white transition-all">
              Rebalance
            </Link>
          </div>

          <div className="flex items-center gap-3 md:gap-4">
            <div className="hidden md:block">
              <Link href="/dashboard">
                <Button size="md">Open App</Button>
              </Link>
            </div>

            <button
              className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-700 text-slate-200"
              onClick={() => setMenuOpen((open) => !open)}
            >
              <span className="sr-only">Toggle navigation</span>
              <div className="space-y-1.5">
                <span className="block h-0.5 w-5 bg-slate-100" />
                <span className="block h-0.5 w-5 bg-slate-100" />
              </div>
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="md:hidden border-t border-slate-800/60 bg-slate-950/95">
            <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col gap-2 text-[11px] font-bold uppercase tracking-[0.2em]">
              <Link href="/" className="text-blue-400 py-1" onClick={() => setMenuOpen(false)}>
                Home
              </Link>
              <Link
                href="/dashboard"
                className="text-slate-300 py-1"
                onClick={() => setMenuOpen(false)}
              >
                Dashboard
              </Link>
              <Link
                href="/transaksi"
                className="text-slate-300 py-1"
                onClick={() => setMenuOpen(false)}
              >
                Transactions
              </Link>
              <Link
                href="/rebalance"
                className="text-slate-300 py-1"
                onClick={() => setMenuOpen(false)}
              >
                Rebalance
              </Link>
              <Link href="/dashboard" onClick={() => setMenuOpen(false)}>
                <Button className="w-full mt-2" size="md">
                  Open App
                </Button>
              </Link>
            </div>
          </div>
        )}
      </nav>

      <main className="hero-glow min-h-screen flex items-center pt-32 md:pt-40 pb-20">
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8">
            <div className="inline-block px-4 py-1.5 rounded-full border border-blue-500/20 bg-blue-500/5 text-blue-400 text-[10px] font-black uppercase tracking-widest">
              Next-Gen Portfolio Tracker
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl xl:text-7xl font-extrabold tracking-tighter leading-[1.1]">
              Smart Way to
              <br />
              <span className="text-slate-400">Track Crypto.</span>
            </h1>
            <p className="text-slate-400 text-base sm:text-lg max-w-md font-light">
              Monitor seluruh aset kripto Anda dalam satu dashboard terpusat. Akurasi tinggi dengan
              data pasar langsung dalam
              <span className="text-white font-bold"> IDR</span>.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Link href="/dashboard">
                <Button size="lg">Launch Dashboard</Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" size="lg">
                  Login / Register
                </Button>
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-10 bg-blue-500/10 blur-[100px] rounded-full" />
            <Card className="relative p-8 sm:p-10 shadow-2xl animate-pulse-soft">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-6 mb-10">
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                    Estimated Balance
                  </p>
                  <p className="text-3xl sm:text-4xl font-black tracking-tighter">{heroTotal}</p>
                </div>
                <div className="bg-emerald-500/10 text-emerald-400 p-3 rounded-2xl">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                    />
                  </svg>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <p className="text-[9px] font-bold text-slate-500 uppercase">Market Sync</p>
                  <p className="text-xs font-bold text-slate-300">CoinGecko API (IDR)</p>
                </div>
                <div className="space-y-1 text-left sm:text-right">
                  <p className="text-[9px] font-bold text-slate-500 uppercase">Status</p>
                  <p className="text-xs font-bold text-blue-400">Active</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </main>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24 md:py-32 border-t border-slate-900">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-12">
          <div className="space-y-4">
            <div className="text-blue-500 text-2xl font-bold">01</div>
            <h2 className="text-xl font-bold">Data Real-Time</h2>
            <p className="text-slate-500 text-sm leading-relaxed">
              Sinkronisasi harga instan dari pasar global yang dikonversi langsung ke Rupiah untuk
              perhitungan yang lebih relevan.
            </p>
          </div>

          <div className="space-y-4">
            <div className="text-emerald-500 text-2xl font-bold">02</div>
            <h2 className="text-xl font-bold">Ledger Minimalis</h2>
            <p className="text-slate-500 text-sm leading-relaxed">
              Sistem pencatatan transaksi yang intuitif tanpa kebingungan teknis. Fokus pada apa
              yang penting: pertumbuhan Anda.
            </p>
          </div>

          <div className="space-y-4">
            <div className="text-purple-500 text-2xl font-bold">03</div>
            <h2 className="text-xl font-bold">Keamanan Data</h2>
            <p className="text-slate-500 text-sm leading-relaxed">
              Didukung oleh PocketBase, memberikan Anda kendali penuh atas data portofolio Anda
              secara privat dan aman.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
