"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PocketBase from "pocketbase";
import { Chart, ArcElement, Tooltip, Legend, DoughnutController } from "chart.js";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

Chart.register(ArcElement, Tooltip, Legend, DoughnutController);

const pb = new PocketBase(process.env.NEXT_PUBLIC_PB_URL || "");
pb.autoCancellation(false);

type PortfolioRow = {
  symbol: string;
  qty: number;
  cost: number;
  live: number;
  wallet: string;
};

type PortfolioViewRow = {
  symbol: string;
  qty: number;
  avgPrice: number;
  live: number;
  cost: number;
  pnl: number;
  pnlPct: number;
  value: number;
  weight: number;
  wallet: string;
};

const CHART_COLORS = [
  "#60a5fa",
  "#34d399",
  "#fbbf24",
  "#a78bfa",
  "#f472b6",
  "#22d3ee",
  "#f87171"
];

function formatIDR(val: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(val);
}

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<PortfolioRow[]>([]);
  const [totalRealized, setTotalRealized] = useState(0);
  const chartCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!pb.authStore.isValid) {
      router.replace("/login");
      return;
    }

    async function load() {
      try {
        const userId = pb.authStore.model?.id;
        if (!userId) {
          router.replace("/login");
          return;
        }

        const txs = await pb.collection("transactions").getFullList({
          expand: "coin",
          filter: `user = "${userId}"`
        });

        const dataMap: Record<string, PortfolioRow> = {};
        let realized = 0;

        txs.forEach((tx: any) => {
          const coin = tx.expand.coin;
          if (!coin) return;
          const symbol = coin.symbol.toUpperCase();
          if (!dataMap[symbol]) {
            dataMap[symbol] = {
              symbol,
              qty: 0,
              cost: 0,
              live: coin.current_price || 0,
              wallet: coin.wallet_address || "---"
            };
          }
          const row = dataMap[symbol];
          if (tx.type === "buy") {
            row.qty += tx.amount;
            row.cost += tx.amount * tx.price_at_date;
          } else {
            const currentAvg = row.qty > 0 ? row.cost / row.qty : 0;
            const salePrice = tx.price_at_sale || tx.price_at_date;
            realized += (salePrice - currentAvg) * tx.amount;
            row.qty -= tx.amount;
            row.cost -= tx.amount * currentAvg;
          }
        });

        const list = Object.values(dataMap).filter((r) => r.qty > 0.000001);
        setRows(
          list.sort(
            (a, b) => b.qty * b.live - a.qty * a.live
          )
        );
        setTotalRealized(realized);
      } catch (err: any) {
        if (err?.isAbort) return;
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    load();

    const cryptosSub = pb.collection("cryptos").subscribe("*", () => {
      load();
    });
    const txSub = pb.collection("transactions").subscribe("*", () => {
      load();
    });

    return () => {
      cryptosSub.catch(() => {});
      txSub.catch(() => {});
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, [router]);

  const viewRows: PortfolioViewRow[] = useMemo(() => {
    let totalVal = 0;
    rows.forEach((r) => {
      totalVal += r.qty * r.live;
    });
    return rows.map((r) => {
      const value = r.qty * r.live;
      const avgPrice = r.qty > 0 ? r.cost / r.qty : 0;
      const pnl = value - r.cost;
      const pnlPct = r.cost > 0 ? (pnl / r.cost) * 100 : 0;
      const weight = totalVal > 0 ? (value / totalVal) * 100 : 0;
      return {
        symbol: r.symbol,
        qty: r.qty,
        avgPrice,
        live: r.live,
        cost: r.cost,
        pnl,
        pnlPct,
        value,
        weight,
        wallet: r.wallet
      };
    });
  }, [rows]);

  const totals = useMemo(() => {
    let totalVal = 0;
    let totalCost = 0;
    viewRows.forEach((r) => {
      totalVal += r.value;
      totalCost += r.cost;
    });
    const pnl = totalVal - totalCost;
    const pnlPct = totalCost > 0 ? (pnl / totalCost) * 100 : 0;
    return { totalVal, totalCost, pnl, pnlPct };
  }, [viewRows]);

  useEffect(() => {
    const canvas = chartCanvasRef.current;
    if (!canvas || viewRows.length === 0) return;

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const labels = viewRows.map((r) => r.symbol);
    const data = viewRows.map((r) => r.value);

    chartRef.current = new Chart(canvas, {
      type: "doughnut",
      data: {
        labels,
        datasets: [
          {
            data,
            backgroundColor: CHART_COLORS,
            borderWidth: 0,
            hoverOffset: 8
          }
        ]
      },
      options: {
        cutout: "85%",
        plugins: {
          legend: {
            display: false
          }
        }
      }
    });
  }, [viewRows]);

  async function syncAllPrices() {
    try {
      const coins = await pb.collection("cryptos").getFullList();
      if (!coins.length) return;
      const ids = coins
        .map((c: any) => c.coingecko_id || c.name.toLowerCase().replace(/\s+/g, "-"))
        .join(",");
      const res = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=idr`
      );
      const data = await res.json();
      for (const coin of coins) {
        const priceId = coin.coingecko_id || coin.name.toLowerCase().replace(/\s+/g, "-");
        if (data[priceId]) {
          await pb.collection("cryptos").update(coin.id, {
            current_price: data[priceId].idr
          });
        }
      }
    } catch (err: any) {
      if (err?.isAbort) return;
      console.error(err);
    }
  }

  function logout() {
    pb.authStore.clear();
    router.replace("/login");
  }

  return (
    <>
      <nav className="border-b border-slate-800 glass sticky top-0 z-40 bg-slate-950/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-6">
            <span className="text-xl font-black tracking-tighter bg-gradient-to-tr from-blue-400 to-emerald-400 bg-clip-text text-transparent italic">
              BITLAB
            </span>
            <div className="hidden md:flex gap-6 text-[10px] uppercase tracking-widest font-bold">
              <Link href="/dashboard" className="text-white border-b-2 border-blue-500 pb-1">
                Dashboard
              </Link>
              <Link href="/transaksi" className="text-slate-500 hover:text-white transition-colors">
                Transactions
              </Link>
              <Link href="/rebalance" className="text-slate-500 hover:text-white transition-colors">
                Rebalance
              </Link>
              <Link href="/setting" className="text-slate-500 hover:text-white transition-colors">
                Settings
              </Link>
              <button
                type="button"
                onClick={logout}
                className="text-red-500 hover:text-red-400 transition-colors uppercase"
              >
                Logout
              </button>
            </div>
          </div>
          <Button
            size="md"
            className="text-[10px] uppercase tracking-widest font-bold px-4 py-2 rounded-full"
            onClick={syncAllPrices}
          >
            🔄 Update Market (IDR)
          </Button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 md:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
          <Card className="lg:col-span-2 card-grad rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col md:flex-row items-center gap-8">
            <div className="w-40 h-40 sm:w-48 sm:h-48 relative">
              <canvas ref={chartCanvasRef} />
            </div>
            <div className="flex-1 w-full">
              <h2 className="text-sm font-bold mb-4 uppercase tracking-[0.2em] text-slate-500 italic">
                Allocation
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-[10px]">
                {viewRows.map((row, i) => (
                  <div
                    key={row.symbol}
                    className="flex justify-between border-b border-slate-800 pb-1"
                  >
                    <span style={{ color: CHART_COLORS[i % CHART_COLORS.length] }}>
                      ● {row.symbol}
                    </span>
                    <span className="text-slate-500">{row.weight.toFixed(1)}%</span>
                  </div>
                ))}
                {viewRows.length === 0 && (
                  <p className="text-slate-600 text-[11px]">
                    Belum ada data. Tambahkan transaksi terlebih dahulu.
                  </p>
                )}
              </div>
            </div>
          </Card>

          <div className="space-y-4">
            <Card className="card-grad rounded-3xl p-6 shadow-xl">
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">
                Portfolio Balance
              </p>
              <h3 className="text-3xl font-black tracking-tighter">
                {formatIDR(totals.totalVal)}
              </h3>
            </Card>
            <Card className="card-grad rounded-3xl p-6 shadow-xl">
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">
                Unrealized P&amp;L
              </p>
              <div className="flex items-baseline gap-2">
                <h3
                  className={`text-2xl font-black tracking-tighter ${
                    totals.pnl >= 0 ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {formatIDR(totals.pnl)}
                </h3>
                <span
                  className={`text-xs font-bold ${
                    totals.pnl >= 0 ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {totals.pnlPct.toFixed(2)}%
                </span>
              </div>
            </Card>
            <Card className="card-grad rounded-3xl p-6 shadow-xl border-l-4 border-l-blue-500/50">
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">
                Realized P&amp;L
              </p>
              <div className="flex items-baseline gap-2">
                <h3
                  className={`text-2xl font-black tracking-tighter ${
                    totalRealized >= 0 ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {formatIDR(totalRealized)}
                </h3>
              </div>
            </Card>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 px-1">
              Address Book
            </h3>
            <Card className="card-grad rounded-3xl overflow-hidden shadow-xl">
              <div className="divide-y divide-slate-800/50">
                {viewRows.map((row) => (
                  <button
                    type="button"
                    key={row.symbol}
                    className="w-full text-left p-4 hover:bg-slate-800/60 transition-all cursor-pointer group active:bg-blue-900/20"
                    onClick={() => {
                      if (row.wallet && row.wallet !== "---") {
                        navigator.clipboard.writeText(row.wallet);
                      }
                    }}
                  >
                    <div className="text-[9px] font-black text-slate-500 group-hover:text-blue-400 uppercase mb-1 transition-colors">
                      {row.symbol}
                    </div>
                    <div className="text-[11px] text-slate-600 font-mono truncate group-hover:text-slate-300 transition-colors">
                      {row.wallet || "---"}
                    </div>
                  </button>
                ))}
                {viewRows.length === 0 && (
                  <p className="p-6 text-sm text-slate-500">Belum ada wallet tersimpan.</p>
                )}
              </div>
            </Card>
          </div>

          <div className="lg:col-span-3 overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/30 shadow-xl h-fit">
            <table className="w-full text-left text-[11px]">
              <thead className="bg-slate-900/80 text-slate-500 uppercase font-bold tracking-widest">
                <tr>
                  <th className="p-5 text-blue-500">Asset</th>
                  <th className="p-5 text-right">Holdings</th>
                  <th className="p-5 text-right">Avg. Cost</th>
                  <th className="p-5 text-right">Price (IDR)</th>
                  <th className="p-5 text-right">P&amp;L (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {viewRows.map((row) => (
                  <tr key={row.symbol} className="hover:bg-slate-800/20 transition-colors">
                    <td className="p-5 font-bold text-blue-400">{row.symbol}</td>
                    <td className="p-5 text-right font-mono">
                      {row.qty.toLocaleString("id-ID", { maximumFractionDigits: 8 })}
                    </td>
                    <td className="p-5 text-right font-mono text-slate-500">
                      {formatIDR(row.avgPrice)}
                    </td>
                    <td className="p-5 text-right font-mono text-slate-200 font-bold">
                      {formatIDR(row.live)}
                    </td>
                    <td
                      className={`p-5 text-right font-bold ${
                        row.pnl >= 0 ? "text-emerald-400" : "text-red-400"
                      }`}
                    >
                      {formatIDR(row.pnl)}
                      <br />
                      <span className="text-[9px] font-normal opacity-70">
                        {row.pnlPct.toFixed(2)}%
                      </span>
                    </td>
                  </tr>
                ))}
                {!loading && viewRows.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="p-6 text-center text-slate-500 text-[11px] italic"
                    >
                      Belum ada transaksi untuk ditampilkan.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </>
  );
}
