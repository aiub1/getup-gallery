import { describe, expect, it } from "vitest";
import { authErrorMessage } from "./errors";

describe("authErrorMessage", () => {
  it("mapeia credenciais inválidas pra mensagem genérica, sem revelar se o e-mail existe", () => {
    expect(authErrorMessage({ code: "invalid_credentials" })).toBe("E-mail ou senha incorretos.");
    expect(authErrorMessage({ code: "user_not_found" })).toBe("E-mail ou senha incorretos.");
  });

  it("mapeia limite de tentativas", () => {
    expect(authErrorMessage({ code: "over_request_rate_limit" })).toBe(
      "Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo."
    );
    expect(authErrorMessage({ status: 429 })).toBe(
      "Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo."
    );
  });

  it("usa mensagem genérica de fallback para erros desconhecidos", () => {
    expect(authErrorMessage({ code: "weak_password", message: "Password too weak" })).toBe(
      "Não foi possível concluir. Tente novamente."
    );
    expect(authErrorMessage(undefined)).toBe("Não foi possível concluir. Tente novamente.");
    expect(authErrorMessage(new Error("something"))).toBe("Não foi possível concluir. Tente novamente.");
  });

  it("nunca ecoa error.message cru", () => {
    const message = authErrorMessage({ message: "user with email foo@bar.com not found in database" });
    expect(message).not.toContain("foo@bar.com");
  });
});
