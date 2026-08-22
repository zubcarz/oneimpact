import { advances, advancesByZone, assetFor, getZone, zones } from '@/data/zones';

describe('zones data layer', () => {
  it('exposes 5 zones ordered 1..5 with unique slugs', () => {
    expect(zones).toHaveLength(5);
    expect(zones.map((zone) => zone.order)).toEqual([1, 2, 3, 4, 5]);
    const slugs = zones.map((zone) => zone.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('maps every advance to a zone that exists', () => {
    const zoneSlugs = new Set(zones.map((zone) => zone.slug));
    for (const advance of advances) {
      expect(zoneSlugs.has(advance.zoneSlug)).toBe(true);
    }
  });

  it('returns the 2 amazonia advances', () => {
    expect(advancesByZone('amazonia')).toHaveLength(2);
  });

  it('returns no advances for patagonia (empty state case)', () => {
    expect(advancesByZone('patagonia')).toHaveLength(0);
  });

  it('returns undefined for an unknown zone slug', () => {
    expect(getZone('noexiste')).toBeUndefined();
  });

  it('throws when an asset key has no mapped require', () => {
    expect(() => assetFor('zones/inventada.jpg')).toThrow();
  });

  it('publishes every advance in 2026', () => {
    for (const advance of advances) {
      expect(advance.year).toBe(2026);
    }
  });
});
