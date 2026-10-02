import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { buildCsp } from "@/lib/csp";
import { publicEnv } from "@/lib/env";
import { r2ObjectOrigin } from "@/lib/r2/host";

// Renova a sessão do Supabase a cada requisição. Nenhuma regra de
// visibilidade aqui — quem decide o que o usuário vê é a RLS (CONTRATO §1).
//
// A CSP também nasce aqui, porque o nonce de `script-src` é por requisição
// . O Next lê o nonce do header da REQUEST e o aplica nos
// scripts que ele mesmo injeta; o mesmo valor vai na resposta ao navegador.
// Isso exige renderização dinâmica em todas as rotas (ver app/layout.tsx).
export async function proxy(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  // R2_* são de servidor; aqui só derivam um host público para o `img-src`.
  // Se faltarem (build de CI usa valores fictícios), a CSP fica sem host de
  // imagem e o app acusa o erro de env no primeiro uso do R2, não aqui.
  const csp = buildCsp({
    nonce,
    isDev: process.env.NODE_ENV === "development",
    supabaseUrl: publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    r2Origin: r2ObjectOrigin({
      accountId: process.env.R2_ACCOUNT_ID ?? "",
      bucket: process.env.R2_BUCKET ?? "",
      endpoint: process.env.R2_ENDPOINT || undefined,
    }),
  });
  request.headers.set("x-nonce", nonce);
  request.headers.set("content-security-policy", csp);

  let response = NextResponse.next({ request });
  response.headers.set("content-security-policy", csp);

  const supabase = createServerClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          response.headers.set("content-security-policy", csp);
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    }
  );

  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|gif)$).*)"],
};
