// Logotipo "POIEMA GALLERY" do Figma, composto em tipografia (Archivo
// expandida). Quando houver o SVG oficial, troque o conteúdo deste componente.
export function Wordmark({ size = "md" }: { size?: "md" | "lg" }) {
  const big = size === "lg";
  return (
    <span
      role="img"
      aria-label="Poiema Gallery"
      className="inline-flex select-none flex-col items-stretch leading-none text-clay-3"
    >
      <span
        aria-hidden="true"
        className={`font-medium tracking-[-0.01em] ${big ? "text-[40px]" : "text-[24px]"}`}
        style={{ fontStretch: "125%" }}
      >
        POIEMA
      </span>
      <span
        aria-hidden="true"
        className={`flex justify-between font-bold ${big ? "mt-[5px] text-[13px]" : "mt-[3px] text-[8.5px]"}`}
        style={{ fontStretch: "125%" }}
      >
        {"GALLERY".split("").map((letter, index) => (
          <span key={index}>{letter}</span>
        ))}
      </span>
    </span>
  );
}
