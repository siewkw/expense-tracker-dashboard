import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { Download, FileSpreadsheet, Upload } from 'lucide-react';
import { Button, Card, Field, Input, PageHeader, Select } from '../components/ui';
import { EmptyState } from '../components/EmptyState';
import { PAYMENT_METHODS } from '../constants/finance';
import { categorizeMerchant } from '../lib/categorization';
import { downloadTextFile, parseCsv, toCsv, toExcelHtml, type CsvRow } from '../lib/csv';
import { formatCurrency } from '../lib/format';
import { supabase } from '../lib/supabase';
import { useFinanceData } from '../hooks/useFinanceData';
import { useAuth } from '../providers/AuthProvider';
import type { TransactionType } from '../types/database';

type StatementType = 'credit_card' | 'bank';
type ImportStatus = 'ready' | 'duplicate' | 'invalid' | 'needs_confirmation';

type Mapping = {
  date: string;
  amount: string;
  merchant: string;
  category: string;
  payment_method: string;
  notes: string;
};

type PreviewRow = {
  sourceIndex: number;
  occurred_on: string;
  amount: number;
  type: TransactionType;
  category: string;
  merchant: string;
  payment_method: string;
  notes: string | null;
  status: ImportStatus;
  reason: string;
  confidence: number;
  categorizationSource: string;
  needsConfirmation: boolean;
};

const defaultMapping: Mapping = {
  date: '',
  amount: '',
  merchant: '',
  category: '',
  payment_method: '',
  notes: '',
};

