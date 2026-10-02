"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { login, type FormState } from "@/lib/auth/actions";

export function LoginForm() {
  const [state, formAction, pending] = useActionState<FormState, FormData>(login, null);

  return (
    <form action={formAction} className="flex flex-col gap-[18px]">
      <Input label="E-mail" type="email" name="email" autoComplete="username" defaultValue={state?.email ?? ""} required autoFocus />
      <Input label="Senha" type="password" name="password" autoComplete="current-password" required />
      {state?.error && (
        <p role="alert" className="m-0 text-body-sm text-red-3">
          {state.error}
        </p>
      )}
      <Button type="submit" variant="primary" size="lg" fullWidth disabled={pending}>
        {pending ? "Entrando…" : "Entrar"}
      </Button>
    </form>
  );
}
