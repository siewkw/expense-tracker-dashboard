import type { Category, MerchantRule } from '../types/database';

export type CategorizationResult = {
  category: string;
  confidence: number;
  source: 'merchant_rule' | 'user_learning' | 'ai_fallback';
  needsConfirmation: boolean;
  matchedRuleId?: string;
};

const fallbackKeywords: Array<[string, string[], number]> = [
  ['Coffee', ['coffee', 'cafe', 'starbucks', 'bean'], 0.78],
  ['Petrol', ['petrol', 'fuel', 'shell', 'petronas', 'setel', 'bhp', 'caltex'], 0.82],
  ['Transport', ['grab', 'taxi', 'rapidkl', 'mrt', 'lrt', 'touch n go', 'tng'], 0.72],
  ['Utilities', ['tnb', 'water', 'utility', 'electric', 'electricity', 'unifi', 'internet'], 0.76],
  ['Subscriptions', ['netflix', 'spotify', 'subscription', 'apple.com', 'google storage'], 0.82],
  ['Shopping', ['shopee', 'lazada', 'mall', 'store', 'shop'], 0.78],
  ['Gaming', ['steam', 'playstation', 'xbox', 'nintendo', 'game'], 0.82],
  ['Meals', ['restaurant', 'food', 'mcd', 'kfc', 'nasi', 'pizza', 'burger'], 0.7],
  ['Groceries', ['grocer', 'grocery', 'supermarket', 'aeon', 'lotus'], 0.74],
];

export function categorizeMerchant(merchant: string, rules: MerchantRule[], categories: Category[], fallbackCategory = 'Others'): CategorizationResult {
  const activeCategoryNames = categories.filter((category) => !category.is_archived).map((category) => category.name);
  const normalizedMerchant = merchant.trim().toLowerCase();
  const activeRules = rules.filter((rule) => rule.is_active);
  const userRules = activeRules.filter((rule) => rule.user_id);
  const defaultRules = activeRules.filter((rule) => !rule.user_id);

  const userMatch = findRule(normalizedMerchant, userRules, activeCategoryNames);
  if (userMatch) {
    return {
      category: userMatch.category,
      confidence: userMatch.confidence,
      source: 'user_learning',
      needsConfirmation: false,
      matchedRuleId: userMatch.id,
    };
  }

  const defaultMatch = findRule(normalizedMerchant, defaultRules, activeCategoryNames);
  if (defaultMatch) {
    return {
      category: defaultMatch.category,
      confidence: defaultMatch.confidence,
      source: 'merchant_rule',
      needsConfirmation: false,
      matchedRuleId: defaultMatch.id,
    };
  }

  const fallbackMatch = fallbackKeywords.find(([category, keywords]) => activeCategoryNames.includes(category) && keywords.some((keyword) => normalizedMerchant.includes(keyword)));
  if (fallbackMatch) {
    const [, , confidence] = fallbackMatch;
    return {
      category: fallbackMatch[0],
      confidence,
      source: 'ai_fallback',
      needsConfirmation: confidence < 0.75,
    };
  }

  const category = activeCategoryNames.includes(fallbackCategory) ? fallbackCategory : activeCategoryNames[0] ?? fallbackCategory;
  return {
    category,
    confidence: 0.42,
    source: 'ai_fallback',
    needsConfirmation: true,
  };
}

function findRule(normalizedMerchant: string, rules: MerchantRule[], activeCategoryNames: string[]) {
  return rules
    .filter((rule) => activeCategoryNames.includes(rule.category))
    .sort((a, b) => Number(Boolean(b.user_id)) - Number(Boolean(a.user_id)) || b.confidence - a.confidence)
    .find((rule) => normalizedMerchant.includes(rule.merchant_pattern.trim().toLowerCase()));
}
