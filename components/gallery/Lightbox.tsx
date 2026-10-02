"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { downloadAsJpg } from "@/lib/download/jpg";
import type { PhotoTile } from "@/lib/gallery/types";
import { PrivateImage } from "./PrivateImage";

const round =
  "grid h-[40px] w-[40px] place-items-center rounded-full border border-border-hairline bg-surface-card text-text-strong outline-none transition-[var(--transition-control)] hover:border-ink-4 focus-visible:shadow-[var(--ring-focus)]";

export function Lightbox({
  tile,
  position,
  total,
  hasMore,
  sessionName,
  onClose,
  onPrev,
  onNext,
}: {
  tile: PhotoTile;
  position: number;
  total: number;
  hasMore: boolean;
  sessionName: string | null;
  onClose: () => void;
  onPrev: (() => void) | null;
  onNext: (() => void) | null;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      else if (event.key === "ArrowLeft") onPrev?.();
      else if (event.key === "ArrowRight") onNext?.();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, onPrev, onNext]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Foto ${position} de ${total}`}
      onClick={onClose}
      className="fixed inset-0 z-50 flex flex-col items-center gap-[12px] bg-night/96 p-[12px] sm:p-[24px]"
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="relative min-h-0 w-full max-w-[1100px] flex-1 overflow-hidden rounded-[var(--radius-card)] border border-border-hairline bg-surface-card"
      >
        {/* key: troca o elemento a cada foto, para a anterior não ficar na tela enquanto a nova carrega */}
        <PrivateImage
          key={tile.id}
          src={tile.webUrl}
          alt={`Foto ${position}`}
          className="absolute inset-0 h-full w-full object-contain"
        />
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className={`${round} absolute right-[10px] top-[10px]`}
        >
          <Icon name="x" size={18} />
        </button>
        {onPrev && (
          <button type="button" onClick={onPrev} aria-label="Foto anterior" className={`${round} absolute left-[10px] top-1/2 -translate-y-1/2`}>
            <Icon name="chevron-left" size={20} />
          </button>
        )}
        {onNext && (
          <button type="button" onClick={onNext} aria-label="Próxima foto" className={`${round} absolute right-[10px] top-1/2 -translate-y-1/2`}>
            <Icon name="chevron-right" size={20} />
          </button>
        )}
      </div>

      <div
        onClick={(event) => event.stopPropagation()}
        className="flex w-full max-w-[1100px] items-center justify-between gap-[12px] rounded-[var(--radius-card)] border border-border-hairline bg-surface-card px-[14px] py-[10px]"
      >
        <p className="m-0 truncate text-micro font-bold uppercase tracking-[var(--ls-label)] text-text-muted">
          {sessionName ? `${sessionName} · ` : ""}
          <span className="tabular-nums">
            {position}/{total}
            {hasMore ? "+" : ""}
          </span>
        </p>
        {!tile.hidden && (
          <Button
            href={`/api/download/${tile.id}`}
            download
            onClick={(event) => downloadAsJpg(event, tile.id)}
            variant="primary"
            size="md"
            iconLeft={<Icon name="arrow-down" size={15} strokeWidth={2.25} />}
          >
            Baixar foto
          </Button>
        )}
      </div>

      <p className="m-0 text-micro text-ink-5">Toque fora para fechar</p>
    </div>
  );
}
