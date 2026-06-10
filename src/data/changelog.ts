export type ChangeType = 'new' | 'improved' | 'fixed';

export type ChangeLogEntry = {
  version: string;
  date: string;
  title: string;
  summary: string;
  changes: Array<{
    type: ChangeType;
    text: string;
  }>;
};

export const CHANGELOG: ChangeLogEntry[] = [
  {
    version: '1.5.0',
    date: '2026-06-10',
    title: 'Cleaner spending insights',
    summary: 'A neater mobile dashboard and a permanent home for SaveLah release notes.',
    changes: [
      { type: 'improved', text: 'Simplified the “Where it went” chart to show the five largest categories plus Others.' },
      { type: 'improved', text: 'Added a compact category list with amounts and percentages for easier mobile scanning.' },
      { type: 'new', text: 'Added this in-app change log so future updates are easy to follow.' },
    ],
  },
  {
    version: '1.4.0',
    date: '2026-06-07',
    title: 'Recurring money, handled',
    summary: 'Income and subscription schedules can now take care of predictable monthly transactions.',
    changes: [
      { type: 'new', text: 'Added one-time income entry and monthly recurring income schedules.' },
      { type: 'new', text: 'Added automatic monthly subscription expenses from the Add Expense form.' },
      { type: 'new', text: 'Added pause, resume, and delete controls for recurring schedules.' },
      { type: 'improved', text: 'Added category exclusions for dashboard and budget spending totals.' },
      { type: 'fixed', text: 'Excluded categories no longer appear in Budget totals, breakdowns, or charts.' },
    ],
  },
  {
    version: '1.3.0',
    date: '2026-06-05',
    title: 'The SaveLah redesign',
    summary: 'A complete mobile-first visual refresh with a clearer, friendlier fintech experience.',
    changes: [
      { type: 'improved', text: 'Redesigned navigation, dashboard cards, transactions, budgets, reports, and Settings.' },
      { type: 'new', text: 'Added the SaveLah brand, Sora typography, and new piggy-bank app icon.' },
      { type: 'new', text: 'Added installable PWA support for iPhone, Android, and desktop.' },
      { type: 'improved', text: 'Optimized mobile forms, touch targets, bottom navigation, and quick expense entry.' },
    ],
  },
  {
    version: '1.2.0',
    date: '2026-06-04',
    title: 'Smarter automation and performance',
    summary: 'Faster dashboards, smarter categorization, and clearer financial guidance.',
    changes: [
      { type: 'new', text: 'Added subscription detection, spending anomalies, financial health, and budget risk insights.' },
      { type: 'new', text: 'Added merchant rules, user learning, and categorization suggestions.' },
      { type: 'improved', text: 'Added transaction pagination, summarized charts, loading states, and optimized queries.' },
      { type: 'improved', text: 'Improved CSV imports with mapping, previews, duplicate checks, and batch inserts.' },
    ],
  },
];
