# BITLAB – Crypto Portfolio Tracker

BITLAB adalah aplikasi web untuk melacak portofolio aset kripto dalam satu dashboard terpusat, dengan harga pasar real-time dalam Rupiah (IDR). Aplikasi ini dibangun dengan Next.js dan menggunakan PocketBase sebagai backend.

## Fitur Utama

- **Dashboard Portofolio**
  - Ringkasan nilai total portofolio dalam IDR
  - Visualisasi alokasi aset dengan chart donut (Chart.js)
  - PNL (profit & loss) dan persentase per aset

- **Manajemen Transaksi**
  - Catat transaksi **buy** dan **sell**
  - Riwayat transaksi per aset
  - Perhitungan realized PNL per transaksi

- **Smart Rebalance**
  - Set target persentase alokasi per aset
  - Hitungan otomatis berapa yang perlu dibeli / dijual untuk mencapai target (berbasis IDR)

- **Settings Aset**
  - Tambah aset berdasarkan **CoinGecko ID**
  - Simpan wallet address atau nama exchange

- **Autentikasi**
  - Register & login user via PocketBase
  - Session disimpan di client via PocketBase auth store

## Teknologi

- [Next.js 16](https://nextjs.org/) (App Router)
- [React 18](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Chart.js](https://www.chartjs.org/)
- [PocketBase](https://pocketbase.io/) sebagai backend dan auth

Folder utama aplikasi Next.js:

- `bitlab-next/`

## Menjalankan Secara Lokal

1. **Clone repo**

   ```bash
   git clone https://github.com/<username>/<repo>.git
   cd dashboardCrypto/bitlab-next
   ```

2. **Install dependency**

   ```bash
   npm install
   ```

3. **Set environment variable**

   Buat file `.env.local` di folder `bitlab-next` (sudah dicontohkan di repo):

   ```env
   NEXT_PUBLIC_PB_URL=https://pb.bitlab.web.id
   ```

   Atau ganti dengan URL instance PocketBase kamu sendiri.

4. **Jalankan dev server**

   ```bash
   npm run dev
   ```

   Aplikasi akan berjalan di `http://localhost:3000`.

## Konfigurasi Environment (Vercel)

Untuk deployment di Vercel, set environment variables berikut di Project Settings:

- `NEXT_PUBLIC_PB_URL` – URL instance PocketBase (public, dipakai di client)

Pastikan nilai ini mengarah ke backend PocketBase yang sudah dikonfigurasi dengan koleksi:

- `users`
- `cryptos`
- `transactions`
- `asset_stats`

Struktur koleksi mengikuti skema yang dipakai di kode (misalnya field `symbol`, `coingecko_id`, `wallet_address`, `total_qty`, `target_pct`, dll).

## Script NPM

Di `bitlab-next/package.json` terdapat script:

- `npm run dev` – menjalankan Next.js dev server
- `npm run build` – build aplikasi untuk production
- `npm run start` – menjalankan hasil build
- `npm run lint` – menjalankan linting

## Catatan Pengembangan

- PocketBase diakses langsung dari komponen client (`"use client"`), dengan auto cancellation dimatikan untuk menghindari error pada Next.js 16.
- URL PocketBase **tidak lagi hard-coded** di kode, seluruhnya membaca dari `process.env.NEXT_PUBLIC_PB_URL`.
- Chart donut di dashboard menggunakan `Chart.js` dengan controller `DoughnutController` yang sudah diregistrasi.

## Lisensi

Sesuaikan bagian ini dengan lisensi yang kamu inginkan (misalnya MIT). Saat ini belum ditentukan secara eksplisit.

