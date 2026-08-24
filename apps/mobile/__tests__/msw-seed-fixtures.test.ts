import {
  SEED_ZONES,
  SEED_PROJECTS,
  zoneSchema,
  projectSchema,
  projectUpdateSchema,
} from '@oneimpact/shared';
import {
  seedZonesFixture,
  seedProjectsFixture,
  seedProjectUpdatesFixture,
} from '@/api/msw/seed-fixtures';

describe('seed-fixtures', () => {
  it('maps every seed zone to a Zone with a unique, stable id, preserving order', () => {
    expect(seedZonesFixture).toHaveLength(SEED_ZONES.length);
    expect(seedZonesFixture.map((zone) => zone.slug)).toEqual(SEED_ZONES.map((zone) => zone.slug));

    const ids = seedZonesFixture.map((zone) => zone.id);
    expect(new Set(ids).size).toBe(ids.length);

    // stable: recomputing the fixture module output twice yields the same ids
    expect(seedZonesFixture.map((zone) => zone.id)).toEqual(
      seedZonesFixture.map((zone) => `zone-${zone.slug}`),
    );
  });

  it('every mapped zone satisfies zoneSchema, the same shape the API returns', () => {
    for (const zone of seedZonesFixture) {
      expect(() => zoneSchema.parse(zone)).not.toThrow();
    }
  });

  it('maps every seed project to a Project with a unique, stable id, preserving order', () => {
    expect(seedProjectsFixture).toHaveLength(SEED_PROJECTS.length);
    expect(seedProjectsFixture.map((project) => project.slug)).toEqual(
      SEED_PROJECTS.map((project) => project.slug),
    );

    const ids = seedProjectsFixture.map((project) => project.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every mapped project satisfies projectSchema and its zoneId resolves to an existing fixture zone', () => {
    const zoneIds = new Set(seedZonesFixture.map((zone) => zone.id));

    for (const project of seedProjectsFixture) {
      expect(() => projectSchema.parse(project)).not.toThrow();
      expect(zoneIds.has(project.zoneId)).toBe(true);
    }
  });

  it('maps every seed project update to a ProjectUpdate that satisfies projectUpdateSchema', () => {
    const projectIds = new Set(seedProjectsFixture.map((project) => project.id));

    expect(seedProjectUpdatesFixture.length).toBeGreaterThan(0);

    for (const update of seedProjectUpdatesFixture) {
      expect(() => projectUpdateSchema.parse(update)).not.toThrow();
      expect(projectIds.has(update.projectId)).toBe(true);
    }
  });
});
