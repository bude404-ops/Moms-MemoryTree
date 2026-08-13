import { describe, expect, it, vi } from 'vitest';
import type { Family, StorageUsage } from '../types/domain';
import { MediaStorageService, type MediaStorageProvider } from '../lib/mediaStorage';
import { calculateStorageCostSummary, canStartUpload, createCreatorCostDashboard, effectiveStorageLimit, storagePlans } from '../lib/storageEconomics';

const gb = 1024 ** 3;

function usage(familyId: string, gbUsed: number, limitGb = 100): StorageUsage {
  return { familyId, videosBytes: gbUsed * gb, photosBytes: 0, audioBytes: 0, documentsBytes: 0, thumbnailBytes: 0, archiveBytes: 0, bandwidthBytes: 0, limitBytes: limitGb * gb };
}

describe('storage economics and subscriptions', () => {
  it('new family plan allowance comes from configurable plan values', () => {
    const free = storagePlans.find(plan => plan.id === 'free')!;
    const family = storagePlans.find(plan => plan.id === 'family')!;
    expect(free.quotaBytes).toBe(1 * gb);
    expect(family.quotaBytes).toBe(100 * gb);
  });

  it('upgrade and add-ons increase effective quota without deleting memories', () => {
    const family = storagePlans.find(plan => plan.id === 'family')!;
    const plus = storagePlans.find(plan => plan.id === 'family_plus')!;
    const addon = { id: 'addon-100', familyId: 'family-1', label: 'Additional 100 GB', additionalBytes: 100 * gb, monthlyPriceCents: 399, currency: 'USD', status: 'active' as const };
    expect(effectiveStorageLimit(plus)).toBeGreaterThan(effectiveStorageLimit(family));
    expect(effectiveStorageLimit(family, [addon])).toBe(200 * gb);
  });

  it('calculates estimated cost, revenue, and margin separately', () => {
    const plan = storagePlans.find(item => item.id === 'family')!;
    const summary = calculateStorageCostSummary({
      usage: { ...usage('family-1', 72.4), bandwidthBytes: 10 * gb },
      plan,
      assumptions: { storageCostPerGbMonth: 0.02, bandwidthCostPerGb: 0.08, backupCostPerGbMonth: 0, requestCostPer1000: 0, aiCostPerMinute: 0, aiCostPerGb: 0, paymentProcessingPercentage: 2.9, paymentProcessingFixedFeeCents: 30, monthlyBudgetCents: 50000, budgetWarningPct: 75, budgetCriticalPct: 90, budgetEmergencyPct: 100, currency: 'USD' }
    });
    expect(summary.monthlyRevenueCents).toBe(799);
    expect(summary.estimatedStorageCostCents).toBeGreaterThan(0);
    expect(summary.estimatedBandwidthCostCents).toBeGreaterThan(0);
    expect(summary.estimatedGrossProfitCents).toBe(summary.monthlyRevenueCents - summary.estimatedTotalCostCents);
  });

  it('blocks uploads that exceed quota and keeps exact reason separate from UI action', () => {
    const plan = storagePlans.find(item => item.id === 'family')!;
    const summary = calculateStorageCostSummary({ usage: usage('family-1', 98), plan });
    const check = canStartUpload(summary, 3 * gb);
    expect(check.allowed).toBe(false);
    expect(check.reason).toContain('Not enough storage');
  });

  it('creates warning alerts and forecasting estimates for creator dashboard', () => {
    const families: Family[] = [
      { id: 'family-free', name: 'Free House', storageLimitBytes: gb, storagePlanId: 'free', createdBy: 'u1' },
      { id: 'family-paid', name: 'Paid House', storageLimitBytes: 100 * gb, storagePlanId: 'family', createdBy: 'u2' }
    ];
    const dashboard = createCreatorCostDashboard({ families, usages: { 'family-free': usage('family-free', 0.9, 1), 'family-paid': usage('family-paid', 80, 100) } });
    expect(dashboard.totalFamilies).toBe(2);
    expect(dashboard.freeFamilies).toBe(1);
    expect(dashboard.paidFamilies).toBe(1);
    expect(dashboard.approachingLimits).toHaveLength(2);
    expect(dashboard.forecast.oneYearProjectionBytes).toBeGreaterThan(dashboard.forecast.currentBytes);
    expect(dashboard.planProfitability.find(row => row.planId === 'family')?.revenueCents).toBe(799);
  });
});

describe('media storage provider abstraction completeness', () => {
  it('delegates signed URL, delete, metadata, usage, move, and copy through the service boundary', async () => {
    const provider: MediaStorageProvider = {
      id: 'future-cloud',
      prepareUpload: vi.fn(),
      upload: vi.fn(),
      download: vi.fn().mockResolvedValue(new Blob(['x'])),
      createSignedUrl: vi.fn().mockResolvedValue({ signedUrl: 'signed://url', expiresInSeconds: 60, publicUrlAllowed: false }),
      delete: vi.fn().mockResolvedValue(undefined),
      exists: vi.fn().mockResolvedValue(true),
      getMetadata: vi.fn().mockResolvedValue({ bucket: 'family-media', path: 'a/b', bytes: 10, exists: true }),
      getUsage: vi.fn().mockResolvedValue({ usedBytes: 10, objectCount: 1, estimated: true }),
      move: vi.fn().mockResolvedValue(undefined),
      copy: vi.fn().mockResolvedValue(undefined)
    };
    const service = new MediaStorageService(provider);
    await expect(service.createSignedUrl('family-media', 'a/b', 60)).resolves.toMatchObject({ publicUrlAllowed: false });
    await expect(service.download('family-media', 'a/b')).resolves.toBeInstanceOf(Blob);
    await service.delete('family-media', 'a/b');
    await expect(service.exists('family-media', 'a/b')).resolves.toBe(true);
    await expect(service.getMetadata('family-media', 'a/b')).resolves.toMatchObject({ bytes: 10 });
    await expect(service.getUsage('family-media/family/f1')).resolves.toMatchObject({ usedBytes: 10, estimated: true });
    await service.move('family-media', 'a/b', 'a/c');
    await service.copy('family-media', 'a/c', 'a/d');
    expect(provider.delete).toHaveBeenCalled();
    expect(provider.move).toHaveBeenCalled();
    expect(provider.copy).toHaveBeenCalled();
  });
});
