import type { CostAssumptions, CreatorCostDashboard, Family, FamilySubscription, StorageAddon, StorageCostSummary, StoragePlan, StorageUsage, StorageWarningThreshold } from '../types/domain';

export const storagePlans: StoragePlan[] = [
  {
    id: 'free',
    label: 'Free',
    monthlyPriceCents: 0,
    currency: 'USD',
    quotaBytes: 1 * 1024 ** 3,
    maxFileBytes: 500 * 1024 ** 2,
    maxVideoBytes: 500 * 1024 ** 2,
    aiTranscriptionMinutes: 0,
    backupAllowanceBytes: 0,
    maxFamilyMembers: 5,
    features: ['Basic family tree', 'Basic memories'],
    active: true
  },
  {
    id: 'family',
    label: 'Family',
    monthlyPriceCents: 799,
    currency: 'USD',
    quotaBytes: 100 * 1024 ** 3,
    maxFileBytes: 5 * 1024 ** 3,
    maxVideoBytes: 5 * 1024 ** 3,
    aiTranscriptionMinutes: 60,
    backupAllowanceBytes: 0,
    features: ['Unlimited family members', 'Photos', 'Videos', 'Audio', 'Family sharing'],
    active: true
  },
  {
    id: 'family_plus',
    label: 'Family Plus',
    monthlyPriceCents: 1999,
    currency: 'USD',
    quotaBytes: 500 * 1024 ** 3,
    maxFileBytes: 10 * 1024 ** 3,
    maxVideoBytes: 10 * 1024 ** 3,
    aiTranscriptionMinutes: 300,
    backupAllowanceBytes: 0,
    features: ['Advanced storage', 'Advanced search', 'AI transcription allowance'],
    active: true
  },
  {
    id: 'legacy',
    label: 'Legacy',
    monthlyPriceCents: 4999,
    currency: 'USD',
    quotaBytes: 1 * 1024 ** 4,
    maxFileBytes: 50 * 1024 ** 3,
    maxVideoBytes: 50 * 1024 ** 3,
    aiTranscriptionMinutes: 1200,
    backupAllowanceBytes: 1 * 1024 ** 4,
    features: ['Large family archive', 'Legacy preservation features', 'Advanced archive tools'],
    active: true
  }
];

export const defaultCostAssumptions: CostAssumptions = {
  storageCostPerGbMonth: 0,
  bandwidthCostPerGb: 0,
  backupCostPerGbMonth: 0,
  requestCostPer1000: 0,
  aiCostPerMinute: 0,
  aiCostPerGb: 0,
  paymentProcessingPercentage: 0,
  paymentProcessingFixedFeeCents: 0,
  monthlyBudgetCents: 0,
  budgetWarningPct: 75,
  budgetCriticalPct: 90,
  budgetEmergencyPct: 100,
  currency: 'USD'
};

export const defaultStorageThresholds: StorageWarningThreshold[] = [
  { id: 'info_50', percentUsed: 50, severity: 'info', message: 'Your family has used more than 50% of its storage.' },
  { id: 'warning_75', percentUsed: 75, severity: 'warning', message: 'Your family has used more than 75% of its storage.' },
  { id: 'critical_90', percentUsed: 90, severity: 'critical', message: 'Your family has used more than 90% of its storage.' },
  { id: 'urgent_95', percentUsed: 95, severity: 'urgent', message: 'Your family has used more than 95% of its storage.' },
  { id: 'blocked_100', percentUsed: 100, severity: 'blocked', message: 'Your family storage is full. Uploads are blocked until you free space or upgrade.' }
];

export function cents(amount: number): number {
  return Math.round(amount * 100);
}

export function totalStorageUsed(usage: StorageUsage): number {
  return usage.videosBytes + usage.photosBytes + usage.audioBytes + usage.documentsBytes + (usage.thumbnailBytes ?? 0) + (usage.archiveBytes ?? 0);
}

export function effectiveStorageLimit(plan: StoragePlan, addons: StorageAddon[] = []): number {
  return plan.quotaBytes + addons.filter(addon => addon.status === 'active' || addon.status === 'trial').reduce((sum, addon) => sum + addon.additionalBytes, 0);
}

