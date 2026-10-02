"use client";

import { useRouter } from "next/navigation";
import { useEffect, useReducer, useRef, useState, type DragEvent } from "react";
import { confirmUpload, prepareUpload } from "@/app/actions";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Select } from "@/components/ui/Select";
import type { GallerySession } from "@/lib/gallery/types";
import { ACCEPTED_SOURCE_TYPES } from "@/lib/upload/limits";
import { createSerialRunner, MAX_PARALLEL_PHOTOS, runPhotoJob, runPool, type ConfirmBody } from "@/lib/upload/pipeline";
import { canEncodeWebp, processImage, validateSourceFile } from "@/lib/upload/process-image";
import { putBlob } from "@/lib/upload/put-blob";

type Item = {
  id: string;
  file: File;
  state: "idle" | "processing" | "uploading" | "confirming" | "done" | "error";
  progress: number;
  error: string | null;
  /** arquivos já no R2; falta só confirmar */
  resume?: ConfirmBody;
};

type Action =
  | { type: "add"; items: Item[] }
  | { type: "patch"; id: string; patch: Partial<Item> }
  | { type: "remove"; id: string }
  | { type: "clearDone" };

function reducer(items: Item[], action: Action): Item[] {
  switch (action.type) {
    case "add":
      return [...items, ...action.items];
    case "patch":
      return items.map((item) => (item.id === action.id ? { ...item, ...action.patch } : item));
    case "remove":
      return items.filter((item) => item.id !== action.id);
    case "clearDone":
      return items.filter((item) => item.state !== "done");
  }
}

// crypto.randomUUID só existe em contexto seguro; getRandomValues sempre.
function newItemId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

const STATE_LABEL: Record<Item["state"], string> = {
  idle: "Na fila",
  processing: "Preparando…",
  uploading: "Enviando",
  confirming: "Publicando…",
  done: "Publicada",
  error: "Erro",
};

const isBusy = (item: Item) => item.state === "processing" || item.state === "uploading" || item.state === "confirming";

