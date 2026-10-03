"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { deletePhoto, loadMorePhotos } from "@/app/actions";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { downloadAsJpg } from "@/lib/download/jpg";
import type { PhotoTile } from "@/lib/gallery/types";
import { Lightbox } from "./Lightbox";
import { PrivateImage } from "./PrivateImage";

const HIDDEN_LABEL = { menores: "Não pública · menores", privada: "Não pública · privada" } as const;

const roundButton =
  "grid h-[34px] w-[34px] place-items-center rounded-full border-0 no-underline outline-none transition-[var(--transition-control)] focus-visible:shadow-[var(--ring-focus)] ";
const downloadButton = roundButton + "bg-clay-3 text-night shadow-[0_2px_8px_rgba(0,0,0,.45)] hover:bg-clay-2";
const deleteButton = roundButton + "bg-night/72 text-snow hover:bg-red-3 hover:text-night";

function Tile({
  tile,
  position,
  isAdmin,
  onOpen,
  onDeleted,
}: {
  tile: PhotoTile;
  position: number;
  isAdmin: boolean;
  onOpen: () => void;
  onDeleted: (id: string) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, startDelete] = useTransition();

  function remove() {
    setError(null);
    startDelete(async () => {
      const result = await deletePhoto({ photoId: tile.id });
      if (result.ok) onDeleted(tile.id);
      else setError(result.error);
    });
  }

  return (
    <li
      className="group relative aspect-[4/5] overflow-hidden rounded-[var(--radius-card)] bg-surface-card"
    >
      <span className="absolute inset-0 grid place-items-center text-ink-5">
        <Icon name="image" size={22} />
      </span>
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Abrir foto ${position}`}
        className="absolute inset-0 block h-full w-full cursor-zoom-in border-0 bg-transparent p-0 outline-none focus-visible:shadow-[inset_0_0_0_3px_var(--clay-3)]"
      >
        <PrivateImage
          src={tile.thumbUrl}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-[var(--dur-slow)] ease-[var(--ease-out)] group-hover:scale-[1.03]"
        />
      </button>

      {tile.hidden && (
        <span className="pointer-events-none absolute left-[8px] top-[8px]">
          <Badge tone="glass">{HIDDEN_LABEL[tile.hidden]}</Badge>
        </span>
      )}

      <div className={`absolute bottom-[8px] right-[8px] gap-[6px] ${confirming ? "hidden" : "flex"}`}>
        {isAdmin && (
          <button type="button" onClick={() => setConfirming(true)} aria-label={`Excluir foto ${position}`} className={deleteButton}>
            <Icon name="trash" size={16} />
          </button>
        )}
        {!tile.hidden && (
          <a href={`/api/download/${tile.id}`} download onClick={(event) => downloadAsJpg(event, tile.id)} aria-label={`Baixar foto ${position}`} className={downloadButton}>
            <Icon name="arrow-down" size={17} strokeWidth={2.25} />
          </a>
        )}
      </div>

      {confirming && (
        <div
          role="alertdialog"
          aria-label="Confirmar exclusão"
          className="absolute inset-0 flex flex-col items-center justify-center gap-[12px] bg-night/88 p-[12px] text-center"
        >
          <p className="m-0 text-body-sm font-semibold text-snow">
            {error ?? "Excluir esta foto? Não dá para desfazer."}
          </p>
          <div className="flex flex-wrap justify-center gap-[8px]">
            <Button variant="primary" size="sm" onClick={remove} disabled={deleting} autoFocus>
              {deleting ? "Excluindo…" : "Excluir"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setConfirming(false)} disabled={deleting}>
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </li>
  );
}

export function Gallery({
  sessionId,
  sessionName,
  initialTiles,
  initialHasMore,
  isAdmin,
}: {
  sessionId: string | null;
  sessionName: string | null;
  initialTiles: PhotoTile[];
  initialHasMore: boolean;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [tiles, setTiles] = useState(initialTiles);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();
  const opener = useRef<HTMLElement | null>(null);

  function loadMore() {
    setFailed(false);
    startTransition(async () => {
      const result = await loadMorePhotos({ sessionId, offset: tiles.length });
      if (!result.ok) {
        setFailed(true);
        return;
      }
      setTiles((current) => {
        const seen = new Set(current.map((tile) => tile.id));
        return [...current, ...result.tiles.filter((tile) => !seen.has(tile.id))];
      });
      setHasMore(result.hasMore);
    });
  }

  // Chegou perto do fim no visualizador: busca a próxima página.
  function show(index: number) {
    setOpen(index);
    if (hasMore && !pending && index >= tiles.length - 3) loadMore();
  }

  function removeTile(id: string) {
    setTiles((current) => current.filter((tile) => tile.id !== id));
    router.refresh(); // contagens das abas
  }

  function close() {
    setOpen(null);
    opener.current?.focus();
  }

  if (tiles.length === 0) {
    return (
      <div className="flex flex-col items-center px-[24px] py-[96px] text-center">
        <span className="grid h-[72px] w-[72px] place-items-center rounded-full border border-border-hairline bg-surface-card text-ink-5">
          <Icon name="frown" size={34} />
        </span>
        <p className="mb-0 mt-[24px] text-[14px] font-bold uppercase tracking-[var(--ls-label)] text-text-strong">
          Nenhuma foto ainda
        </p>
        <p className="mb-0 mt-[10px] max-w-[30ch] text-body-sm text-text-muted">
          As fotos desta sessão serão publicadas pelo administrador após o evento.
        </p>
      </div>
    );
  }

  return (
    <>
      <ul className="m-0 grid list-none grid-cols-2 gap-[8px] p-0 sm:grid-cols-3 sm:gap-[12px] lg:grid-cols-4 xl:grid-cols-5">
        {tiles.map((tile, index) => (
          <Tile
            key={tile.id}
            tile={tile}
            position={index + 1}
            isAdmin={isAdmin}
            onDeleted={removeTile}
            onOpen={() => {
              opener.current = document.activeElement as HTMLElement | null;
              show(index);
            }}
          />
        ))}
      </ul>

      {hasMore && (
        <div className="mt-[32px] flex flex-col items-center gap-[12px]">
          <Button variant="outline" size="md" onClick={loadMore} disabled={pending}>
            {pending ? "Carregando…" : "Carregar mais fotos"}
          </Button>
          {failed && (
            <p role="alert" className="m-0 text-body-sm text-red-3">
              Não foi possível carregar mais fotos. Tente de novo.
            </p>
          )}
        </div>
      )}

      {open !== null && tiles[open] && (
        <Lightbox
          tile={tiles[open]}
          position={open + 1}
          total={tiles.length}
          hasMore={hasMore}
          sessionName={sessionName}
          onClose={close}
          onPrev={open > 0 ? () => show(open - 1) : null}
          onNext={open < tiles.length - 1 ? () => show(open + 1) : null}
        />
      )}
    </>
  );
}
