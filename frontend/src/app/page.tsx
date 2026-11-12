import type { Metadata } from "next";
// Fuentes guardadas dentro del proyecto (paquete `geist`), no desde Google Fonts.
// Así el sistema se puede compilar y usar sin internet (RN-01).
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mercadito Daniela",
  description: "Sistema de cobros e inventario de Mercadito Daniela",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}