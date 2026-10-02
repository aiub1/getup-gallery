// Endereços do bucket R2. Sem "server-only" e sem ler ambiente: o `proxy.ts`
// (CSP) e o cliente S3 (`lib/r2/client.ts`) precisam concordar sobre a origem,
// e é este módulo puro que os mantém alinhados.

export type R2Location = { accountId: string; bucket: string; endpoint?: string | undefined };

export function r2Endpoint({ accountId, endpoint }: R2Location): string {
  return endpoint || `https://${accountId}.r2.cloudflarestorage.com`;
}

/** Só com endpoint alternativo (MinIO local): bucket no caminho, não no host. */
export function r2ForcePathStyle({ endpoint }: R2Location): boolean {
  return Boolean(endpoint);
}

// No R2 o S3Client usa endereçamento virtual-hosted (bucket como subdomínio),
// que é o que o presigner emite; a CSP autoriza exatamente essa origem.
export function r2ObjectOrigin(location: R2Location): string {
  if (location.endpoint) return new URL(location.endpoint).origin;
  return `https://${location.bucket}.${location.accountId}.r2.cloudflarestorage.com`;
}
