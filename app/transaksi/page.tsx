"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PocketBase from "pocketbase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const pb = new PocketBase(process.env.NEXT_PUBLIC_PB_URL || "");
pb.autoCancellation(false);

type Coin = {
  id: string;
  symbol: string;
  name: string;
  coingecko_id?: string;
};

type TxItem = {
  id: string;
  created: string;
  type: "buy" | "sell";
  amount: number;
  price_at_date: number;
  realized_pnl?: number | null;
  price_at_sale?: number | null;
  coin: Coin;
};

type TxFilter = {
  from?: string;
  to?: string;
};

function formatIDR(val: number) {
  return val.toLocaleString("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0
  });
}

export default function TransaksiPage() {
  const router = useRouter();
  const [coins, setCoins] = useState<Coin[]>([]);
  const [search, setSearch] = useState("");
  const [type, setType] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("");
  const [price, setPrice] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);
  const [history, setHistory] = useState<TxItem[]>([]);
  const [filter, setFilter] = useState<TxFilter>({});
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (!pb.authStore.isValid) {
      router.replace("/login");
      return;
    }
    loadCoins();
    loadHistory();
  }, [router]);

  const filteredCoins = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return coins;
    return coins.filter(
      (c) => c.symbol.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)
    );
  }, [coins, search]);

  const [selectedCoinId, setSelectedCoinId] = useState<string | undefined>();

  useEffect(() => {
    if (!selectedCoinId && filteredCoins.length > 0) {
      setSelectedCoinId(filteredCoins[0].id);
    }
  }, [filteredCoins, selectedCoinId]);

  async function loadCoins() {
    try {
      const list = await pb.collection("cryptos").getFullList({
        sort: "symbol"
      });
      setCoins(
        list.map((c: any) => ({
          id: c.id,
          symbol: c.symbol,
          name: c.name,
          coingecko_id: c.coingecko_id
        }))
      );
    } catch (err: any) {
      if (err?.isAbort) return;
      console.error(err);
    }
  }

  async function loadHistory(nextFilter?: TxFilter) {
    if (!pb.authStore.isValid) return;
    const userId = pb.authStore.model?.id;
    if (!userId) return;
    setLoadingHistory(true);
    try {
      const f = nextFilter ?? filter;
      let filterStr = `user = "${userId}"`;
      if (f.from && f.to) {
        filterStr += ` && created >= "${f.from}" && created <= "${f.to}"`;
      }
      const res = await pb.collection("transactions").getList(1, 50, {
        expand: "coin",
        sort: "-created",
        filter: filterStr
      });
      setHistory(
        res.items.map((tx: any) => ({
          id: tx.id,
          created: tx.created,
          type: tx.type,
          amount: tx.amount,
          price_at_date: tx.price_at_date,
          price_at_sale: tx.price_at_sale,
          realized_pnl: tx.realized_pnl,
          coin: tx.expand.coin
        }))
      );
    } catch (err: any) {
      if (err?.isAbort) return;
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  }

  function setThisMonth() {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split("T")[0]
      .concat(" 00:00:00");
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      .toISOString()
      .split("T")[0]
      .concat(" 23:59:59");
    const next = { from, to };
    setFilter(next);
    loadHistory(next);
  }

  function resetFilter() {
    setFilter({});
    loadHistory({});
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selectedCoinId) return;
    if (!pb.authStore.isValid) {
      router.replace("/login");
      return;
    }
    const userId = pb.authStore.model?.id;
    if (!userId) return;
    setSubmitLoading(true);
    try {
      const amountNum = parseFloat(amount);
      const priceNum = parseFloat(price);
      const statsFilter = `coin="${selectedCoinId}" && user="${userId}"`;
      let statsRecord: any = null;
      try {
        statsRecord = await pb.collection("asset_stats").getFirstListItem(statsFilter);
      } catch {
        statsRecord = null;
      }

      const payload: any = {
        user: userId,
        coin: selectedCoinId,
        type,
        amount: amountNum,
        price_at_date: priceNum
      };

      const updatedStats: any = { coin: selectedCoinId, user: userId };

      if (type === "buy") {
        const oldQty = statsRecord ? statsRecord.total_qty : 0;
        const oldCost = statsRecord ? statsRecord.total_cost : 0;
        updatedStats.total_qty = oldQty + amountNum;
        updatedStats.total_cost = oldCost + amountNum * priceNum;
        updatedStats.avg_buy_price = updatedStats.total_cost / updatedStats.total_qty;
      } else {
        if (!statsRecord || statsRecord.total_qty < amountNum) {
          throw new Error("Saldo tidak mencukupi!");
        }
        payload.price_at_sale = priceNum;
        payload.realized_pnl = (priceNum - statsRecord.avg_buy_price) * amountNum;
        updatedStats.total_qty = statsRecord.total_qty - amountNum;
        updatedStats.total_cost = updatedStats.total_qty * statsRecord.avg_buy_price;
        updatedStats.avg_buy_price = statsRecord.avg_buy_price;
      }

      await pb.collection("transactions").create(payload);
      if (statsRecord) {
        await pb.collection("asset_stats").update(statsRecord.id, updatedStats);
      } else {
        await pb.collection("asset_stats").create(updatedStats);
      }

      setAmount("");
      setPrice("");
      setType("buy");
      loadCoins();
      loadHistory();
    } catch (err: any) {
      if (err?.isAbort) return;
      alert(err.message || "Gagal menyimpan transaksi");
    } finally {
      setSubmitLoading(false);
    }
  }

  async function deleteTx(id: string) {
    if (!window.confirm("Hapus transaksi? Statistik aset akan dikalkulasi ulang.")) return;
    if (!pb.authStore.isValid) return;
    const userId = pb.authStore.model?.id;
    if (!userId) return;
    try {
      const tx = await pb.collection("transactions").getOne(id);
      const stats = await pb
        .collection("asset_stats")
        .getFirstListItem(`coin="${tx.coin}" && user="${userId}"`);
      const updated: any = { ...stats };
      if (tx.type === "buy") {
        updated.total_qty = stats.total_qty - tx.amount;
        updated.total_cost = stats.total_cost - tx.amount * tx.price_at_date;
      } else {
        updated.total_qty = stats.total_qty + tx.amount;
        updated.total_cost = stats.total_cost + tx.amount * stats.avg_buy_price;
      }
      updated.avg_buy_price = updated.total_qty > 0 ? updated.total_cost / updated.total_qty : 0;
      await pb.collection("asset_stats").update(stats.id, updated);
      await pb.collection("transactions").delete(id);
      loadHistory();
    } catch (err: any) {
      if (err?.isAbort) return;
      alert("Error deleting: " + (err.message || "unknown"));
    }
  }

  function logout() {
    pb.authStore.clear();
    router.replace("/login");
  }

  return (
    <>
      <nav className="border-b border-slate-800 glass sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-6">
            <span className="text-xl font-black tracking-tighter text-blue-400 italic">
              BITLAB
            </span>
            <div className="hidden md:flex gap-6 text-[10px] uppercase tracking-widest font-bold">
              <Link href="/dashboard" className="text-slate-500 hover:text-white transition-colors">
                Dashboard
              </Link>
              <Link href="/transaksi" className="text-white border-b-2 border-blue-500 pb-1">
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
                className="text-red-500 hover:text-red-400 transition-all uppercase"
              >
                Logout
              </button>
            </div>
          </div>
          <div className="hidden md:block text-[10px] font-mono text-slate-500 uppercase tracking-widest">
            Transaction Engine v2.9 (Auth Mode)
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 md:py-10">
        <div className="flex flex-col lg:flex-row gap-10">
          <section className="lg:w-1/3">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl sticky top-24">
              <h2 className="text-2xl font-bold mb-6 italic">Input Record</h2>
              <form className="space-y-5" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label>Aset Kripto</Label>
                    <span className="text-[9px] text-blue-500">Cari Simbol/Nama</span>
                  </div>
                  <Input
                    placeholder="Ketik BTC atau Bitcoin..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="rounded-t-xl rounded-b-none border-b-0"
                  />
                  <div className="max-h-40 overflow-y-auto border border-slate-800 rounded-b-xl bg-slate-950">
                    {filteredCoins.map((c) => (
                      <button
                        type="button"
                        key={c.id}
                        className={`w-full text-left px-3 py-2 text-sm border-b border-slate-800/50 hover:bg-blue-600/30 ${
                          selectedCoinId === c.id ? "bg-blue-600/40 text-white" : ""
                        }`}
                        onClick={() => setSelectedCoinId(c.id)}
                      >
                        {c.symbol.toUpperCase()} - {c.name}
                      </button>
                    ))}
                    {filteredCoins.length === 0 && (
                      <p className="px-3 py-2 text-[11px] text-slate-500">
                        Tidak ada aset, tambahkan di halaman Settings.
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Tipe Transaksi</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant={type === "buy" ? "default" : "outline"}
                      className={
                        type === "buy"
                          ? "py-3 rounded-xl border-2 border-emerald-500/60 bg-emerald-500/10 text-emerald-400"
                          : "py-3 rounded-xl border-2"
                      }
                      onClick={() => setType("buy")}
                    >
                      BELI (BUY)
                    </Button>
                    <Button
                      type="button"
                      variant={type === "sell" ? "default" : "outline"}
                      className={
                        type === "sell"
                          ? "py-3 rounded-xl border-2 border-red-500/60 bg-red-500/10 text-red-400"
                          : "py-3 rounded-xl border-2"
                      }
                      onClick={() => setType("sell")}
                    >
                      JUAL (SELL)
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label>Jumlah (Amount)</Label>
                    <Input
                      type="number"
                      step="any"
                      placeholder="Contoh: 0.005"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label>
                        {type === "buy"
                          ? "Harga Beli Per Unit (IDR)"
                          : "Harga Jual (Price at Sale) (IDR)"}
                      </Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-[9px] font-black bg-blue-400/10 px-2 py-1 rounded-md"
                        onClick={async () => {
                          if (!selectedCoinId) {
                            alert("Pilih aset dulu");
                            return;
                          }
                          const selected = coins.find((c) => c.id === selectedCoinId);
                          if (!selected) return;
                          const cgId =
                            selected.coingecko_id ||
                            selected.name.toLowerCase().replace(/\s+/g, "-");
                          try {
                            const res = await fetch(
                              `https://api.coingecko.com/api/v3/simple/price?ids=${cgId}&vs_currencies=idr`
                            );
                            const data = await res.json();
                            if (data[cgId]) {
                              setPrice(String(data[cgId].idr));
                            }
                          } catch {
                            alert("Gagal fetch harga.");
                          }
                        }}
                      >
                        ⚡ Get Live Price
                      </Button>
                    </div>
                    <Input
                      type="number"
                      step="any"
                      placeholder="Harga dalam Rupiah"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full h-11 mt-2" disabled={submitLoading}>
                  {submitLoading ? "Memproses..." : "Simpan Transaksi"}
                </Button>
              </form>
            </div>
          </section>

          <section className="lg:w-2/3">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 mb-8 flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-[200px]">
                <Label className="block mb-2">Filter Rentang Tanggal (YYYY-MM-DD)</Label>
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={filter.from?.slice(0, 10) || ""}
                    onChange={(e) => {
                      const from = e.target.value
                        ? `${e.target.value} 00:00:00`
                        : undefined;
                      const next = { ...filter, from };
                      setFilter(next);
                    }}
                  />
                  <Input
                    type="date"
                    value={filter.to?.slice(0, 10) || ""}
                    onChange={(e) => {
                      const to = e.target.value ? `${e.target.value} 23:59:59` : undefined;
                      const next = { ...filter, to };
                      setFilter(next);
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => loadHistory()}
                  >
                    Terapkan
                  </Button>
                </div>
              </div>
              <div className="flex items-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={setThisMonth}>
                  Bulan Ini
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-slate-400 hover:text-red-400"
                  onClick={resetFilter}
                >
                  Reset
                </Button>
              </div>
            </div>

            <div className="flex justify-between items-center mb-4 px-2">
              <h2 className="text-xl font-bold italic text-slate-200">
                Riwayat Transaksi Saya
              </h2>
              <p className="text-slate-500 text-[10px] font-mono uppercase">
                {history.length} records
              </p>
            </div>

            <div className="bg-slate-900/50 border border-slate-800 rounded-3xl overflow-hidden backdrop-blur-sm shadow-2xl">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-slate-900 text-slate-500 uppercase font-bold tracking-widest border-b border-slate-800">
                  <tr>
                    <th className="p-5">Waktu</th>
                    <th className="p-5">Aset</th>
                    <th className="p-5">Tipe</th>
                    <th className="p-5 text-right">Jumlah</th>
                    <th className="p-5 text-right">Total Nilai</th>
                    <th className="p-5 text-right">Realisasi P/L</th>
                    <th className="p-5 text-center" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {history.map((tx) => {
                    const pnl = tx.realized_pnl || 0;
                    return (
                      <tr
                        key={tx.id}
                        className="hover:bg-slate-800/30 transition-colors group text-white"
                      >
                        <td className="p-5 text-slate-500 font-mono">
                          {new Date(tx.created).toLocaleString("id-ID")}
                        </td>
                        <td className="p-5 font-bold text-blue-400">
                          {tx.coin?.symbol?.toUpperCase() || "---"}
                        </td>
                        <td className="p-5">
                          <span
                            className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                              tx.type === "buy"
                                ? "bg-emerald-500/10 text-emerald-500"
                                : "bg-red-500/10 text-red-500"
                            }`}
                          >
                            {tx.type === "buy" ? "BELI" : "JUAL"}
                          </span>
                        </td>
                        <td className="p-5 text-right font-mono">{tx.amount}</td>
                        <td className="p-5 text-right font-mono font-bold">
                          {formatIDR(tx.amount * tx.price_at_date)}
                        </td>
                        <td
                          className={`p-5 text-right font-mono font-bold ${
                            pnl >= 0 ? "text-emerald-400" : "text-red-400"
                          }`}
                        >
                          {tx.type === "sell" ? formatIDR(pnl) : "-"}
                        </td>
                        <td className="p-5 text-center">
                          <button
                            type="button"
                            onClick={() => deleteTx(tx.id)}
                            className="text-slate-700 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {!loadingHistory && history.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        className="p-6 text-center text-slate-500 text-[11px] italic"
                      >
                        Belum ada transaksi untuk rentang ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
