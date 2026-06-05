export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-[22px] border border-dashed border-indigo-200 bg-indigo-50/50 px-6 py-12 text-center">
      <div className="mx-auto mb-4 h-2 w-12 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500" />
      <p className="font-semibold text-ink">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{description}</p>
    </div>
  );
}
