import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';

export type Language = 'en' | 'zh-CN';

const translations: Record<string, string> = {
  Dashboard: '仪表板', Add: '记账', Income: '收入', Transactions: '交易', Expenses: '支出',
  Import: '导入', Budgets: '预算', Budget: '预算', Automations: '自动化', Reports: '报表',
  Investments: '投资', Settings: '设置', Logout: '退出登录',
  'Add expense': '添加支出', 'Import & Export': '导入与导出', 'What’s New': '最新动态',
  Profile: '个人资料', Password: '密码', Language: '语言', English: 'English', '简体中文': '简体中文',
  Email: '电子邮件', 'Full name': '姓名', Currency: '货币', 'New password': '新密码',
  'Save settings': '保存设置', 'Update password': '更新密码', Save: '保存', Cancel: '取消', Delete: '删除', Edit: '编辑',
  Search: '搜索', Category: '类别', 'Category name': '类别名称', Color: '颜色', 'Add category': '添加类别',
  Amount: '金额', Date: '日期', Description: '说明', Merchant: '商家', Notes: '备注', Account: '账户',
  'Manage profile preferences and user-owned categories.': '管理个人偏好和自定义类别。',
  'Your personal details and preferred currency.': '您的个人资料和首选货币。',
  'Keep your SaveLah account protected.': '保护您的 SaveLah 账户。',
  'Choose the language used throughout SaveLah.': '选择 SaveLah 全局使用的语言。',
  'Search, filter, edit, and delete expenses.': '搜索、筛选、编辑和删除支出。',
  'Track investment positions and portfolio value.': '跟踪投资持仓和投资组合价值。',
  'Open navigation menu': '打开导航菜单', 'Close navigation menu': '关闭导航菜单', 'Quick add expense': '快速添加支出',
  'Settings saved.': '设置已保存。', 'Password updated.': '密码已更新。', 'Category added.': '类别已添加。',
  'Category updated.': '类别已更新。', 'Category archived.': '类别已归档。', 'Category restored.': '类别已恢复。',
  'No categories here.': '暂无类别。', 'Active categories': '使用中的类别', 'Archived categories': '已归档的类别',
  'Category Management': '类别管理', 'Merchant Rules': '商家规则', 'Merchant contains': '商家名称包含',
  'Add rule': '添加规则', 'Learned merchant rules': '已学习的商家规则', 'Default merchant rules': '默认商家规则',
  'Active categories appear throughout SaveLah. Use the eye button to include or exclude a category from dashboard spending only.': '使用中的类别会显示在 SaveLah 各处。使用眼睛按钮决定是否将该类别计入仪表板支出。',
  'Learned rules override defaults and power future auto-categorization.': '已学习的规则会覆盖默认规则，并用于今后的自动分类。',
};

