import type { ImgHTMLAttributes } from "react";

// <img> puro, de propósito: `next/image` mandaria a foto para o otimizador da
// Vercel, que guardaria cópias de fotos privadas no cache da Vercel e gasta
// a cota do plano Hobby. A URL assinada do R2 vai direto ao navegador
// É o único lugar que renderiza foto do acervo.
export function PrivateImage({ alt, ...props }: ImgHTMLAttributes<HTMLImageElement> & { alt: string }) {
  // eslint-disable-next-line @next/next/no-img-element -- ver comentário acima
  return <img alt={alt} decoding="async" referrerPolicy="no-referrer" {...props} />;
}
