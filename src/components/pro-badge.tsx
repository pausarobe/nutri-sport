type ProBadgeProps = {
  className?: string;
};

export function ProBadge({ className = "" }: ProBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.08em] text-amber-800 ring-1 ring-inset ring-amber-200/80 ${className}`}
    >
      Pro
    </span>
  );
}
