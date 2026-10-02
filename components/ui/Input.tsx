import type { InputHTMLAttributes } from "react";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "id"> & {
  label: string;
  hint?: string;
  invalid?: boolean;
  name: string;
};

export function Input({ label, hint, invalid, name, className = "", ...rest }: Props) {
  const id = `field-${name}`;

  return (
    <label htmlFor={id} className={`block ${rest.disabled ? "opacity-40" : ""} ${className}`}>
      <span className="mb-[var(--space-2)] block font-ui text-micro font-bold uppercase tracking-[var(--ls-label)] text-text-strong">
        {label}
      </span>
      <input
        id={id}
        name={name}
        className={
          "w-full rounded-[var(--radius-control)] border-0 bg-surface-sunken px-[14px] py-[13px] font-ui text-body-md text-text-body outline-none transition-[var(--transition-control)] " +
          (invalid
            ? "shadow-[inset_0_0_0_1px_var(--red-3)]"
            : "shadow-[inset_0_0_0_1px_var(--paper-4)] focus:shadow-[inset_0_0_0_2px_var(--clay-3)]")
        }
        {...rest}
      />
      {hint && (
        <span
          className={`mt-[6px] block text-body-sm ${invalid ? "text-[var(--red-3)]" : "text-text-muted"}`}
        >
          {hint}
        </span>
      )}
    </label>
  );
}
