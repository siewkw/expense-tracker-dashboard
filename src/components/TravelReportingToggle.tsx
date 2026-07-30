export function TravelReportingToggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-indigo-100 bg-indigo-50/70 px-4 py-3">
      <span>
        <span className="block text-sm font-semibold text-ink">Include travel expenses</span>
        <span className="mt-0.5 block text-xs text-slate-500">Adds trip spending to these report totals. Monthly budgets stay separate.</span>
      </span>
      <input
        type="checkbox"
        className="h-5 w-5 shrink-0 accent-indigo-600"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  );
}
