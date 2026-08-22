import { describe, expect, it } from 'vitest';
import { ENUM_VALUES } from './enums';
import { SEED_ZONES, SEED_PROJECTS } from './seed-data';

describe('SEED_ZONES', () => {
  it('has exactly 5 zones with unique slugs', () => {
    expect(SEED_ZONES).toHaveLength(5);
    const slugs = SEED_ZONES.map((zone) => zone.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('has order 1..5 without gaps', () => {
    const orders = SEED_ZONES.map((zone) => zone.order).sort((a, b) => a - b);
    expect(orders).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('SEED_PROJECTS', () => {
  it('has exactly 5 projects', () => {
    expect(SEED_PROJECTS).toHaveLength(5);
  });

  it('references only zone slugs that exist in SEED_ZONES', () => {
    const zoneSlugs = new Set(SEED_ZONES.map((zone) => zone.slug));
    for (const project of SEED_PROJECTS) {
      expect(zoneSlugs.has(project.zoneSlug)).toBe(true);
    }
  });

  it('has exactly one update per project', () => {
    for (const project of SEED_PROJECTS) {
      expect(project.updates).toHaveLength(1);
    }
  });

  it('has unique update ids across all projects', () => {
    const updateIds = SEED_PROJECTS.flatMap((project) =>
      project.updates.map((update) => update.id),
    );
    expect(new Set(updateIds).size).toBe(updateIds.length);
  });

  it('keeps progress between 0 and 100 for projects and updates', () => {
    for (const project of SEED_PROJECTS) {
      expect(project.progress).toBeGreaterThanOrEqual(0);
      expect(project.progress).toBeLessThanOrEqual(100);
      for (const update of project.updates) {
        expect(update.progress).toBeGreaterThanOrEqual(0);
        expect(update.progress).toBeLessThanOrEqual(100);
      }
    }
  });
});

describe('ENUM_VALUES', () => {
  it('has one key per exported enum with a non-empty list', () => {
    const expectedKeys = [
      'Role',
      'PlanId',
      'Billing',
      'ProjectStatus',
      'SubscriptionStatus',
      'PaymentStatus',
      'JourneySource',
      'NotificationType',
    ];
    expect(Object.keys(ENUM_VALUES).sort()).toEqual(expectedKeys.sort());
    for (const key of expectedKeys) {
      expect(ENUM_VALUES[key].length).toBeGreaterThan(0);
    }
  });
});
