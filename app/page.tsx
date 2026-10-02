import Link from "next/link";
import { z } from "zod";
import { Wordmark } from "@/components/brand/Wordmark";
import { AdminBar } from "@/components/admin/AdminBar";
import { Gallery } from "@/components/gallery/Gallery";
import { SessionTabs } from "@/components/gallery/SessionTabs";
import { logout } from "@/lib/auth/actions";
import { getViewer } from "@/lib/auth/session";
import { loadGallery, loadTiles } from "@/lib/gallery/load";

const headerLink =
  "cursor-pointer border-0 bg-transparent p-0 text-micro font-semibold text-ink-5 no-underline outline-none transition-[var(--transition-control)] hover:text-text-strong focus-visible:shadow-[var(--ring-focus)]";

export default async function Home({ searchParams }: PageProps<"/">) {
  const viewer = await getViewer();
  const gallery = await loadGallery(viewer);

  const requested = z.guid().safeParse((await searchParams).sessao);
  // Aba só vale se for uma sessão deste evento; senão, a primeira.
  const activeSession =
    (requested.success ? gallery?.sessions.find((s) => s.id === requested.data) : undefined) ??
    gallery?.sessions[0] ??
    null;
  const activeSessionId = activeSession?.id ?? null;

  const page = gallery ? await loadTiles(viewer, { sessionId: activeSessionId, offset: 0 }) : null;
  const count = activeSession ? activeSession.photoCount : (gallery?.event.photoCount ?? 0);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-10 bg-surface-page">
        <div className="mx-auto flex max-w-[var(--max-content)] items-start justify-between gap-[16px] px-[var(--gutter-page)] pt-[18px]">
          <h1 className="m-0">
            <Wordmark />
            <span className="sr-only"> · {gallery?.event.name ?? "GetUp 2026"}</span>
          </h1>
          <div className="flex flex-col items-end gap-[6px] pt-[2px]">
            <p className="m-0 text-micro font-semibold tracking-[var(--ls-label)] text-text-muted" aria-hidden="true">
              {gallery?.event.name ?? "GetUp 2026"}
            </p>
            {viewer.signedIn ? (
              <form action={logout}>
                <button type="submit" className={headerLink}>
                  Sair
                </button>
              </form>
            ) : (
              <Link href="/login" className={headerLink}>
                Entrar
              </Link>
            )}
          </div>
        </div>
        {gallery && <SessionTabs sessions={gallery.sessions} activeId={activeSessionId} />}
      </header>

      {viewer.signedIn && !viewer.isAdmin && (
        <p role="status" className="m-0 bg-clay-1 px-[var(--gutter-page)] py-[12px] text-center text-body-sm text-clay-5">
          Esta conta não é de administrador. Você continua vendo a galeria como visitante.
        </p>
      )}

      {gallery && viewer.isAdmin && (
        <AdminBar
          eventId={gallery.event.id}
          isPublic={gallery.event.isPublic}
          sessions={gallery.sessions}
          activeSessionId={activeSessionId}
        />
      )}

      {gallery && page ? (
        <>
          <main className="mx-auto w-full max-w-[var(--max-content)] flex-1 px-[var(--gutter-page)] pb-[64px] pt-[18px]">
            <p className="mb-[14px] mt-0 text-micro font-semibold uppercase tracking-[var(--ls-label)] text-ink-5">
              {activeSession ? `${activeSession.name} · ` : ""}
              {count} {count === 1 ? "foto" : "fotos"}
            </p>
            {/* key: troca de aba ou exclusão/envio recomeça a lista do servidor */}
            <Gallery
              key={`${activeSessionId ?? "todas"}:${count}`}
              sessionId={activeSessionId}
              sessionName={activeSession?.name ?? null}
              initialTiles={page.tiles}
              initialHasMore={page.hasMore}
              isAdmin={viewer.isAdmin}
            />
          </main>
        </>
      ) : (
        <main className="mx-auto w-full max-w-[var(--max-narrow)] flex-1 px-[var(--gutter-page)] py-[96px] text-center">
          <p className="m-0 text-[14px] font-bold uppercase tracking-[var(--ls-label)] text-text-strong">As fotos ainda estão a caminho</p>
          <p className="mb-0 mt-[12px] text-body-sm text-text-muted">
            {viewer.isAdmin
              ? "O evento deste site ainda não existe no banco. Rode o script de criação do evento (veja o README)."
              : "Volte em breve: a galeria abre assim que as primeiras fotos forem publicadas."}
          </p>
        </main>
      )}

      <footer className="border-t border-border-hairline px-[var(--gutter-page)] py-[24px] text-center text-body-sm text-text-muted">
        Fotos para uso pessoal de quem participou. Quer que uma foto sua saia do ar? Procure a secretaria da Poiema CWB.
      </footer>
    </div>
  );
}
