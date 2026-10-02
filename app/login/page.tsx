import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/auth/session";
import { Wordmark } from "@/components/brand/Wordmark";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Entrar · GetUp 2026" };

export default async function LoginPage() {
  if ((await getViewer()).signedIn) redirect("/");

  return (
    <main className="relative mx-auto flex min-h-dvh w-full max-w-[400px] flex-col justify-center px-[var(--gutter-page)] py-[48px]">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-0 h-[320px] bg-[radial-gradient(60%_100%_at_50%_0%,rgba(242,106,43,.16),transparent)]"
      />
      <div className="relative flex flex-col items-center text-center">
        <h1 className="m-0">
          <Wordmark size="lg" />
        </h1>
        <p className="mb-0 mt-[14px] text-micro font-semibold tracking-[var(--ls-eyebrow)] text-text-muted">GetUp 2026</p>
      </div>
      <div className="relative mt-[44px] rounded-[var(--radius-card)] border border-border-hairline bg-surface-sunken p-[20px]">
        <p className="mb-[18px] mt-0 border-b border-border-hairline pb-[14px] text-center text-micro font-bold uppercase tracking-[var(--ls-eyebrow)] text-text-muted">
          Acesso restrito
        </p>
        <LoginForm />
      </div>
      <p className="relative mb-0 mt-[24px] text-center text-body-sm">
        <Link href="/" className="border-0 text-text-muted hover:text-text-strong">
          ← Voltar para a galeria
        </Link>
      </p>
    </main>
  );
}
