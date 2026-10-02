type SupabaseAuthErrorLike = {
  code?: string | null;
  status?: number | null;
  message?: string;
};

const GENERIC_MESSAGE = "Não foi possível concluir. Tente novamente.";
const INVALID_CREDENTIALS_MESSAGE = "E-mail ou senha incorretos.";
const RATE_LIMIT_MESSAGE = "Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo.";

// Nunca repassa error.message do Supabase direto pro usuário: pode revelar
// se o e-mail existe ou detalhes internos. Login inválido é sempre a mesma
// frase, exista ou não a conta.
export function authErrorMessage(error: unknown): string {
  const err = error as SupabaseAuthErrorLike | undefined;
  const code = err?.code ?? undefined;
  const status = err?.status ?? undefined;

  if (code === "invalid_credentials" || code === "user_not_found") {
    return INVALID_CREDENTIALS_MESSAGE;
  }

  if (code === "over_request_rate_limit" || code === "over_email_send_rate_limit" || status === 429) {
    return RATE_LIMIT_MESSAGE;
  }

  return GENERIC_MESSAGE;
}
