import { describe, expect, it } from 'vitest';
import { SEED_PROJECTS, SEED_ZONES } from '../seed-data';
import { listResponseSchema, projectWithUpdatesSchema, zoneSchema } from './catalog';

describe('zoneSchema', () => {
  it('parses a seed zone with an id and keeps its slug and order', () => {
    const [firstZone] = SEED_ZONES;
    const result = zoneSchema.parse({ id: 'zone-1', ...firstZone });

    expect(result.slug).toBe('amazonia');
    expect(result.order).toBe(1);
  });

  it('rejects a slug with uppercase letters', () => {
    const [firstZone] = SEED_ZONES;
    const result = zoneSchema.safeParse({ id: 'zone-1', ...firstZone, slug: 'Amazonia' });

    expect(result.success).toBe(false);
  });
});

describe('projectWithUpdatesSchema', () => {
  it('parses a seed project with its update', () => {
    const [firstProject] = SEED_PROJECTS;
    const { zoneSlug: _zoneSlug, updates, ...projectFields } = firstProject;

    const result = projectWithUpdatesSchema.parse({
      ...projectFields,
      id: 'project-1',
      zoneId: 'zone-1',
      createdAt: '2026-01-01T00:00:00.000Z',
      updates: updates.map((update) => ({ ...update, projectId: 'project-1' })),
    });

    expect(result.slug).toBe('guainia');
    expect(result.updates).toHaveLength(1);
    expect(result.updates[0]?.title).toBe(firstProject.updates[0]?.title);
  });

  it('rejects a progress of 101', () => {
    const [firstProject] = SEED_PROJECTS;
    const { zoneSlug: _zoneSlug, updates, ...projectFields } = firstProject;

    const result = projectWithUpdatesSchema.safeParse({
      ...projectFields,
      id: 'project-1',
      zoneId: 'zone-1',
      createdAt: '2026-01-01T00:00:00.000Z',
      progress: 101,
      updates: updates.map((update) => ({ ...update, projectId: 'project-1' })),
    });

    expect(result.success).toBe(false);
  });
});

describe('listResponseSchema', () => {
  it('parses a list of zones with a total', () => {
    const schema = listResponseSchema(zoneSchema);
    const items = SEED_ZONES.map((zone, index) => ({ id: `zone-${index}`, ...zone }));

    const result = schema.safeParse({ items, total: items.length });

    expect(result.success).toBe(true);
  });
});
