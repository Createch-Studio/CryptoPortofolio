import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "BITLAB",
  description: "Crypto portfolio tracker in IDR"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id">
      <body className="bg-[#020617] text-slate-100 overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}
