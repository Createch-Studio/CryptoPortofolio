"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PocketBase from "pocketbase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const pb = new PocketBase(process.env.NEXT_PUBLIC_PB_URL || "");
pb.autoCancellation(false);

type UserCoin = {
  id: string;
  symbol: string;
  name: string;
  wallet_address?: string;
};

export default function SettingPage() {
  const router = useRouter();
  const [coins, setCoins] = useState<UserCoin[]>([]);
  const [symbol, setSymbol] = useState("");
  const [coingeckoId, setCoingeckoId] = useState("");
  const [wallet, setWallet] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!pb.authStore.isValid) {
      router.replace("/login");
      return;
    }
    loadCoins();
  }, [router]);

  async function loadCoins() {
    const userId = pb.authStore.model?.id;
    if (!userId) return;
    try {
      const list = await pb.collection("cryptos").getFullList({
        filter: `user = "${userId}"`,
        sort: "-created"
      });
      setCoins(
        list.map((c: any) => ({
          id: c.id,
          symbol: c.symbol,
          name: c.name,
          wallet_address: c.wallet_address
        }))
      );
    } catch (err: any) {
      if (err?.isAbort) return;
      console.error(err);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!pb.authStore.isValid) {
      router.replace("/login");
      return;
    }
    const userId = pb.authStore.model?.id;
    if (!userId) return;
    setSaving(true);
    try {
      const cgId = coingeckoId.toLowerCase().trim();
      await pb.collection("cryptos").create({
        user: userId,
        symbol: symbol.trim(),
        name: cgId,
        coingecko_id: cgId,
        wallet_address: wallet.trim(),
        current_price: 0,
        target_pct: 0
      });
      setSymbol("");
      setCoingeckoId("");
      setWallet("");
      loadCoins();
    } catch (err: any) {
      if (err?.isAbort) return;
      alert("Gagal menambah aset: " + (err.message || "unknown"));
    } finally {
      setSaving(false);
    }
  }

  async function deleteCoin(id: string) {
    if (
      !window.confirm(
        "Hapus aset ini? Riwayat transaksi koin ini mungkin tidak akan terbaca dengan benar."
      )
    ) {
      return;
    }
    try {
      await pb.collection("cryptos").delete(id);
      loadCoins();
    } catch (err: any) {
      if (err?.isAbort) return;
      alert("Gagal menghapus: " + (err.message || "unknown"));
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
              <Link href="/transaksi" className="text-slate-500 hover:text-white transition-colors">
                Transactions
              </Link>
              <Link href="/rebalance" className="text-slate-500 hover:text-white transition-colors">
                Rebalance
              </Link>
              <Link href="/setting" className="text-white border-b-2 border-blue-500 pb-1">
                Settings
              </Link>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-[10px] font-bold text-red-500 hover:text-red-400 uppercase tracking-widest"
            onClick={logout}
          >
            Logout
          </Button>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 md:py-10">
        <div className="mb-10">
          <h2 className="text-3xl font-black italic text-blue-400">Settings</h2>
          <p className="text-slate-500 text-sm">
            Kelola daftar aset personal Anda berdasarkan ID CoinGecko.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          <section className="md:col-span-1">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sticky top-24 shadow-2xl">
              <h3 className="text-lg font-bold mb-6 italic">Tambah Aset Baru</h3>
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="space-y-1">
                  <Label htmlFor="coin-symbol">Simbol (Contoh: BTC)</Label>
                  <Input
                    id="coin-symbol"
                    placeholder="BTC"
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                    required
                    className="uppercase"
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">
                      CoinGecko ID
                    </span>
                    <a
                      href="https://www.coingecko.com"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[9px] text-blue-500 hover:underline"
                    >
                      Cari ID ↗
                    </a>
                  </div>
                  <Input
                    id="coingecko-id"
                    placeholder="bitcoin"
                    value={coingeckoId}
                    onChange={(e) => setCoingeckoId(e.target.value)}
                    required
                  />
                  <p className="text-[9px] text-slate-600 px-1 italic">
                    *ID ini akan disimpan sebagai nama aset.
                  </p>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="wallet-address">Wallet Address</Label>
                  <Input
                    id="wallet-address"
                    placeholder="0x... atau Nama Exchange"
                    value={wallet}
                    onChange={(e) => setWallet(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full h-10 mt-2" disabled={saving}>
                  {saving ? "Saving..." : "Simpan Aset"}
                </Button>
              </form>
            </div>
          </section>

          <section className="md:col-span-2">
            <div className="bg-slate-900/50 border border-slate-800 rounded-3xl overflow-hidden backdrop-blur-sm">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-slate-900 text-slate-500 uppercase font-bold tracking-widest border-b border-slate-800">
                  <tr>
                    <th className="p-5">Asset / ID</th>
                    <th className="p-5">Wallet Address</th>
                    <th className="p-5 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {coins.map((c) => (
                    <tr
                      key={c.id}
                      className="hover:bg-slate-800/30 transition-colors group"
                    >
                      <td className="p-5">
                        <div className="font-bold text-blue-400 text-sm">
                          {c.symbol.toUpperCase()}
                        </div>
                        <div className="text-slate-500 font-mono text-[10px]">{c.name}</div>
                      </td>
                      <td className="p-5 font-mono text-slate-400 truncate max-w-[200px]">
                        {c.wallet_address || (
                          <span className="italic text-slate-800">None</span>
                        )}
                      </td>
                      <td className="p-5 text-center">
                        <button
                          type="button"
                          onClick={() => deleteCoin(c.id)}
                          className="text-slate-700 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                        >
                          🗑️ Hapus
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {coins.length === 0 && (
                <div className="p-10 text-center text-slate-600 italic">
                  Belum ada aset yang ditambahkan.
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
