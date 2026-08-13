import { describe, expect, it } from 'vitest';
import { bytesByType } from '../lib/archiveStore';
import { calculateStorageCostSummary, canStartUpload, createCreatorCostDashboard, storagePlans } from '../lib/storageEconomics';
import type { Family, MemoryMedia, StorageUsage } from '../types/domain';

const gb = 1024 ** 3;

describe('storage economics', () => {
  it('calculates storage used, remaining quota, revenue, cost, and margin from configurable assumptions', () => {
    const plan = storagePlans.find(item => item.id === 'family')!;
    const usage: StorageUsage = { familyId: 'family-1', videosBytes: 60 * gb, photosBytes: 8 * gb, audioBytes: 2 * gb, documentsBytes: Math.round(0.4 * gb), limitBytes: plan.quotaBytes, bandwidthBytes: 5 * gb };
    const summary = calculateStorageCostSummary({ usage, plan, assumptions: { storageCostPerGbMonth: 0.02, bandwidthCostPerGb: 0.1, backupCostPerGbMonth: 0, requestCostPer1000: 0, aiCostPerMinute: 0, aiCostPerGb: 0, paymentProcessingPercentage: 3, paymentProcessingFixedFeeCents: 30, monthlyBudgetCents: 50_000, budgetWarningPct: 75, budgetCriticalPct: 90, budgetEmergencyPct: 100, currency: 'USD' } });
    expect(summary.usedBytes).toBeGreaterThan(70 * gb);
    expect(summary.allowedBytes).toBe(100 * gb);
    expect(summary.monthlyRevenueCents).toBe(799);
    expect(summary.estimatedTotalCostCents).toBeGreaterThan(0);
    expect(summary.estimatedGrossProfitCents).toBe(summary.monthlyRevenueCents - summary.estimatedTotalCostCents);
  });

  it('blocks uploads that would exceed quota before upload begins', () => {
    const plan = storagePlans.find(item => item.id === 'free')!;
    const summary = calculateStorageCostSummary({ usage: { familyId: 'family-1', videosBytes: 900 * 1024 ** 2, photosBytes: 0, audioBytes: 0, documentsBytes: 0, limitBytes: plan.quotaBytes }, plan });
    expect(canStartUpload(summary, 200 * 1024 ** 2).allowed).toBe(false);
  });

  it('active storage calculations ignore failed and deleted media', () => {
    const media: MemoryMedia[] = [
      { id: '1', familyId: 'family-1', memoryId: 'memory-1', storageBucket: 'family-media', storagePath: 'a', mediaType: 'video', bytes: 100, uploadStatus: 'completed' },
      { id: '2', familyId: 'family-1', memoryId: 'memory-1', storageBucket: 'family-media', storagePath: 'b', mediaType: 'photo', bytes: 50, uploadStatus: 'failed' },
      { id: '3', familyId: 'family-1', memoryId: 'memory-1', storageBucket: 'family-media', storagePath: 'c', mediaType: 'audio', bytes: 25, uploadStatus: 'completed', deletedAt: new Date().toISOString() }
    ];
    expect(bytesByType(media)).toMatchObject({ videosBytes: 100, photosBytes: 0, audioBytes: 0 });
  });

  it('creates creator dashboard profitability and forecasting estimates', () => {
    const family: Family = { id: 'family-1', name: 'Willow', storagePlanId: 'family', storageLimitBytes: 100 * gb, createdBy: 'user-1' };
    const dashboard = createCreatorCostDashboard({ families: [family], usages: { [family.id]: { familyId: family.id, videosBytes: 10 * gb, photosBytes: 1 * gb, audioBytes: 0, documentsBytes: 0, limitBytes: 100 * gb } } });
    expect(dashboard.totalFamilies).toBe(1);
    expect(dashboard.planProfitability.some(row => row.planId === 'family')).toBe(true);
    expect(dashboard.forecast.oneYearProjectionBytes).toBeGreaterThan(dashboard.totalStorageBytes);
  });
});
