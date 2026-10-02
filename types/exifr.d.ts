// O pacote só tipa a entrada principal. Usamos o build "full": os builds
// "mini"/"lite" não resolvem `pick` por nome de tag e falham em silêncio, o que
// deixaria `taken_at` sempre nulo.
declare module "exifr/dist/full.esm.mjs" {
  import exifr from "exifr";
  export default exifr;
}
