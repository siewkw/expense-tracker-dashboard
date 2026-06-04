export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-lg border border-dashed border-line bg-slate-50 px-4 py-8 text-center">
      <p className="font-medium text-ink">{title}</p>
      <p className="mt-1 text-sm text-slate-600">{description}</p>
    </div>
  );
}
