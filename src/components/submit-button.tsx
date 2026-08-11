"use client";

import { useFormStatus } from "react-dom";
import { Loader2, LogOut, Save, Trash2, Upload } from "lucide-react";

const icons = {
  logout: LogOut,
  save: Save,
  trash: Trash2,
  upload: Upload,
};

type SubmitButtonProps = {
  children?: React.ReactNode;
  className: string;
  pendingLabel?: string;
  icon?: keyof typeof icons;
  ariaLabel?: string;
};

export function SubmitButton({
  children,
  className,
  pendingLabel,
  icon,
  ariaLabel,
}: SubmitButtonProps) {
  const { pending } = useFormStatus();
  const Icon = icon ? icons[icon] : null;
  const label = pending && pendingLabel ? pendingLabel : children;

  return (
    <button
      type="submit"
      className={`${className} disabled:cursor-not-allowed disabled:opacity-70`}
      disabled={pending}
      aria-label={ariaLabel}
      aria-busy={pending}
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : Icon ? (
        <Icon className="h-4 w-4" aria-hidden="true" />
      ) : null}
      {label ? <span className="flex items-center gap-1">{label}</span> : null}
    </button>
  );
}