export function UploadPanel({
  eventId,
  sessions,
  defaultSessionId,
  onClose,
}: {
  eventId: string;
  sessions: GallerySession[];
  defaultSessionId: string | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [sessionId, setSessionId] = useState(defaultSessionId ?? "");
  const [items, dispatch] = useReducer(reducer, []);
  const [rejected, setRejected] = useState<string[]>([]);
  const [webp, setWebp] = useState<"checking" | "ok" | "unsupported">("checking");
  const [dragging, setDragging] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const serial = useRef(createSerialRunner());

  const busy = publishing || items.some(isBusy);
  const waiting = items.filter((item) => item.state === "idle" || item.state === "error");
  const done = items.filter((item) => item.state === "done").length;
  const needsSession = sessions.length > 0 && sessionId === "";
  const canPublish = !busy && webp === "ok" && waiting.length > 0 && !needsSession;

  useEffect(() => {
    let alive = true;
    canEncodeWebp().then((ok) => alive && setWebp(ok ? "ok" : "unsupported"));
    return () => {
      alive = false;
    };
  }, []);

  // Avisar antes de fechar a aba com envio em andamento.
  useEffect(() => {
    if (!busy) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [busy]);

  function addFiles(files: FileList | File[]) {
    const accepted: Item[] = [];
    const refused: string[] = [];
    for (const file of Array.from(files)) {
      const problem = validateSourceFile(file);
      if (problem) refused.push(`${file.name}: ${problem}`);
      else accepted.push({ id: newItemId(), file, state: "idle", progress: 0, error: null });
    }
    setRejected(refused);
    if (accepted.length > 0) dispatch({ type: "add", items: accepted });
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    if (!busy) addFiles(event.dataTransfer.files);
  }

  async function publish() {
    if (!canPublish) return;
    const target = sessionId || null;
    setPublishing(true);

    await runPool(waiting, MAX_PARALLEL_PHOTOS, async (item) => {
      dispatch({ type: "patch", id: item.id, patch: { state: "processing", progress: 0, error: null } });
      const outcome = await runPhotoJob(
        {
          clientId: item.id,
          file: item.file,
          eventId,
          sessionId: target,
          // Decisão do dono: o GetUp não terá menores, então não há pergunta no envio.
          containsMinors: false,
          isPrivate: false,
          ...(item.resume ? { resume: item.resume } : {}),
        },
        {
          // Conversão: uma foto por vez, para não travar a página.
          process: (file) => serial.current(() => processImage(file)),
          prepare: prepareUpload,
          confirm: confirmUpload,
          put: putBlob,
        },
        (stage, progress) => dispatch({ type: "patch", id: item.id, patch: { state: stage, progress: progress ?? 0 } }),
      );
      dispatch({
        type: "patch",
        id: item.id,
        patch: outcome.ok
          ? { state: "done", progress: 1, error: null }
          : { state: "error", error: outcome.error, ...(outcome.resume ? { resume: outcome.resume } : {}) },
      });
    });

    setPublishing(false);
    router.refresh();
  }

  return (
    <section aria-label="Enviar fotos" className="rounded-[var(--radius-card)] border border-border-hairline bg-surface-card p-[20px] sm:p-[28px]">
      <div className="mb-[20px] flex items-start justify-between gap-[16px]">
        <h2 className="m-0 text-micro font-bold uppercase tracking-[var(--ls-eyebrow)] text-text-muted">Publicar fotos</h2>
        <Button variant="ghost" size="sm" onClick={onClose} disabled={busy}>
          Fechar
        </Button>
      </div>

      {webp === "unsupported" && (
        <p role="alert" className="mb-[20px] mt-0 bg-clay-1 p-[14px] text-body-sm text-clay-5">
          Este navegador não consegue gerar imagens WebP. Use o Chrome, o Edge ou o Firefox para enviar.
        </p>
      )}

      <div className="grid gap-[24px]">
        <Select
          label="Sessão"
          name="session"
          value={sessionId}
          onChange={(event) => setSessionId(event.target.value)}
          disabled={busy}
          options={[{ value: "", label: "Escolha a sessão" }, ...sessions.map((s) => ({ value: s.id, label: s.name }))]}
        />

      </div>

      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={
          "mt-[24px] flex flex-col items-center gap-[12px] rounded-[var(--radius-card)] border border-dashed px-[20px] py-[32px] text-center transition-[var(--transition-control)] " +
          (dragging ? "border-clay-3 bg-clay-1" : "border-paper-4 bg-surface-sunken")
        }
      >
        <Icon name="upload-cloud" size={28} className="text-ink-4" />
        <p className="m-0 text-body-sm text-text-muted">Solte as fotos aqui ou selecione do computador. JPG ou PNG, até 50 MB cada.</p>
        <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={busy}>
          Selecionar fotos
        </Button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED_SOURCE_TYPES.join(",")}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(event) => {
            if (event.target.files) addFiles(event.target.files);
            event.target.value = "";
          }}
        />
      </div>

      {rejected.length > 0 && (
        <ul role="alert" className="mb-0 mt-[12px] list-none p-0 text-body-sm text-red-3">
          {rejected.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      )}

      {items.length > 0 && (
        <ul className="mb-0 mt-[20px] max-h-[320px] list-none overflow-y-auto rounded-[var(--radius-card)] border border-border-hairline p-0">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-[12px] border-b border-border-hairline px-[14px] py-[10px] last:border-b-0">
              <div className="min-w-0 flex-1">
                <p className="m-0 truncate text-body-sm text-text-strong">{item.file.name}</p>
                {item.state === "uploading" && (
                  <div className="mt-[6px] h-[3px] bg-paper-3" aria-hidden="true">
                    <div className="h-full bg-clay-3 transition-[width]" style={{ width: `${Math.round(item.progress * 100)}%` }} />
                  </div>
                )}
                {item.error && <p className="m-0 text-body-sm text-red-3">{item.error}</p>}
              </div>
              <span
                className={`shrink-0 font-ui text-micro font-bold uppercase tracking-[var(--ls-label)] tabular-nums ${
                  item.state === "done" ? "text-green-3" : item.state === "error" ? "text-red-3" : "text-text-muted"
                }`}
              >
                {STATE_LABEL[item.state]}
                {item.state === "uploading" ? ` ${Math.round(item.progress * 100)}%` : ""}
              </span>
              {(item.state === "idle" || item.state === "error") && !busy && (
                <button
                  type="button"
                  onClick={() => dispatch({ type: "remove", id: item.id })}
                  aria-label={`Remover ${item.file.name} da lista`}
                  className="grid h-[28px] w-[28px] shrink-0 place-items-center border-0 bg-transparent text-ink-4 outline-none hover:text-ink-1 focus-visible:shadow-[var(--ring-focus)]"
                >
                  <Icon name="x" size={16} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-[24px] flex flex-wrap items-center gap-[16px]">
        <Button variant="primary" size="md" onClick={publish} disabled={!canPublish}>
          {publishing ? "Enviando…" : waiting.length > 0 ? `Publicar ${waiting.length} ${waiting.length === 1 ? "foto" : "fotos"}` : "Publicar fotos"}
        </Button>
        {done > 0 && !busy && (
          <Button variant="ghost" size="sm" onClick={() => dispatch({ type: "clearDone" })}>
            Limpar publicadas ({done})
          </Button>
        )}
        {!busy && waiting.length > 0 && needsSession && (
          <p className="m-0 text-body-sm text-text-muted">
            Escolha a sessão para publicar.
          </p>
        )}
      </div>
    </section>
  );
}
