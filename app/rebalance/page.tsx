"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PocketBase from "pocketbase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const pb = new PocketBase(process.env.NEXT_PUBLIC_PB_URL || "");
pb.autoCancellation(false);

type RebalanceRow = {
  symbol: string;
  id: string;
  statId: string;
  qty: number;
  livePrice: number;
  currentVal: number;
  targetPct: number;
};

function formatIDR(val: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(val);
}

export default function RebalancePage() {
  const router = useRouter();
  const [rows, setRows] = useState<RebalanceRow[]>([]);
  const [totalValue, setTotalValue] = useState(0);
  const [reinvest, setReinvest] = useState("");
  const [totalPct, setTotalPct] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!pb.authStore.isValid) {
      router.replace("/login");
      return;
    }
    loadData();
  }, [router]);

  async function loadData() {
    const userId = pb.authStore.model?.id;
    if (!userId) return;
    try {
      const stats = await pb.collection("asset_stats").getFullList({
        expand: "coin",
        filter: `user = "${userId}" && total_qty > 0`
      });
      const portfolio = stats
        .map((s: any) => {
          const coin = s.expand.coin;
          if (!coin) return null;
          const live = coin.current_price || 0;
          const currentVal = s.total_qty * live;
          return {
            symbol: coin.symbol.toUpperCase(),
            id: coin.id,
            statId: s.id,
            qty: s.total_qty,
            livePrice: live,
            currentVal,
            targetPct: s.target_pct || 0
          } as RebalanceRow;
        })
        .filter(Boolean) as RebalanceRow[];
      const tv = portfolio.reduce((acc, r) => acc + r.currentVal, 0);
      setRows(portfolio.sort((a, b) => b.currentVal - a.currentVal));
      setTotalValue(tv);
      setTotalPct(portfolio.reduce((acc, r) => acc + r.targetPct, 0));
    } catch (err: any) {
      if (err?.isAbort) return;
      console.error(err);
    }
  }

  async function updateTargetPct(index: number, value: number) {
    const row = rows[index];
    const next = [...rows];
    next[index] = { ...row, targetPct: value };
    setRows(next);
    const sum = next.reduce((acc, r) => acc + r.targetPct, 0);
    setTotalPct(sum);
    setSaving(true);
    try {
      await pb.collection("asset_stats").update(row.statId, { target_pct: value });
    } catch (err: any) {
      if (err?.isAbort) return;
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  function logout() {
    pb.authStore.clear();
    router.replace("/login");
  }

  const reinvestAmount = parseFloat(reinvest) || 0;
  const newTotalValue = totalValue + reinvestAmount;

  return (
    <>
      <nav className="border-b border-slate-800 glass sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-6">
            <span className="text-xl font-black tracking-tighter bg-gradient-to-tr from-blue-400 to-emerald-400 bg-clip-text text-transparent italic">
              BITLAB
            </span>
            <div className="hidden md:flex gap-6 text-[10px] uppercase tracking-widest font-bold">
              <Link href="/dashboard" className="text-slate-500 hover:text-white transition-colors">
                Dashboard
              </Link>
              <Link href="/transaksi" className="text-slate-500 hover:text-white transition-colors">
                Transactions
              </Link>
              <Link href="/rebalance" className="text-white border-b-2 border-blue-500 pb-1">
                Rebalance
              </Link>
              <Link href="/setting" className="text-slate-500 hover:text-white transition-colors">
                Settings
              </Link>
              <button
                type="button"
                onClick={logout}
                className="text-red-500 hover:text-red-400 transition-all uppercase"
              >
                Logout
              </button>
            </div>
          </div>
          <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                saving ? "bg-yellow-500" : "bg-emerald-500"
              }`}
            />
            <span>{saving ? "Menyimpan..." : "System Ready"}</span>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 md:py-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10">
          <div>
            <h2 className="text-2xl font-black italic mb-2 text-blue-400">Smart Rebalancing</h2>
            <p className="text-slate-500 text-sm">
              Target alokasi (%) khusus untuk portfolio Anda.
            </p>
          </div>

          <div className="card-grad border border-blue-900/30 p-4 rounded-2xl flex flex-col gap-2 w-full md:w-auto min-w-[280px]">
            <label className="text-[10px] font-bold text-blue-400 uppercase tracking-widest px-1">
              💰 Rencana Reinvestasi (IDR)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-bold">
                Rp
              </span>
              <Input
                type="number"
                value={reinvest}
                onChange={(e) => setReinvest(e.target.value)}
                placeholder="0"
                className="bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm font-bold focus:border-blue-500 outline-none w-full"
              />
            </div>
          </div>

          <div className="px-6 py-3 rounded-2xl bg-slate-900 border border-slate-800 text-right min-w-[200px]">
            <p className="text-[9px] text-slate-500 font-bold uppercase mb-1">
              Total Net Worth Saya
            </p>
            <div className="text-xl font-black text-white">{formatIDR(totalValue)}</div>
          </div>
        </div>

        <div className="card-grad border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900/80 text-slate-500 uppercase text-[10px] font-bold tracking-widest">
              <tr>
                <th className="p-6">Asset</th>
                <th className="p-6 text-right">Nilai Saat Ini</th>
                <th className="p-6 text-center">Weight</th>
                <th className="p-6 text-center">Target %</th>
                <th className="p-6 text-right">Aksi Diperlukan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-20 text-center text-slate-600 italic">
                    Memuat data portfolio Anda...
                  </td>
                </tr>
              )}
              {rows.map((coin, index) => {
                const currentWeight =
                  totalValue > 0 ? (coin.currentVal / totalValue) * 100 : 0;
                const finalTargetVal = (coin.targetPct / 100) * newTotalValue;
                const diff = finalTargetVal - coin.currentVal;
                let action: JSX.Element | string = (
                  <span className="text-slate-800 text-[10px] uppercase font-bold italic tracking-tighter">
                    Sesuai Target
                  </span>
                );
                if (diff > 100) {
                  const qty = diff / coin.livePrice;
                  action = (
                    <div className="flex flex-col items-end">
                      <span className="px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400">
                        BELI {formatIDR(diff)}
                      </span>
                      <span className="text-[9px] text-slate-500 mt-1 font-mono font-bold">
                        {qty.toFixed(6)} {coin.symbol}
                      </span>
                    </div>
                  );
                } else if (diff < -100) {
                  const qty = Math.abs(diff) / coin.livePrice;
                  action = (
                    <div className="flex flex-col items-end">
                      <span className="px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider bg-red-500/10 text-red-400">
                        JUAL {formatIDR(Math.abs(diff))}
                      </span>
                      <span className="text-[9px] text-slate-500 mt-1 font-mono font-bold">
                        {qty.toFixed(6)} {coin.symbol}
                      </span>
                    </div>
                  );
                }
                return (
                  <tr key={coin.statId} className="hover:bg-slate-800/20 transition-colors">
                    <td className="p-6">
                      <div className="font-black text-blue-400 text-base">{coin.symbol}</div>
                      <div className="text-[10px] text-slate-600 font-mono mt-1">
                        {formatIDR(coin.livePrice)}
                      </div>
                    </td>
                    <td className="p-6 text-right font-mono font-bold">
                      {formatIDR(coin.currentVal)}
                    </td>
                    <td className="p-6 text-center">
                      <span className="bg-slate-800 text-slate-300 px-3 py-1 rounded-lg font-mono font-bold text-xs">
                        {currentWeight.toFixed(1)}%
                      </span>
                    </td>
                    <td className="p-6">
                      <div className="flex justify-center items-center gap-2">
                        <Input
                          type="number"
                          value={coin.targetPct}
                          onChange={(e) =>
                            updateTargetPct(index, parseFloat(e.target.value || "0"))
                          }
                          className="w-16 bg-slate-950 border border-slate-800 rounded-xl p-2 text-center font-bold text-emerald-400 focus:border-emerald-500 outline-none transition-all"
                        />
                        <span className="text-slate-600 font-bold text-[10px]">%</span>
                      </div>
                    </td>
                    <td className="p-6 text-right font-bold">{action}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-8 flex flex-col md:flex-row justify-between items-center gap-6 bg-slate-900/50 p-8 rounded-3xl border border-dashed border-slate-800">
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
              Total Target Alokasi
            </p>
            <h4
              className={`text-3xl font-black ${
                totalPct === 100 ? "text-emerald-500" : "text-red-500"
              }`}
            >
              {totalPct.toFixed(0)}%
            </h4>
          </div>
          <div
            className={`text-xs font-bold bg-red-400/10 px-4 py-2 rounded-xl ${
              totalPct === 100 ? "hidden" : ""
            }`}
          >
            ⚠️ Total harus 100% untuk akurasi rebalancing!
          </div>
          <Button type="button" variant="outline" onClick={loadData}>
            🔄 Refresh Live Data
          </Button>
        </div>
      </main>
    </>
  );
}