export function ImportExport() {
  const { user } = useAuth();
  const { categories, merchantRules, profile, refresh } = useFinanceData({ recentTransactionLimit: 0, includeWealth: false });
  const currency = profile?.currency ?? 'MYR';
  const activeCategories = categories.filter((category) => !category.is_archived);
  const fallbackCategory = activeCategories[0]?.name ?? 'Others';
  const [statementType, setStatementType] = useState<StatementType>('credit_card');
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [filename, setFilename] = useState('');
  const [mapping, setMapping] = useState<Mapping>(defaultMapping);
  const [confirmedRows, setConfirmedRows] = useState<Record<number, boolean>>({});
  const [existingKeys, setExistingKeys] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState('');

  const headers = Object.keys(rows[0] ?? {});

  const previewRows = useMemo<PreviewRow[]>(() => {
    return rows.map((row, index) => {
      const rawAmount = cleanAmount(value(row, mapping.amount));
      const occurredOn = normalizeDate(value(row, mapping.date));
      const merchant = value(row, mapping.merchant) || 'Imported transaction';
      const mappedCategory = value(row, mapping.category);
      const categorization = mappedCategory
        ? { category: mappedCategory, confidence: 1, source: 'merchant_rule', needsConfirmation: false }
        : categorizeMerchant(merchant, merchantRules, activeCategories, fallbackCategory);
      const category = categorization.category;
      const mappedPayment = value(row, mapping.payment_method);
      const paymentMethod = mappedPayment || (statementType === 'credit_card' ? 'Credit Card' : 'Bank Transfer/QR');
      const notes = value(row, mapping.notes) || null;
      const type = inferType(rawAmount, statementType);
      const amount = Math.abs(rawAmount);
      const status =
        !occurredOn || amount <= 0
          ? 'invalid'
          : existingKeys.has(duplicateKey({ occurred_on: occurredOn, amount, merchant }))
            ? 'duplicate'
            : categorization.needsConfirmation && !confirmedRows[index]
              ? 'needs_confirmation'
              : 'ready';

      return {
        sourceIndex: index + 1,
        occurred_on: occurredOn,
        amount,
        type,
        category,
        merchant,
        payment_method: paymentMethod,
        notes,
        status,
        reason:
          !occurredOn || amount <= 0
            ? 'Missing date or amount'
            : status === 'duplicate'
              ? 'Possible duplicate'
              : status === 'needs_confirmation'
                ? 'Confirm category'
                : 'Ready',
        confidence: categorization.confidence,
        categorizationSource: categorization.source,
        needsConfirmation: categorization.needsConfirmation,
      };
    });
  }, [activeCategories, confirmedRows, existingKeys, fallbackCategory, mapping, merchantRules, rows, statementType]);

  const readyRows = previewRows.filter((row) => row.status === 'ready');
  const duplicateRows = previewRows.filter((row) => row.status === 'duplicate');
  const invalidRows = previewRows.filter((row) => row.status === 'invalid');
  const confirmationRows = previewRows.filter((row) => row.status === 'needs_confirmation');

  useEffect(() => {
    async function loadDuplicateKeys() {
      if (!user || rows.length === 0 || !mapping.date || !mapping.amount) {
        setExistingKeys(new Set());
        return;
      }

      const dates = rows.map((row) => normalizeDate(value(row, mapping.date))).filter(Boolean).sort();
      if (dates.length === 0) {
        setExistingKeys(new Set());
        return;
      }

      const { data, error } = await supabase
        .from('transactions')
        .select('occurred_on,amount,merchant')
        .eq('user_id', user.id)
        .gte('occurred_on', dates[0])
        .lte('occurred_on', dates[dates.length - 1]);

      if (error) {
        setMessage(`Duplicate check failed. ${error.message}`);
        setExistingKeys(new Set());
        return;
      }

      setExistingKeys(
        new Set(
          (data ?? []).map((transaction) =>
            duplicateKey({
              occurred_on: transaction.occurred_on,
              amount: Number(transaction.amount),
              merchant: transaction.merchant ?? '',
            }),
          ),
        ),
      );
    }

    loadDuplicateKeys();
  }, [mapping.amount, mapping.date, rows, user]);

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const parsed = parseCsv(text);
    setRows(parsed);
    setFilename(file.name);
    setMessage(parsed.length ? `${parsed.length} rows loaded.` : 'No rows found in this CSV.');
    setMapping(autoMap(Object.keys(parsed[0] ?? {})));
    setConfirmedRows({});
  }

  async function importRows() {
    if (!user || readyRows.length === 0) return;
    const existingUserRulePatterns = new Set(merchantRules.filter((rule) => rule.user_id === user.id).map((rule) => rule.merchant_pattern.trim().toLowerCase()));
    const learnedRulesByMerchant = new Map(
      readyRows
        .filter((row) => row.categorizationSource === 'ai_fallback' && row.needsConfirmation && !existingUserRulePatterns.has(row.merchant.trim().toLowerCase()))
        .map((row) => [
          row.merchant.trim().toLowerCase(),
          {
            user_id: user.id,
            merchant_pattern: row.merchant,
            category: row.category,
            source: 'ai' as const,
            confidence: row.confidence,
            is_active: true,
          },
        ]),
    );
    const learnedRules = Array.from(learnedRulesByMerchant.values());

    if (learnedRules.length > 0) {
      await supabase.from('merchant_rules').insert(learnedRules);
    }

    const payload = readyRows.map((row) => ({
      user_id: user.id,
      occurred_on: row.occurred_on,
      amount: row.amount,
      type: row.type,
      category: row.category,
      category_id: activeCategories.find((category) => category.name === row.category)?.id ?? null,
      merchant: row.merchant,
      payment_method: row.payment_method,
      notes: row.notes,
      tags: ['imported', statementType],
    }));

    for (let index = 0; index < payload.length; index += 500) {
      const batch = payload.slice(index, index + 500);
      const { error } = await supabase.from('transactions').insert(batch);
      if (error) {
        setMessage(`Import stopped at batch ${Math.floor(index / 500) + 1}. ${error.message}`);
        return;
      }
    }

    setMessage(`${readyRows.length} transactions imported. Duplicates and invalid rows were skipped.`);
    setRows([]);
    setFilename('');
    setMapping(defaultMapping);
    refresh();
  }

  async function exportRows(format: 'csv' | 'excel') {
    if (!user) return;
    setExporting(true);
    const allRows: CsvRow[] = [];
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await supabase
        .from('transactions')
        .select('occurred_on,type,amount,category,merchant,payment_method,notes,tags')
        .eq('user_id', user.id)
        .order('occurred_on', { ascending: false })
        .range(offset, offset + 999);

      if (error) {
        setMessage(`Export failed. ${error.message}`);
        setExporting(false);
        return;
      }

      const batch = data ?? [];
      allRows.push(
        ...batch.map((transaction) => ({
          date: transaction.occurred_on,
          type: transaction.type,
          amount: String(transaction.amount),
          category: transaction.category,
          merchant: transaction.merchant ?? '',
          payment_method: transaction.payment_method ?? '',
          notes: transaction.notes ?? '',
          tags: transaction.tags.join('|'),
        })),
      );
      if (batch.length < 1000) break;
    }

    setExporting(false);
    if (allRows.length === 0) {
      setMessage('No transactions available to export.');
      return;
    }

    if (format === 'csv') {
      downloadTextFile('finance-transactions.csv', toCsv(allRows), 'text/csv;charset=utf-8');
      return;
    }

    downloadTextFile('finance-transactions.xls', toExcelHtml(allRows), 'application/vnd.ms-excel;charset=utf-8');
  }

  return (
    <>
      <PageHeader title="Import & Export" description="Import credit card or bank statements, preview mapped rows, skip duplicates, and export your data." />
      {message ? <p className="mb-4 rounded-md bg-brand-50 px-3 py-2 text-sm text-brand-700">{message}</p> : null}

      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          <Card>
            <h2 className="mb-4 font-semibold text-ink">Upload Statement</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Statement type">
                <Select className="py-3 text-base" value={statementType} onChange={(event) => setStatementType(event.target.value as StatementType)}>
                  <option value="credit_card">Credit Card Statement</option>
                  <option value="bank">Bank Statement</option>
                </Select>
              </Field>
              <Field label="CSV file">
                <Input className="py-3 text-base" type="file" accept=".csv,text/csv" onChange={handleUpload} />
              </Field>
            </div>
            <p className="mt-3 text-sm text-slate-600">Import runs in your browser. Only accepted preview rows are saved to your logged-in user account.</p>
          </Card>

          <Card>
            <h2 className="mb-4 font-semibold text-ink">Column Mapping</h2>
            {headers.length === 0 ? (
              <EmptyState title="Upload a CSV first" description="After upload, map statement columns to transaction fields." />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <ColumnSelect label="Date" headers={headers} value={mapping.date} onChange={(value) => setMapping({ ...mapping, date: value })} required />
                <ColumnSelect label="Amount" headers={headers} value={mapping.amount} onChange={(value) => setMapping({ ...mapping, amount: value })} required />
                <ColumnSelect label="Merchant" headers={headers} value={mapping.merchant} onChange={(value) => setMapping({ ...mapping, merchant: value })} />
                <ColumnSelect label="Category" headers={headers} value={mapping.category} onChange={(value) => setMapping({ ...mapping, category: value })} />
                <ColumnSelect label="Payment Method" headers={headers} value={mapping.payment_method} onChange={(value) => setMapping({ ...mapping, payment_method: value })} />
                <ColumnSelect label="Notes" headers={headers} value={mapping.notes} onChange={(value) => setMapping({ ...mapping, notes: value })} />
              </div>
            )}
          </Card>

          <Card>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-semibold text-ink">Preview Before Import</h2>
                <p className="text-sm text-slate-600">{filename || 'No file selected'}</p>
              </div>
              <Button type="button" className="min-h-11" onClick={importRows} disabled={readyRows.length === 0}>
                <Upload size={16} />
                Import {readyRows.length}
              </Button>
            </div>
            {previewRows.length === 0 ? (
              <EmptyState title="No preview yet" description="Upload a CSV and complete column mapping to preview rows." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] text-left text-sm">
                  <thead className="border-b border-line text-slate-500">
                    <tr>
                      <th className="py-2">Status</th>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Merchant</th>
                <th>Category</th>
                      <th>Confidence</th>
                      <th>Payment</th>
                      <th className="text-right">Amount</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.slice(0, 50).map((row) => (
                      <tr key={row.sourceIndex} className="border-b border-slate-100">
                        <td className="py-3">
                          <span className={statusClass(row.status)}>{row.reason}</span>
                        </td>
                        <td>{row.occurred_on || '-'}</td>
                        <td className="capitalize">{row.type}</td>
                        <td>{row.merchant}</td>
                        <td>{row.category}</td>
                        <td>
                          <div className="space-y-1">
                            <span className="text-xs text-slate-600">{Math.round(row.confidence * 100)}% · {row.categorizationSource.replace('_', ' ')}</span>
                            {row.needsConfirmation && !confirmedRows[row.sourceIndex - 1] ? (
                              <button
                                type="button"
                                className="block rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200"
                                onClick={() => setConfirmedRows((current) => ({ ...current, [row.sourceIndex - 1]: true }))}
                              >
                                Confirm
                              </button>
                            ) : null}
                          </div>
                        </td>
                        <td>{row.payment_method}</td>
                        <td className="text-right font-medium">{formatCurrency(row.amount, currency)}</td>
                        <td className="max-w-56 truncate">{row.notes ?? '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <h2 className="mb-4 font-semibold text-ink">Import Summary</h2>
            <div className="grid gap-3">
              <Summary label="Ready to import" value={readyRows.length} />
              <Summary label="Needs confirmation" value={confirmationRows.length} />
              <Summary label="Duplicates skipped" value={duplicateRows.length} />
              <Summary label="Invalid skipped" value={invalidRows.length} />
              <Summary label="Duplicate keys checked" value={existingKeys.size} />
            </div>
          </Card>

          <Card>
            <h2 className="mb-4 font-semibold text-ink">Automation</h2>
            <div className="space-y-3 text-sm text-slate-600">
              <p>Auto categorization uses user-learned merchant rules first, default merchant rules second, then AI-style fallback suggestions.</p>
              <p>Low-confidence AI fallback rows must be confirmed before import. Confirmed mappings are saved as user rules.</p>
              <p>Duplicate detection compares date, merchant, and amount against your existing transactions.</p>
              <p>Imported rows are tagged with `imported` and the statement type.</p>
            </div>
          </Card>

          <Card>
            <h2 className="mb-4 font-semibold text-ink">Export</h2>
            <div className="grid gap-3">
              <Button type="button" className="min-h-11" onClick={() => exportRows('csv')} disabled={exporting}>
                <Download size={16} />
                {exporting ? 'Preparing...' : 'Export CSV'}
              </Button>
              <Button type="button" className="min-h-11 bg-slate-700 hover:bg-slate-800" onClick={() => exportRows('excel')} disabled={exporting}>
                <FileSpreadsheet size={16} />
                {exporting ? 'Preparing...' : 'Export Excel'}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}

function ColumnSelect({ label, headers, value, onChange, required = false }: { label: string; headers: string[]; value: string; onChange: (value: string) => void; required?: boolean }) {
  return (
    <Field label={`${label}${required ? ' *' : ''}`}>
      <Select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Not mapped</option>
        {headers.map((header) => <option key={header}>{header}</option>)}
      </Select>
    </Field>
  );
}

function Summary({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-3">
      <span className="text-sm text-slate-600">{label}</span>
      <span className="font-semibold text-ink">{value}</span>
    </div>
  );
}

function value(row: CsvRow, key: string) {
  return key ? (row[key] ?? '').trim() : '';
}

function cleanAmount(value: string) {
  const normalized = value.replace(/[^\d.-]/g, '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeDate(value: string) {
  if (!value) return '';
  const trimmed = value.trim();
  const isoLike = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoLike) return `${isoLike[1]}-${isoLike[2].padStart(2, '0')}-${isoLike[3].padStart(2, '0')}`;
  const localLike = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/);
  if (localLike) {
    const year = localLike[3].length === 2 ? `20${localLike[3]}` : localLike[3];
    return `${year}-${localLike[2].padStart(2, '0')}-${localLike[1].padStart(2, '0')}`;
  }
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 10);
}

function inferType(amount: number, statementType: StatementType): TransactionType {
  if (statementType === 'credit_card') return amount < 0 ? 'income' : 'expense';
  return amount < 0 ? 'expense' : 'income';
}

function duplicateKey({ occurred_on, amount, merchant }: { occurred_on: string; amount: number; merchant: string }) {
  return `${occurred_on}|${merchant.trim().toLowerCase()}|${Math.abs(amount).toFixed(2)}`;
}

function autoMap(headers: string[]): Mapping {
  const find = (...keywords: string[]) => headers.find((header) => keywords.some((keyword) => header.toLowerCase().includes(keyword))) ?? '';
  return {
    date: find('date', 'transaction date', 'posting date'),
    amount: find('amount', 'debit', 'credit', 'transaction amount'),
    merchant: find('merchant', 'description', 'details', 'payee', 'name'),
    category: find('category'),
    payment_method: find('payment', 'method', 'account'),
    notes: find('notes', 'memo', 'remark'),
  };
}

function statusClass(status: ImportStatus) {
  if (status === 'ready') return 'rounded-md bg-brand-50 px-2 py-1 text-xs font-medium text-brand-700';
  if (status === 'needs_confirmation') return 'rounded-md bg-sky-50 px-2 py-1 text-xs font-medium text-sky-700';
  if (status === 'duplicate') return 'rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700';
  return 'rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700';
}