export function formatCurrency(centsValue: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(centsValue / 100);
}

export function planForFamily(family: Family, plans: StoragePlan[] = storagePlans): StoragePlan {
  return plans.find(plan => plan.id === family.storagePlanId) ?? plans.find(plan => plan.id === 'family_plus') ?? plans[0];
}

export function subscriptionForFamily(family: Family): FamilySubscription {
  const plan = planForFamily(family);
  return {
    id: `subscription-${family.id}`,
    familyId: family.id,
    planId: plan.id,
    status: 'trial',
    cancelAtPeriodEnd: false,
    paymentsConnected: false
  };
}

export function calculateStorageCostSummary(input: {
  usage: StorageUsage;
  plan: StoragePlan;
  addons?: StorageAddon[];
  assumptions?: CostAssumptions;
  thresholds?: StorageWarningThreshold[];
  aiMinutesUsed?: number;
}): StorageCostSummary {
  const assumptions = input.assumptions ?? defaultCostAssumptions;
  const allowedBytes = effectiveStorageLimit(input.plan, input.addons ?? []);
  const usedBytes = totalStorageUsed(input.usage);
  const remainingBytes = Math.max(allowedBytes - usedBytes, 0);
  const percentUsed = allowedBytes > 0 ? Math.min(100, (usedBytes / allowedBytes) * 100) : 100;
  const usedGb = usedBytes / 1024 ** 3;
  const bandwidthGb = (input.usage.bandwidthBytes ?? 0) / 1024 ** 3;
  const backupGb = (input.usage.archiveBytes ?? 0) / 1024 ** 3;
  const estimatedStorageCostCents = cents(usedGb * assumptions.storageCostPerGbMonth);
  const estimatedBandwidthCostCents = cents(bandwidthGb * assumptions.bandwidthCostPerGb);
  const estimatedBackupCostCents = cents(backupGb * assumptions.backupCostPerGbMonth);
  const estimatedAiCostCents = cents((input.aiMinutesUsed ?? 0) * assumptions.aiCostPerMinute);
  const monthlyRevenueCents = input.plan.monthlyPriceCents + (input.addons ?? []).filter(addon => addon.status === 'active' || addon.status === 'trial').reduce((sum, addon) => sum + addon.monthlyPriceCents, 0);
  const estimatedPaymentProcessingCents = monthlyRevenueCents > 0 ? Math.round(monthlyRevenueCents * (assumptions.paymentProcessingPercentage / 100)) + assumptions.paymentProcessingFixedFeeCents : 0;
  const estimatedTotalCostCents = estimatedStorageCostCents + estimatedBandwidthCostCents + estimatedBackupCostCents + estimatedAiCostCents + estimatedPaymentProcessingCents;
  const estimatedGrossProfitCents = monthlyRevenueCents - estimatedTotalCostCents;
  const estimatedMarginPct = monthlyRevenueCents > 0 ? (estimatedGrossProfitCents / monthlyRevenueCents) * 100 : null;
  const warning = [...(input.thresholds ?? defaultStorageThresholds)].sort((a, b) => b.percentUsed - a.percentUsed).find(threshold => percentUsed >= threshold.percentUsed);
  return { usedBytes, allowedBytes, remainingBytes, percentUsed, estimatedStorageCostCents, estimatedBandwidthCostCents, estimatedBackupCostCents, estimatedAiCostCents, estimatedPaymentProcessingCents, estimatedTotalCostCents, monthlyRevenueCents, estimatedGrossProfitCents, estimatedMarginPct, warning };
}

export function canStartUpload(summary: StorageCostSummary, fileBytes: number): { allowed: boolean; reason?: string } {
  if (fileBytes <= summary.remainingBytes) return { allowed: true };
  return { allowed: false, reason: `Not enough storage. You have ${summary.remainingBytes} bytes remaining, but this upload requires approximately ${fileBytes} bytes.` };
}

