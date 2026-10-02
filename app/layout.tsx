import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import { connection } from "next/server";
import "./globals.css";

// Archivo variável com o eixo de largura: o logotipo usa a versão expandida.
const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-archivo",
  display: "swap",
});

export const metadata: Metadata = {
  title: "GetUp 2026 · Poiema CWB",
  description: "Fotos do GetUp 2026, sessões I a V. Veja e baixe as suas.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // A CSP usa um nonce por requisição (proxy.ts). O Next só injeta o nonce em
  // páginas renderizadas por requisição — página estática ficaria sem nonce e
  // seus scripts seriam bloqueados. As páginas já são dinâmicas de qualquer forma:
  // as URLs das fotos são assinadas a cada requisição.
  await connection();

  return (
    <html lang="pt-BR" className={archivo.variable}>
      <body>{children}</body>
    </html>
  );
}
