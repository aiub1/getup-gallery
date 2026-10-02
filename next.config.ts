import type { NextConfig } from "next";

// Só desenvolvimento: hosts extras (ex.: o IP da rede, para abrir o `next dev`
// no celular) que podem acessar /_next/*. Sem isso o Next bloqueia esses
// recursos e a página chega sem JS. Lista separada por vírgula.
const devOrigins = (process.env.DEV_ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  allowedDevOrigins: devOrigins,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          // A Content-Security-Policy não fica aqui: ela leva um nonce por
          // requisição e é montada em proxy.ts (lib/csp.ts, docs/adr/0003).
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
    ];
  },
};

export default nextConfig;
