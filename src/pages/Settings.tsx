import { FormEvent, useEffect, useState } from 'react';
import { Archive, Eye, EyeOff, Pencil, RotateCcw, Save, Trash2 } from 'lucide-react';
import { Button, Card, Field, Input, PageHeader, Select } from '../components/ui';
import { supabase } from '../lib/supabase';
import { useAuth } from '../providers/AuthProvider';
import { useFinanceData } from '../hooks/useFinanceData';

export function Settings() {
  const { user } = useAuth();
  const { categories, merchantRules, profile, refresh } = useFinanceData({ includeWealth: false });
  const [fullName, setFullName] = useState('');
  const [currency, setCurrency] = useState('MYR');
  const [password, setPassword] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [categoryColor, setCategoryColor] = useState('#18a46f');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingColor, setEditingColor] = useState('#18a46f');
  const [ruleMerchant, setRuleMerchant] = useState('');
  const [ruleCategory, setRuleCategory] = useState('');
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [editingRuleMerchant, setEditingRuleMerchant] = useState('');
  const [editingRuleCategory, setEditingRuleCategory] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    setFullName(profile?.full_name ?? '');
    setCurrency(profile?.currency ?? 'MYR');
  }, [profile]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!user) return;
    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      user_id: user.id,
      full_name: fullName,
      currency,
    });
    setMessage(error ? error.message : 'Settings saved.');
    refresh();
  }

  async function updatePassword(event: FormEvent) {
    event.preventDefault();
    const { error } = await supabase.auth.updateUser({ password });
    setMessage(error ? error.message : 'Password updated.');
    if (!error) setPassword('');
  }

  async function addCategory(event: FormEvent) {
    event.preventDefault();
    if (!user) return;
    const { error } = await supabase.from('categories').insert({
      user_id: user.id,
      name: categoryName.trim(),
      color: categoryColor,
      is_archived: false,
    });
    setMessage(error ? error.message : 'Category added.');
    if (!error) {
      setCategoryName('');
      setCategoryColor('#18a46f');
      refresh();
    }
  }

  function startEditing(category: { id: string; name: string; color: string }) {
    setEditingCategoryId(category.id);
    setEditingName(category.name);
    setEditingColor(category.color);
  }

  async function saveCategory(categoryId: string) {
    const { error } = await supabase
      .from('categories')
      .update({ name: editingName.trim(), color: editingColor })
      .eq('id', categoryId);
    setMessage(error ? error.message : 'Category updated.');
    if (!error) {
      setEditingCategoryId(null);
      refresh();
    }
  }

  async function setCategoryArchived(categoryId: string, isArchived: boolean) {
    const { error } = await supabase.from('categories').update({ is_archived: isArchived }).eq('id', categoryId);
    setMessage(error ? error.message : isArchived ? 'Category archived.' : 'Category restored.');
    if (!error) refresh();
  }

  async function setCategoryDashboardExclusion(categoryId: string, excludeFromDashboard: boolean) {
    const { error } = await supabase
      .from('categories')
      .update({ exclude_from_dashboard: excludeFromDashboard })
      .eq('id', categoryId);
    setMessage(error ? error.message : excludeFromDashboard ? 'Category excluded from dashboard spending.' : 'Category included in dashboard spending.');
    if (!error) refresh();
  }

  const activeCategories = categories.filter((category) => !category.is_archived);
  const archivedCategories = categories.filter((category) => category.is_archived);
  const learnedRules = merchantRules.filter((rule) => rule.user_id === user?.id);
  const defaultRules = merchantRules.filter((rule) => rule.user_id === null);

  async function addMerchantRule(event: FormEvent) {
    event.preventDefault();
    if (!user) return;
    const { error } = await supabase.from('merchant_rules').insert({
      user_id: user.id,
      merchant_pattern: ruleMerchant.trim(),
      category: ruleCategory || activeCategories[0]?.name || 'Others',
      source: 'user',
      confidence: 1,
      is_active: true,
    });
    setMessage(error ? error.message : 'Merchant rule added.');
    if (!error) {
      setRuleMerchant('');
      setRuleCategory('');
      refresh();
    }
  }

  function startEditingRule(rule: { id: string; merchant_pattern: string; category: string }) {
    setEditingRuleId(rule.id);
    setEditingRuleMerchant(rule.merchant_pattern);
    setEditingRuleCategory(rule.category);
  }

  async function saveMerchantRule(ruleId: string) {
    const { error } = await supabase
      .from('merchant_rules')
      .update({ merchant_pattern: editingRuleMerchant.trim(), category: editingRuleCategory, source: 'user', confidence: 1 })
      .eq('id', ruleId);
    setMessage(error ? error.message : 'Merchant rule updated.');
    if (!error) {
      setEditingRuleId(null);
      refresh();
    }
  }

  async function deleteMerchantRule(ruleId: string) {
    const { error } = await supabase.from('merchant_rules').delete().eq('id', ruleId);
    setMessage(error ? error.message : 'Merchant rule deleted.');
    if (!error) refresh();
  }

  return (
    <>
      <PageHeader title="Settings" description="Manage profile preferences and user-owned categories." />
      {message ? <p className="mb-4 rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm font-medium text-indigo-700">{message}</p> : null}

      <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <div className="space-y-4">
          <Card>
            <h2 className="mb-1 font-sora text-lg font-semibold text-ink">Profile</h2>
            <p className="mb-5 text-sm text-slate-500">Your personal details and preferred currency.</p>
            <form onSubmit={submit} className="space-y-4">
              <Field label="Email"><Input value={user?.email ?? ''} disabled /></Field>
              <Field label="Full name"><Input value={fullName} onChange={(event) => setFullName(event.target.value)} /></Field>
              <Field label="Currency"><Input value={currency} maxLength={3} onChange={(event) => setCurrency(event.target.value.toUpperCase())} /></Field>
              <Button type="submit">Save settings</Button>
            </form>
          </Card>
          <Card>
            <h2 className="mb-1 font-sora text-lg font-semibold text-ink">Password</h2>
            <p className="mb-5 text-sm text-slate-500">Keep your SaveLah account protected.</p>
            <form onSubmit={updatePassword} className="space-y-4">
              <Field label="New password"><Input type="password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required /></Field>
              <Button type="submit">Update password</Button>
            </form>
          </Card>
        </div>

        <Card>
          <div className="mb-5">
            <h2 className="font-sora text-lg font-semibold text-ink">Category Management</h2>
            <p className="mt-1 text-sm text-slate-600">Active categories appear throughout SaveLah. Use the eye button to include or exclude a category from dashboard spending only.</p>
          </div>

          <form onSubmit={addCategory} className="mb-6 grid gap-4 sm:grid-cols-[1fr_120px_auto]">
            <Field label="Category name">
              <Input value={categoryName} onChange={(event) => setCategoryName(event.target.value)} required />
            </Field>
            <Field label="Color">
              <Input type="color" value={categoryColor} onChange={(event) => setCategoryColor(event.target.value)} />
            </Field>
            <div className="flex items-end">
              <Button type="submit" className="w-full">Add category</Button>
            </div>
          </form>

          <CategoryList
            title="Active categories"
            categories={activeCategories}
            editingCategoryId={editingCategoryId}
            editingName={editingName}
            editingColor={editingColor}
            onEdit={startEditing}
            onNameChange={setEditingName}
            onColorChange={setEditingColor}
            onSave={saveCategory}
            onArchive={(id) => setCategoryArchived(id, true)}
            onToggleDashboard={(id, excluded) => setCategoryDashboardExclusion(id, !excluded)}
          />

          <div className="mt-8">
            <CategoryList
              title="Archived categories"
              categories={archivedCategories}
              editingCategoryId={editingCategoryId}
              editingName={editingName}
              editingColor={editingColor}
              onEdit={startEditing}
              onNameChange={setEditingName}
              onColorChange={setEditingColor}
              onSave={saveCategory}
              onRestore={(id) => setCategoryArchived(id, false)}
            />
          </div>
        </Card>

        <Card className="xl:col-span-2">
          <div className="mb-5">
            <h2 className="font-sora text-lg font-semibold text-ink">Merchant Rules</h2>
            <p className="mt-1 text-sm text-slate-600">Learned rules override defaults and power future auto-categorization.</p>
          </div>

          <form onSubmit={addMerchantRule} className="mb-6 grid gap-4 sm:grid-cols-[1fr_180px_auto]">
            <Field label="Merchant contains">
              <Input value={ruleMerchant} onChange={(event) => setRuleMerchant(event.target.value)} required />
            </Field>
            <Field label="Category">
              <Select value={ruleCategory || activeCategories[0]?.name || ''} onChange={(event) => setRuleCategory(event.target.value)}>
                {activeCategories.map((category) => <option key={category.id}>{category.name}</option>)}
              </Select>
            </Field>
            <div className="flex items-end">
              <Button type="submit" className="w-full" disabled={activeCategories.length === 0}>Add rule</Button>
            </div>
          </form>

          <MerchantRuleList
            title="Learned merchant rules"
            rules={learnedRules}
            activeCategories={activeCategories}
            editingRuleId={editingRuleId}
            editingRuleMerchant={editingRuleMerchant}
            editingRuleCategory={editingRuleCategory}
            onEdit={startEditingRule}
            onMerchantChange={setEditingRuleMerchant}
            onCategoryChange={setEditingRuleCategory}
            onSave={saveMerchantRule}
            onDelete={deleteMerchantRule}
          />

          <div className="mt-8">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Default merchant rules</h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {defaultRules.map((rule) => (
                <div key={rule.id} className="flex items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm">
                  <span className="font-medium text-ink">{rule.merchant_pattern}</span>
                  <span className="text-indigo-400">{' → '}</span>
                  <span className="text-slate-500">{rule.category}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}

function CategoryList({
  title,
  categories,
  editingCategoryId,
  editingName,
  editingColor,
  onEdit,
  onNameChange,
  onColorChange,
  onSave,
  onArchive,
  onRestore,
  onToggleDashboard,
}: {
  title: string;
  categories: Array<{ id: string; name: string; color: string; exclude_from_dashboard: boolean }>;
  editingCategoryId: string | null;
  editingName: string;
  editingColor: string;
  onEdit: (category: { id: string; name: string; color: string }) => void;
  onNameChange: (value: string) => void;
  onColorChange: (value: string) => void;
  onSave: (categoryId: string) => void;
  onArchive?: (categoryId: string) => void;
  onRestore?: (categoryId: string) => void;
  onToggleDashboard?: (categoryId: string, currentlyExcluded: boolean) => void;
}) {
  return (
    <section>
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</h3>
      <div className="space-y-2">
        {categories.length === 0 ? <p className="rounded-2xl bg-slate-50 px-4 py-4 text-sm text-slate-600">No categories here.</p> : null}
        {categories.map((category) => {
          const isEditing = editingCategoryId === category.id;
          return (
            <div key={category.id} className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <span className="h-4 w-4 shrink-0 rounded-full" style={{ backgroundColor: isEditing ? editingColor : category.color }} />
                {isEditing ? (
                  <div className="grid flex-1 gap-2 sm:grid-cols-[1fr_88px]">
                    <Input value={editingName} onChange={(event) => onNameChange(event.target.value)} />
                    <Input type="color" value={editingColor} onChange={(event) => onColorChange(event.target.value)} />
                  </div>
                ) : (
                  <div className="min-w-0">
                    <span className="block truncate text-sm font-medium text-ink">{category.name}</span>
                    {onToggleDashboard ? (
                      <span className={`mt-1 block text-xs ${category.exclude_from_dashboard ? 'text-amber-700' : 'text-slate-500'}`}>
                        {category.exclude_from_dashboard ? 'Excluded from dashboard spending' : 'Counted in dashboard spending'}
                      </span>
                    ) : null}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                {!isEditing && onToggleDashboard ? (
                  <Button
                    type="button"
                    className={category.exclude_from_dashboard ? 'bg-amber-600 px-3 hover:bg-amber-700' : 'bg-white px-3 text-slate-600 shadow-sm ring-1 ring-slate-200 hover:bg-slate-100'}
                    onClick={() => onToggleDashboard(category.id, category.exclude_from_dashboard)}
                    aria-label={category.exclude_from_dashboard ? 'Include category in dashboard spending' : 'Exclude category from dashboard spending'}
                    title={category.exclude_from_dashboard ? 'Include on dashboard' : 'Exclude from dashboard'}
                  >
                    {category.exclude_from_dashboard ? <EyeOff size={15} /> : <Eye size={15} />}
                  </Button>
                ) : null}
                {isEditing ? (
                  <Button type="button" className="px-3" onClick={() => onSave(category.id)} aria-label="Save category">
                    <Save size={15} />
                  </Button>
                ) : (
                  <Button type="button" className="bg-slate-700 px-3 hover:bg-slate-800" onClick={() => onEdit(category)} aria-label="Edit category">
                    <Pencil size={15} />
                  </Button>
                )}
                {onArchive ? (
                  <Button type="button" className="bg-amber-600 px-3 hover:bg-amber-700" onClick={() => onArchive(category.id)} aria-label="Archive category">
                    <Archive size={15} />
                  </Button>
                ) : null}
                {onRestore ? (
                  <Button type="button" className="bg-brand-600 px-3 hover:bg-brand-700" onClick={() => onRestore(category.id)} aria-label="Restore category">
                    <RotateCcw size={15} />
                  </Button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function MerchantRuleList({
  title,
  rules,
  activeCategories,
  editingRuleId,
  editingRuleMerchant,
  editingRuleCategory,
  onEdit,
  onMerchantChange,
  onCategoryChange,
  onSave,
  onDelete,
}: {
  title: string;
  rules: Array<{ id: string; merchant_pattern: string; category: string; source: string; confidence: number }>;
  activeCategories: Array<{ id: string; name: string }>;
  editingRuleId: string | null;
  editingRuleMerchant: string;
  editingRuleCategory: string;
  onEdit: (rule: { id: string; merchant_pattern: string; category: string }) => void;
  onMerchantChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onSave: (ruleId: string) => void;
  onDelete: (ruleId: string) => void;
}) {
  return (
    <section>
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</h3>
      <div className="space-y-2">
        {rules.length === 0 ? <p className="rounded-2xl bg-slate-50 px-4 py-4 text-sm text-slate-600">No learned rules yet. Edit a transaction category or confirm an import suggestion to teach the system.</p> : null}
        {rules.map((rule) => {
          const isEditing = editingRuleId === rule.id;
          return (
            <div key={rule.id} className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-4 xl:flex-row xl:items-center xl:justify-between">
              {isEditing ? (
                <div className="grid flex-1 gap-2 sm:grid-cols-[1fr_180px]">
                  <Input value={editingRuleMerchant} onChange={(event) => onMerchantChange(event.target.value)} />
                  <Select value={editingRuleCategory} onChange={(event) => onCategoryChange(event.target.value)}>
                    {activeCategories.map((category) => <option key={category.id}>{category.name}</option>)}
                  </Select>
                </div>
              ) : (
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">
                    <span>{rule.merchant_pattern}</span>
                    <span>{' -> '}</span>
                    <span>{rule.category}</span>
                  </p>
                  <p className="text-xs text-slate-500">{rule.source} · {Math.round(rule.confidence * 100)}% confidence</p>
                </div>
              )}
              <div className="flex gap-2">
                {isEditing ? (
                  <Button type="button" className="px-3" onClick={() => onSave(rule.id)} aria-label="Save merchant rule">
                    <Save size={15} />
                  </Button>
                ) : (
                  <Button type="button" className="bg-slate-700 px-3 hover:bg-slate-800" onClick={() => onEdit(rule)} aria-label="Edit merchant rule">
                    <Pencil size={15} />
                  </Button>
                )}
                <Button type="button" className="bg-red-600 px-3 hover:bg-red-700" onClick={() => onDelete(rule.id)} aria-label="Delete merchant rule">
                  <Trash2 size={15} />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
