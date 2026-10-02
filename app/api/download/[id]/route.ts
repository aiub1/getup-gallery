import { NextResponse } from "next/server";
import { z } from "zod";
import { downloadFileName, signPhotoDownload } from "@/lib/r2/sign";
import { createClient } from "@/lib/supabase/server";

// Download da versão web de UMA foto pública. A função public_photo do core
// decide se a foto pode sair (evento público, sem menores, não privada,
// publicada); aqui só se assina a linha que ela devolveu, por 60 segundos, com
// Content-Disposition de anexo. O original nunca é assinado.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = z.guid().safeParse((await params).id);
  if (!id.success) return new NextResponse("Foto não encontrada.", { status: 404 });

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("public_photo", { p_id: id.data });
  if (error) {
    console.error("download: public_photo falhou", error.code);
    return new NextResponse("Não foi possível baixar agora. Tente de novo.", { status: 502 });
  }
  const photo = data?.[0];
  if (!photo) return new NextResponse("Foto não encontrada.", { status: 404 });

  const fileName = downloadFileName([photo.event_slug, photo.session_name, photo.id.slice(0, 8)]);
  const url = await signPhotoDownload(photo, fileName);
  return NextResponse.redirect(url, { status: 302, headers: { "Cache-Control": "no-store" } });
}
