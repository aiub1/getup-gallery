"use server";

import { redirect } from "next/navigation";
import { authErrorMessage } from "@/lib/auth/errors";
import { createClient } from "@/lib/supabase/server";

// `email` volta para o formulário: o React limpa os campos depois de uma action.
export type FormState = { error: string; email: string } | null;

export async function login(_prevState: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    console.error("login failed", error.code ?? error.status);
    return { error: authErrorMessage(error), email };
  }

  redirect("/");
}

export async function logout(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
