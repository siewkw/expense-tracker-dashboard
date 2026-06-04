export const formatCurrency = (value: number, currency = 'MYR') =>
  new Intl.NumberFormat('en-MY', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value || 0);

export const formatPercent = (value: number) =>
  new Intl.NumberFormat('en-MY', {
    style: 'percent',
    maximumFractionDigits: 1,
  }).format(Number.isFinite(value) ? value : 0);

export const monthKey = (date = new Date()) => date.toISOString().slice(0, 7);

export const currentMonthDate = () => `${monthKey()}-01`;
