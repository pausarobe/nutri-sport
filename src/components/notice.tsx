type NoticeProps = {
  error?: string | string[];
  success?: string | string[];
  message?: string | string[];
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function Notice({ error, success, message }: NoticeProps) {
  const text = first(error) ?? first(success) ?? first(message);
  if (!text) return null;

  const tone = error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-800";

  return (
    <div className={`rounded-lg border px-4 py-3 text-sm ${tone}`} role="status">
      {text}
    </div>
  );
}