Object.assign(translations, {
  'Add Expense': '添加支出', Expense: '支出', Export: '导出', Confirm: '确认', All: '全部',
  From: '开始日期', To: '结束日期', Month: '月份', Day: '日', Type: '类型', Status: '状态',
  Payment: '付款方式', 'Payment Method': '付款方式', 'Payment method': '付款方式',
  Search: '搜索', Sort: '排序', Newest: '最新', 'Newest first': '最新优先', 'Oldest first': '最早优先',
  'Merchant A-Z': '商家名称 A-Z', 'Highest amount': '金额最高', 'Lowest amount': '金额最低',
  'All categories': '所有类别', 'All payments': '所有付款方式', 'No matching transactions': '没有符合条件的交易',
  'Try a different search, filter, or sort option.': '请尝试其他搜索、筛选或排序选项。',
  'No transactions yet': '暂无交易', 'Save transaction': '保存交易', 'Cancel edit': '取消编辑',
  'Add income instead': '改为添加收入', 'Amount, merchant, category, save.': '填写金额、商家和类别，然后保存。',
  'Repeat this expense monthly': '每月重复此支出', 'Repeat on day': '每月重复日期',
  'Log this expense now, then add it automatically each month.': '立即记录此支出，之后每月自动添加。',
  'For shorter months, SaveLah uses the final day of the month.': '如果当月天数较少，SaveLah 将使用该月最后一天。',
  'Add an active category in Settings before saving expenses.': '保存支出前，请先在设置中添加一个使用中的类别。',
  'Income source': '收入来源', 'Date received': '收款日期', 'One-time': '一次性', 'Monthly recurring': '每月定期',
  'Day each month': '每月日期', 'Starting month': '开始月份', 'Monthly income schedules': '每月收入计划',
  'No recurring income yet': '暂无定期收入', 'Salary, freelance, allowance...': '工资、自由职业、津贴……',
  'Add money you receive once, or schedule it automatically for the same date every month.': '添加一次性收入，或设置为每月同一日期自动记录。',
  'Choose Monthly recurring to automate salary or other predictable income.': '选择“每月定期”，可自动记录工资或其他固定收入。',
  'Pause or remove future income without changing transactions already recorded.': '可暂停或删除未来收入，不会影响已记录的交易。',
  'Monthly Budget': '月度预算', 'Total budget': '总预算', 'Monthly budget': '月度预算', 'Save total': '保存总额',
  Allocation: '分配额', Allocated: '已分配', Spent: '已花费', 'Actual spent': '实际支出', Remaining: '剩余', Unallocated: '未分配',
  'Budget remaining': '剩余预算', 'Remaining budget': '剩余预算', 'Budget used': '预算使用率',
  'Category Allocation': '类别预算分配', 'Category budgets': '类别预算', 'Save allocations': '保存分配',
  'Set one spending limit for this month.': '为本月设定一个支出上限。', 'Split the monthly budget by category.': '按类别分配月度预算。',
  'Allocated, spent, and remaining by category.': '按类别查看已分配、已花费和剩余金额。',
  'No category budgets set for this month.': '本月尚未设置类别预算。', 'No budget or allocation set.': '尚未设置预算或分配。',
  'Add or include an active category in Settings before allocating budget.': '分配预算前，请先在设置中添加或启用类别。',
  'On Track': '进度正常', 'Near Limit': '接近上限', 'Over Budget': '超出预算', 'Budget status:': '预算状态：',
  'Near Limit starts at 80%. Over Budget starts at 100%.': '使用率达 80% 为接近上限，达 100% 为超出预算。',
  'Import credit card or bank statements, preview mapped rows, skip duplicates, and export your data.': '导入信用卡或银行对账单，预览匹配结果，跳过重复项并导出数据。',
  'Upload Statement': '上传对账单', 'Statement type': '对账单类型', 'Credit Card Statement': '信用卡对账单', 'Bank Statement': '银行对账单',
  'CSV file': 'CSV 文件', 'Column Mapping': '列匹配', 'Preview Before Import': '导入前预览', 'Import Summary': '导入摘要',
  'Upload a CSV and complete column mapping to preview rows.': '上传 CSV 并完成列匹配后预览数据。',
  'After upload, map statement columns to transaction fields.': '上传后，将对账单列匹配到交易字段。',
  'Upload a CSV first': '请先上传 CSV', 'No preview yet': '暂无预览', 'Not mapped': '未匹配', 'Ready to import': '可导入',
  'Needs confirmation': '需确认', 'Duplicates skipped': '已跳过重复项', 'Invalid skipped': '已跳过无效项', 'Duplicate keys checked': '已检查重复键',
  'Reports': '报表', 'Monthly Financial Report': '月度财务报告', 'Monthly Budget Report': '月度预算报告',
  'Financial Health Score': '财务健康评分', 'Financial health': '财务健康', 'Cash flow': '现金流', 'Cash flow rhythm': '现金流趋势',
  Savings: '储蓄', 'Savings rate': '储蓄率', 'Savings Recommendations': '储蓄建议', Spending: '支出', 'Spending by category': '按类别查看支出',
  'Spending Anomaly Detection': '异常支出检测', 'Overspending Report': '超支报告', 'Budget vs Actual': '预算与实际支出',
  'Budget Risk Prediction': '预算风险预测', 'Largest category': '最大支出类别', 'Biggest transactions': '最大额交易', 'Top categories': '主要支出类别',
  'No spending categories for this period.': '此期间暂无支出类别。', 'No categories are over budget for the selected period.': '所选期间没有类别超出预算。',
  'No unusually high category spending detected for this month.': '本月未检测到异常高额的类别支出。', 'No obvious savings cuts found this month.': '本月未发现明显可削减的支出。',
  'Investments': '投资', 'Add investment': '添加投资', Name: '名称', Quantity: '数量', Cost: '成本', 'Cost basis': '成本基础', Value: '价值', 'Current value': '当前价值',
  'Portfolio value': '投资组合价值', Positions: '持仓', Tracked: '已跟踪', Difference: '差额',
  'Smart Automations': '智能自动化', Automation: '自动化', 'Anomaly alerts': '异常提醒', 'Detected subscriptions': '已检测的订阅',
  'Subscriptions Dashboard': '订阅仪表板', 'Scheduled Monthly Subscriptions': '已计划的每月订阅', 'Scheduled monthly': '每月计划',
  'No automatic subscriptions yet. Switch on Repeat this expense monthly when adding an expense.': '暂无自动订阅。添加支出时，可开启“每月重复此支出”。',
  'No monthly recurring charges detected yet. Three similar monthly charges are needed before a subscription appears here.': '暂未检测到每月重复扣款。需要三笔相似的每月扣款才会在此显示订阅。',
  'Current month spending': '本月支出', 'Projected monthly spending': '预计月度支出', 'Projected overage': '预计超支',
  'Welcome back': '欢迎回来', Login: '登录', 'Create account': '创建账户', 'Create your account': '创建您的账户',
  'Forgot password?': '忘记密码？', 'Back to login': '返回登录', 'Reset password': '重置密码', 'Already have an account?': '已有账户？', 'Remembered it?': '想起密码了？',
  'Helping you become less broke': '帮你更从容地管理金钱', 'Small habits. Bigger future.': '小习惯，大未来。', 'Private by design. Built for your next milestone.': '专注隐私，陪你迈向下一个里程碑。',
  'Loading secure workspace...': '正在加载安全工作区……', 'Install app': '安装应用', 'Add to Home Screen': '添加到主屏幕',
  'Install SaveLah for faster access in a standalone app window.': '安装 SaveLah，即可在独立应用窗口中更快访问。',
  'What\'s New': '最新动态', 'See recent SaveLah features, improvements, and fixes.': '查看 SaveLah 最近的新功能、改进和修复。',
  'A simple record of the features, improvements, and fixes added to SaveLah.': '记录 SaveLah 新增的功能、改进和修复。', 'No update notes are available yet.': '暂无更新说明。',
  'Merchant, category, notes': '商家、类别、备注', 'Recent activity': '最近活动', 'Your latest money moments.': '您最近的资金动态。',
  'Where did you spend?': '钱花到哪里了？', 'Where it went': '支出去向', 'Your spending mix by category.': '按类别查看您的支出构成。',
  'Budget pulse': '预算概况', 'Your most important spending limits at a glance.': '一眼掌握最重要的支出上限。',
  'Add expenses to populate your dashboard.': '添加支出后，仪表板将显示数据。', 'No category data for this month.': '本月暂无类别数据。', 'No weekly expenses yet.': '暂无每周支出。',
  'A private date-bounded view of income, spending, budgets, and investments.': '按指定日期范围查看收入、支出、预算和投资。',
  'Monthly trend': '月度趋势', 'Looking good': '状态良好', 'How this month\'s spending compares with your plan.': '查看本月支出与计划的对比。',
  'Income and spending movement across the selected period.': '所选期间的收入和支出趋势。', 'spending': '支出', 'income': '收入',
  'Counted in dashboard spending': '已计入仪表板支出', 'Excluded from dashboard spending': '已从仪表板支出中排除',
  'Include category in dashboard spending': '将类别计入仪表板支出', 'Exclude category from dashboard spending': '从仪表板支出中排除类别',
  'Include on dashboard': '计入仪表板', 'Exclude from dashboard': '从仪表板中排除',
  'Edit category': '编辑类别', 'Archive category': '归档类别', 'Restore category': '恢复类别', 'Save category': '保存类别',
  'Edit merchant rule': '编辑商家规则', 'Delete merchant rule': '删除商家规则', 'Save merchant rule': '保存商家规则',
  'Dismiss what\'s new': '关闭最新动态', 'Better budget planning': '更好的预算规划', New: '新增', Improved: '改进', 'YAY!': '好的！',
  'Budgets now show your monthly plan, category allocations, and real spending side by side.': '预算现在可以并列显示月度计划、类别分配和实际支出。',
  'Added monthly budget editing and category allocation inside the existing Budget section.': '在现有预算页面中新增了月度预算编辑和类别分配。',
  'Added allocation charts, category percentages, remaining amounts, and budget status badges.': '新增了分配图表、类别百分比、剩余金额和预算状态标识。',
  'Budget spending now excludes Income and Credit Card Repayment while still counting expense transfers.': '预算支出现已排除收入和信用卡还款，但仍会计入支出转账。',
  'Analyze category concentration, cash flow, savings performance, and budget health for a selected period.': '分析所选期间的支出类别集中度、现金流、储蓄表现和预算健康状况。',
  'A simple pulse check on your plan and remaining room.': '快速了解您的计划进度和剩余空间。', Metric: '指标', Usage: '使用率',
  healthy: '健康', Available: '可用', tracked: '已跟踪', 'See where your money gathered during this period.': '查看此期间的支出去向。',
  'Categories that moved beyond their planned limit.': '查看超出计划上限的类别。',
  'Credit Card': '信用卡', 'Debit Card': '借记卡', Cash: '现金', "Touch n' Go": 'Touch n\' Go', 'Bank Transfer/QR': '银行转账/QR',
  expense: '支出', 'Load more': '加载更多', 'Saved total': '已保存总额', 'Left to assign': '待分配',
  'Where the month is planned to go.': '查看本月预算的计划去向。', 'Usage Chart': '使用率图表', 'Compare allocated budget with actual spending.': '对比已分配预算和实际支出。',
  'Save expense': '保存支出', 'Add income': '添加收入', 'Record salary, freelance work, refunds, or other money received.': '记录工资、自由职业收入、退款或其他收入。',
  Active: '启用中', Paused: '已暂停', Pause: '暂停', Resume: '恢复', Starts: '开始于', Last: '上次', Latest: '最新',
  'Last added': '上次添加于', 'category is excluded from dashboard spending.': '个类别已从仪表板支出中排除。',
  'category is excluded from spending and category budgets on this page.': '个类别已从此页的支出和类别预算中排除。',
  of: '/', assigned: '已分配', used: '已使用',
  'category is': '个类别', 'categories are': '个类别', 'excluded from dashboard spending.': '已从仪表板支出中排除。',
  'excluded from spending and category budgets on this page.': '已从此页的支出和类别预算中排除。',
});

