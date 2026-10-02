import Link from "next/link";
import type { GallerySession } from "@/lib/gallery/types";

export function SessionTabs({ sessions, activeId }: { sessions: GallerySession[]; activeId: string | null }) {
  return (
    <nav aria-label="Sessões" className="border-b border-border-hairline">
      <div className="mx-auto flex max-w-[var(--max-content)] gap-[24px] overflow-x-auto px-[var(--gutter-page)] [scrollbar-width:none]">
        {sessions.map((session) => {
          const active = session.id === activeId;
          return (
            <Link
              key={session.id}
              href={`/?sessao=${session.id}`}
              scroll={false}
              aria-current={active ? "page" : undefined}
              className={
                "shrink-0 border-0 border-b-2 pb-[12px] pt-[14px] text-[13px] font-semibold no-underline outline-none transition-[var(--transition-control)] focus-visible:shadow-[var(--ring-focus)] " +
                (active ? "border-clay-3 text-clay-3" : "border-transparent text-text-muted hover:text-text-strong")
              }
            >
              {session.name}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
