import type { SelectHTMLAttributes } from "react";

type Props = Omit<SelectHTMLAttributes<HTMLSelectElement>, "id"> & {
  label: string;
  hint?: string;
  invalid?: boolean;
  name: string;
  options: { value: string; label: string }[];
};

// Espelha forms/Select do design system: mesma caixa do Input, seta feita com
// dois gradientes (sem ícone extra).
export function Select({ label, hint, invalid, name, options, className = "", ...rest }: Props) {
  const id = `field-${name}`;

  return (
    <label htmlFor={id} className={`block ${rest.disabled ? "opacity-40" : ""} ${className}`}>
      <span className="mb-[var(--space-2)] block font-ui text-micro font-bold uppercase tracking-[var(--ls-label)] text-text-strong">
        {label}
      </span>
      <select
        id={id}
        name={name}
        className={
          "w-full cursor-pointer appearance-none rounded-[var(--radius-control)] border-0 bg-surface-sunken px-[14px] py-[13px] pr-[36px] font-ui text-body-md text-text-body outline-none transition-[var(--transition-control)] " +
          "bg-[linear-gradient(45deg,transparent_50%,var(--ink-2)_50%),linear-gradient(135deg,var(--ink-2)_50%,transparent_50%)] " +
          "bg-[position:calc(100%-18px)_20px,calc(100%-13px)_20px] bg-[size:5px_5px,5px_5px] bg-no-repeat " +
          (invalid
            ? "shadow-[inset_0_0_0_1px_var(--red-3)]"
            : "shadow-[inset_0_0_0_1px_var(--paper-4)] focus:shadow-[inset_0_0_0_2px_var(--clay-3)]")
        }
        {...rest}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {hint && (
        <span className={`mt-[6px] block text-body-sm ${invalid ? "text-[var(--red-3)]" : "text-text-muted"}`}>{hint}</span>
      )}
    </label>
  );
}