type StoredText = { source: string; translated: string };
const storedText = new WeakMap<Text, StoredText>();
const storedAttributes = new WeakMap<Element, Map<string, StoredText>>();

function translatedText(text: string, language: Language) {
  if (language === 'en') return text;
  const trimmed = text.trim();
  const exact = translations[trimmed];
  if (exact) return text.replace(trimmed, exact);
  return text
    .replace(/^Plan and track (.+)\.$/, '规划并跟踪 $1。')
    .replace(/^(\d+) category is excluded from dashboard spending\.$/, '$1 个类别已从仪表板支出中排除。')
    .replace(/^(\d+) category is excluded from spending and category budgets on this page\.$/, '此页面有 $1 个类别已从支出和类别预算中排除。')
    .replace(/(\d+(?:\.\d+)?)% assigned/g, '已分配 $1%')
    .replace(/(\d+(?:\.\d+)?)% used/g, '已使用 $1%')
    .replace(/\beach month\b/g, '每月')
    .replace(/^Starts (.+) · Last added (.+)$/, '开始于 $1 · 上次添加于 $2')
    .replace(/^(Over by)\s+/, '超出 ')
    .replace(/^(Budget status:)$/, '预算状态：')
    .replace(/\bleft to spend\b/g, '可用')
    .replace(/\bremaining\b/g, '剩余')
    .replace(/\bspent\b/g, '已花费')
    .replace(/\bof budget\b/g, '预算')
    .replace(/\bconfidence\b/g, '置信度')
    .replace(/\s+of\s+/g, ' / ');
}

