import type { Project, Zone } from '@oneimpact/shared';
import { assetFor, assetForKey, toAdvanceView, toZoneView } from '@/data/zones';
import { seedProjectsFixture, seedZonesFixture } from '@/api/msw/seed-fixtures';

function findZoneId(slug: string): string {
  const zone = seedZonesFixture.find((item) => item.slug === slug);
  if (!zone) {
    throw new Error(`Fixture setup error: unknown zone slug "${slug}"`);
  }
  return zone.id;
}

describe('zones data layer', () => {
  it('throws when an asset key has no mapped require (assetFor, unchanged)', () => {
    expect(() => assetFor('zones/inventada.jpg')).toThrow();
  });

  it('assetForKey resolves the same keys as assetFor, non-throwing', () => {
    expect(assetForKey('zones/amazonia.jpg')).toBe(assetFor('zones/amazonia.jpg'));
  });

  it('assetForKey returns undefined (not a throw) for an unmapped key -- the remote no-crash path (D3)', () => {
    expect(assetForKey('zones/inventada.jpg')).toBeUndefined();
  });

  // The array of zones is no longer sorted client-side (`ZonesList` is
  // presentational now); the API/MSW own the order (`orderBy: { order: 'asc' }`
  // in `catalog.repository.ts`, mirrored by `SEED_ZONES`'s own declaration
  // order). This is the risk the plan calls out explicitly: verify it, don't
  // assume it.
  it('serves the 5 zones already ordered 1..5 with unique slugs, so a non-sorting list renders them in order', () => {
    expect(seedZonesFixture).toHaveLength(5);
    expect(seedZonesFixture.map((zone) => zone.order)).toEqual([1, 2, 3, 4, 5]);
    const slugs = seedZonesFixture.map((zone) => zone.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  describe('toZoneView (Zone -> ZoneView)', () => {
    it('maps every seeded zone to a view with a resolved image', () => {
      for (const zone of seedZonesFixture) {
        const view = toZoneView(zone);
        expect(view).toBeDefined();
        expect(view).toMatchObject({
          slug: zone.slug,
          name: zone.name,
          description: zone.description,
          order: zone.order,
        });
        expect(view?.image).toBe(assetFor(zone.imageKey));
      }
    });

    it('returns undefined instead of throwing when imageKey has no mapped asset (D3, no crash)', () => {
      const zone: Zone = { ...seedZonesFixture[0], imageKey: 'zones/inventada.jpg' };
      expect(toZoneView(zone)).toBeUndefined();
    });
  });

  describe('toAdvanceView (Project -> AdvanceView, D2)', () => {
    it('derives title/body/year from the project itself, not a separate update', () => {
      for (const project of seedProjectsFixture) {
        const view = toAdvanceView(project);
        expect(view).toBeDefined();
        expect(view?.id).toBe(project.id);
        expect(view?.title).toBe(project.title);
        expect(view?.body).toBe(project.summary);
        expect(view?.year).toBe(new Date(project.createdAt).getUTCFullYear());
        expect(view?.image).toBe(assetFor(project.coverKey as string));
      }
    });

    it('returns the 2 amazonia advances', () => {
      const amazoniaId = findZoneId('amazonia');
      const advances = seedProjectsFixture
        .filter((project) => project.zoneId === amazoniaId)
        .map(toAdvanceView);
      expect(advances).toHaveLength(2);
    });

    it('returns no advances for patagonia (empty state case)', () => {
      const patagoniaId = findZoneId('patagonia');
      const advances = seedProjectsFixture.filter((project) => project.zoneId === patagoniaId);
      expect(advances).toHaveLength(0);
    });

    it('publishes every advance in 2026', () => {
      for (const project of seedProjectsFixture) {
        expect(toAdvanceView(project)?.year).toBe(2026);
      }
    });

    it('returns undefined instead of throwing when coverKey is missing (D3, no crash)', () => {
      const project: Project = { ...seedProjectsFixture[0], coverKey: undefined };
      expect(toAdvanceView(project)).toBeUndefined();
    });

    it('returns undefined instead of throwing when coverKey has no mapped asset (D3, no crash)', () => {
      const project: Project = { ...seedProjectsFixture[0], coverKey: 'advances/inventada.jpg' };
      expect(toAdvanceView(project)).toBeUndefined();
    });
  });
});
