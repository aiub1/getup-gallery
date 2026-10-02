// PUT direto no R2 com XMLHttpRequest (fetch não expõe progresso de envio).
// O Content-Length é calculado pelo navegador a partir do Blob; ele e o
// Content-Type estão dentro da assinatura (lib/r2/sign-upload.ts).

export class PutError extends Error {
  constructor(
    message: string,
    readonly status: number | null,
  ) {
    super(message);
  }
}

export function putBlob(
  url: string,
  blob: Blob,
  contentType: string,
  onProgress: (loaded: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.upload.onprogress = (event) => onProgress(event.loaded);
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(blob.size);
        resolve();
      } else {
        reject(
          new PutError(`O armazenamento recusou o arquivo (HTTP ${xhr.status}): ${xhr.responseText.slice(0, 200)}`, xhr.status),
        );
      }
    };
    // Sem detalhe do navegador: um XHR bloqueado por CORS e um sem rede são
    // indistinguíveis aqui. Por isso a mensagem cita o host e as duas causas.
    xhr.onerror = () =>
      reject(
        new PutError(
          `Falha de rede ao enviar para ${new URL(url).host} (CORS do bucket para ${location.origin} ou conexão).`,
          null,
        ),
      );
    xhr.onabort = () => reject(new PutError("Envio cancelado.", null));
    xhr.send(blob);
  });
}