function localizeDom(root: ParentNode, language: Language) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode() as Text | null;
  while (node) {
    if (!['SCRIPT', 'STYLE'].includes(node.parentElement?.tagName ?? '')) {
      const current = node.nodeValue ?? '';
      const previous = storedText.get(node);
      if (!previous || (current !== previous.source && current !== previous.translated)) {
        storedText.set(node, { source: current, translated: translatedText(current, 'zh-CN') });
      }
      const stored = storedText.get(node)!;
      const desired = language === 'en' ? stored.source : stored.translated;
      if (node.nodeValue !== desired) node.nodeValue = desired;
    }
    node = walker.nextNode() as Text | null;
  }

  const elements = root instanceof Element ? [root, ...root.querySelectorAll('*')] : [...root.querySelectorAll('*')];
  for (const element of elements) {
    const values = storedAttributes.get(element) ?? new Map<string, StoredText>();
    for (const attribute of ['placeholder', 'title', 'aria-label']) {
      const current = element.getAttribute(attribute);
      if (!current) continue;
      const previous = values.get(attribute);
      if (!previous || (current !== previous.source && current !== previous.translated)) {
        values.set(attribute, { source: current, translated: translatedText(current, 'zh-CN') });
      }
      const stored = values.get(attribute)!;
      const desired = language === 'en' ? stored.source : stored.translated;
      if (current !== desired) element.setAttribute(attribute, desired);
    }
    if (values.size) storedAttributes.set(element, values);
  }
}

type LanguageContextValue = { language: Language; setLanguage: (language: Language) => void; t: (text: string) => string };
const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: PropsWithChildren) {
  const [language, setLanguage] = useState<Language>(() => localStorage.getItem('savelah-language') === 'zh-CN' ? 'zh-CN' : 'en');

  useEffect(() => {
    localStorage.setItem('savelah-language', language);
    document.documentElement.lang = language;
    localizeDom(document.body, language);
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'characterData' && mutation.target.parentNode) localizeDom(mutation.target.parentNode, language);
        if (mutation.type === 'childList') mutation.addedNodes.forEach((node) => {
          if (node instanceof Element || node instanceof DocumentFragment) localizeDom(node, language);
          if (node instanceof Text && node.parentNode) localizeDom(node.parentNode, language);
        });
        if (mutation.type === 'attributes' && mutation.target instanceof Element) localizeDom(mutation.target, language);
      }
    });
    observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['placeholder', 'title', 'aria-label'] });
    return () => observer.disconnect();
  }, [language]);

  const value = useMemo(() => ({ language, setLanguage, t: (text: string) => translatedText(text, language) }), [language]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
}
