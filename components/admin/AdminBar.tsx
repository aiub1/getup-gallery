"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import type { GallerySession } from "@/lib/gallery/types";
import { UploadPanel } from "./UploadPanel";

export function AdminBar({
  eventId,
  isPublic,
  sessions,
  activeSessionId,
}: {
  eventId: string;
  isPublic: boolean;
  sessions: GallerySession[];
  activeSessionId: string | null;
}) {
  const [uploading, setUploading] = useState(false);

  return (
    <div className="border-b border-border-hairline bg-surface-sunken">
      <div className="mx-auto max-w-[var(--max-content)] px-[var(--gutter-page)] py-[16px]">
        <div className="flex flex-wrap items-center justify-between gap-[12px]">
          <p className="m-0 text-[15px] font-bold uppercase tracking-[var(--ls-label)] text-text-accent">
            Painel admin
          </p>
          {!uploading && (
            <Button variant="primary" size="sm" iconLeft={<Icon name="upload-cloud" size={15} />} onClick={() => setUploading(true)}>
              Enviar fotos
            </Button>
          )}
        </div>

        {!isPublic && (
          <p role="status" className="mb-0 mt-[12px] rounded-[var(--radius-control)] bg-clay-1 p-[12px] text-body-sm text-clay-5">
            Este evento ainda não está aberto ao público: só você vê esta página com fotos. Para abrir, marque o evento
            como público no banco (<code>is_public</code>).
          </p>
        )}

        {uploading && (
          <div className="mt-[16px]">
            <UploadPanel
              eventId={eventId}
              sessions={sessions}
              defaultSessionId={activeSessionId}
              onClose={() => setUploading(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
