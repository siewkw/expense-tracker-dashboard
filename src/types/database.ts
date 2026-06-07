export type TransactionType = 'income' | 'expense' | 'transfer';

export type Transaction = {
  id: string;
  user_id: string;
  occurred_on: string;
  amount: number;
  type: TransactionType;
  category: string;
  category_id: string | null;
  merchant: string | null;
  payment_method: string | null;
  notes: string | null;
  tags: string[];
  recurring_income_id: string | null;
  created_at: string;
  updated_at: string;
};

export type RecurringIncome = {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  day_of_month: number;
  start_month: string;
  payment_method: string;
  notes: string | null;
  is_active: boolean;
  last_generated_month: string | null;
  created_at: string;
  updated_at: string;
};

export type Budget = {
  id: string;
  user_id: string;
  category: string;
  month: string;
  amount: number;
  created_at: string;
  updated_at: string;
};

export type MonthlyBudget = {
  id: string;
  user_id: string;
  month: string;
  amount: number;
  created_at: string;
  updated_at: string;
};

export type Category = {
  id: string;
  user_id: string;
  name: string;
  color: string;
  is_archived: boolean;
  exclude_from_dashboard: boolean;
  created_at: string;
  updated_at: string;
};

export type MerchantRule = {
  id: string;
  user_id: string | null;
  merchant_pattern: string;
  category: string;
  source: 'default' | 'user' | 'ai';
  confidence: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type RecurringSubscription = {
  merchant: string;
  category: string;
  payment_method: string | null;
  average_amount: number;
  occurrences: number;
  first_charge: string;
  last_charge: string;
  cadence_days: number | null;
  confidence: number;
};

export type SpendingAnomaly = {
  category: string;
  current_spending: number;
  baseline_monthly_average: number;
  difference: number;
  variance_percent: number;
  severity: 'new' | 'warning' | 'critical' | 'normal';
};

export type BiggestTransaction = {
  id: string;
  occurred_on: string;
  amount: number;
  category: string;
  merchant: string | null;
  payment_method: string | null;
};

export type Investment = {
  id: string;
  user_id: string;
  name: string;
  account: string | null;
  quantity: number;
  cost_basis: number;
  current_value: number;
  as_of: string;
  created_at: string;
  updated_at: string;
};

export type Asset = {
  id: string;
  user_id: string;
  name: string;
  asset_type: 'cash' | 'bank' | 'investment' | 'property' | 'vehicle' | 'other';
  value: number;
  as_of: string;
  created_at: string;
  updated_at: string;
};

export type Liability = {
  id: string;
  user_id: string;
  name: string;
  liability_type: 'mortgage' | 'car_loan' | 'credit_card' | 'personal_loan' | 'other';
  balance: number;
  as_of: string;
  created_at: string;
  updated_at: string;
};

export type Property = {
  id: string;
  user_id: string;
  name: string;
  address: string | null;
  market_value: number;
  mortgage_balance: number;
  as_of: string;
  created_at: string;
  updated_at: string;
};

export type Profile = {
  id: string;
  user_id: string;
  full_name: string | null;
  currency: string;
  monthly_income_target: number;
  monthly_budget_target: number;
  created_at: string;
  updated_at: string;
};

type Table<T> = {
  Row: T;
  Insert: Partial<T>;
  Update: Partial<T>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<Profile>;
      transactions: Table<Transaction>;
      budgets: Table<Budget>;
      monthly_budgets: Table<MonthlyBudget>;
      investments: Table<Investment>;
      assets: Table<Asset>;
      liabilities: Table<Liability>;
      properties: Table<Property>;
      categories: Table<Category>;
      merchant_rules: Table<MerchantRule>;
      recurring_incomes: Table<RecurringIncome>;
      payment_methods: {
        Row: { id: string; user_id: string | null; name: string; created_at: string };
        Insert: { id?: string; user_id?: string | null; name: string; created_at?: string };
        Update: { id?: string; user_id?: string | null; name?: string; created_at?: string };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_transaction_period_summary: {
        Args: { p_start_date: string; p_end_date: string };
        Returns: { income: number; spending: number }[];
      };
      get_transaction_daily_summary: {
        Args: { p_start_date: string; p_end_date: string };
        Returns: { day: string; income: number; spending: number }[];
      };
      get_transaction_category_summary: {
        Args: { p_start_date: string; p_end_date: string };
        Returns: { category: string; spending: number }[];
      };
      get_dashboard_period_summary: {
        Args: { p_start_date: string; p_end_date: string };
        Returns: { income: number; spending: number }[];
      };
      get_dashboard_daily_summary: {
        Args: { p_start_date: string; p_end_date: string };
        Returns: { day: string; income: number; spending: number }[];
      };
      get_dashboard_category_summary: {
        Args: { p_start_date: string; p_end_date: string };
        Returns: { category: string; spending: number }[];
      };
      get_recurring_subscriptions: {
        Args: { p_months?: number };
        Returns: RecurringSubscription[];
      };
      get_spending_anomalies: {
        Args: { p_start_date: string; p_end_date: string; p_baseline_months?: number };
        Returns: SpendingAnomaly[];
      };
      get_biggest_transactions: {
        Args: { p_start_date: string; p_end_date: string; p_limit?: number };
        Returns: BiggestTransaction[];
      };
      process_recurring_incomes: {
        Args: { p_as_of?: string };
        Returns: number;
      };
    };
    Enums: {
      transaction_type: TransactionType;
      asset_type: Asset['asset_type'];
      liability_type: Liability['liability_type'];
    };
    CompositeTypes: Record<string, never>;
  };
};
