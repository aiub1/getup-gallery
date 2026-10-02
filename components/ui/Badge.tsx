import type { ReactNode } from "react";

type Tone = "ink" | "accent" | "outline" | "live" | "soon" | "glass";

const tones: Record<Tone, string> = {
  ink: "bg-ink-1 text-paper-1",
  accent: "bg-clay-3 text-paper-1",
  outline: "bg-transparent text-ink-1 shadow-[inset_0_0_0_1px_var(--ink-1)]",
  live: "bg-red-3 text-paper-1",
  soon: "bg-paper-4 text-ink-3",
  // Sobre foto: o mockup usa ink-1 a 72% (`rgba(11,11,12,.72)`).
  glass: "bg-night/72 text-snow",
};

export function Badge({
  tone = "ink",
  className = "",
  children,
}: {
  tone?: Tone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-block rounded-[var(--radius-1)] px-[8px] py-[4px] font-ui text-[10px] font-bold uppercase leading-[1.2] tracking-[var(--ls-label)] ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
