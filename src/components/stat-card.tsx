type StatCardProps = {
  label: string;
  value: number | string;
  helper?: string;
};

export function StatCard({ label, value, helper }: StatCardProps) {
  return (
    <div className="clinical-card p-5">
      <div className="clinical-label">
        {label}
      </div>
      <div className="mt-4 text-4xl font-extrabold tracking-[-0.03em] text-[#003626]">{value}</div>
      {helper ? <div className="mt-1 text-sm text-slate-500">{helper}</div> : null}
    </div>
  );
}