export function createCreatorCostDashboard(input: {
  families: Family[];
  usages: Record<string, StorageUsage>;
  plans?: StoragePlan[];
  assumptions?: CostAssumptions;
}): CreatorCostDashboard {
  const plans = input.plans ?? storagePlans;
  const assumptions = input.assumptions ?? defaultCostAssumptions;
  const rows = input.families.map(family => {
    const plan = planForFamily(family, plans);
    const usage = input.usages[family.id] ?? { familyId: family.id, videosBytes: 0, photosBytes: 0, audioBytes: 0, documentsBytes: 0, limitBytes: plan.quotaBytes };
    const summary = calculateStorageCostSummary({ usage, plan, assumptions });
    return { family, plan, usage, summary };
  });
  const totalFamilies = rows.length;
  const paidRows = rows.filter(row => row.plan.monthlyPriceCents > 0);
  const freeRows = rows.filter(row => row.plan.monthlyPriceCents === 0);
  const sum = (selector: (row: typeof rows[number]) => number) => rows.reduce((acc, row) => acc + selector(row), 0);
  const totalStorageBytes = sum(row => row.summary.usedBytes);
  const monthlyRevenueCents = sum(row => row.summary.monthlyRevenueCents);
  const estimatedInfrastructureCostCents = sum(row => row.summary.estimatedTotalCostCents);
  const estimatedGrossProfitCents = monthlyRevenueCents - estimatedInfrastructureCostCents;
  const planProfitability = plans.map(plan => {
    const planRows = rows.filter(row => row.plan.id === plan.id);
    const averageStorageBytes = planRows.length ? planRows.reduce((acc, row) => acc + row.summary.usedBytes, 0) / planRows.length : 0;
    const estimatedCostCents = planRows.reduce((acc, row) => acc + row.summary.estimatedTotalCostCents, 0);
    const revenueCents = planRows.reduce((acc, row) => acc + row.summary.monthlyRevenueCents, 0);
    return { planId: plan.id, revenueCents, averageStorageBytes, estimatedCostCents, marginCents: revenueCents - estimatedCostCents };
  });
  return {
    totalFamilies,
    freeFamilies: freeRows.length,
    paidFamilies: paidRows.length,
    totalStorageBytes,
    videoBytes: sum(row => row.usage.videosBytes),
    photoBytes: sum(row => row.usage.photosBytes),
    audioBytes: sum(row => row.usage.audioBytes),
    documentBytes: sum(row => row.usage.documentsBytes),
    bandwidthBytes: sum(row => row.usage.bandwidthBytes ?? 0),
    monthlyRevenueCents,
    estimatedInfrastructureCostCents,
    estimatedGrossProfitCents,
    estimatedMarginPct: monthlyRevenueCents > 0 ? (estimatedGrossProfitCents / monthlyRevenueCents) * 100 : null,
    storageCostPerFamilyCents: totalFamilies ? Math.round(estimatedInfrastructureCostCents / totalFamilies) : 0,
    averageStoragePerPaidFamilyBytes: paidRows.length ? paidRows.reduce((acc, row) => acc + row.summary.usedBytes, 0) / paidRows.length : 0,
    averageStoragePerFreeFamilyBytes: freeRows.length ? freeRows.reduce((acc, row) => acc + row.summary.usedBytes, 0) / freeRows.length : 0,
    highestStorageFamilies: [...rows].sort((a, b) => b.summary.usedBytes - a.summary.usedBytes).slice(0, 5).map(row => ({ familyId: row.family.id, familyName: row.family.name, usedBytes: row.summary.usedBytes, planId: row.plan.id })),
    approachingLimits: rows.filter(row => row.summary.percentUsed >= 75).map(row => ({ familyId: row.family.id, familyName: row.family.name, percentUsed: row.summary.percentUsed })),
    planProfitability,
    forecast: {
      currentBytes: totalStorageBytes,
      thirtyDayGrowthBytes: Math.round(totalStorageBytes * 0.08),
      ninetyDayGrowthBytes: Math.round(totalStorageBytes * 0.24),
      oneYearProjectionBytes: Math.round(totalStorageBytes * 1.96),
      threeYearProjectionBytes: Math.round(totalStorageBytes * 5.76)
    },
    alerts: rows.filter(row => row.summary.warning).map(row => `${row.family.name}: ${row.summary.warning?.message}`)
  };
}
