"use client";

import { Button } from "@/components/ui/Button";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[var(--max-narrow)] flex-col items-center justify-center gap-[20px] px-[var(--gutter-page)] text-center">
      <h1 className="m-0 text-[18px] font-bold uppercase tracking-[var(--ls-label)] text-text-strong">
        Não deu para abrir a galeria
      </h1>
      <p className="m-0 text-body-md text-text-muted">Foi uma falha do nosso lado. Tente de novo em instantes.</p>
      <Button variant="primary" size="md" onClick={reset}>
        Tentar de novo
      </Button>
    </main>
  );
}
