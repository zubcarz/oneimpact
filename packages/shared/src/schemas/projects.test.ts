import { describe, expect, it } from 'vitest';
import { ProjectStatus } from '../enums';
import { createProjectSchema, publishUpdateSchema, updateProjectSchema } from './projects';

describe('createProjectSchema', () => {
  it('accepts a valid project', () => {
    const result = createProjectSchema.safeParse({
      title: 'Restauración de manglares',
      summary: 'Un resumen breve del proyecto.',
      description: 'Descripción detallada del proyecto con al menos diez caracteres.',
      zoneSlug: 'mexico',
      status: ProjectStatus.ACTIVE,
      progress: 50,
    });
    expect(result.success).toBe(true);
  });

  it('rejects progress above 100', () => {
    const result = createProjectSchema.safeParse({
      title: 'Restauración de manglares',
      summary: 'Un resumen breve.',
      description: 'Descripción detallada con al menos diez caracteres.',
      zoneSlug: 'mexico',
      progress: 101,
    });
    expect(result.success).toBe(false);
  });

  it('rejects progress below 0', () => {
    const result = createProjectSchema.safeParse({
      title: 'Restauración de manglares',
      summary: 'Un resumen breve.',
      description: 'Descripción detallada con al menos diez caracteres.',
      zoneSlug: 'mexico',
      progress: -1,
    });
    expect(result.success).toBe(false);
  });

  it('accepts progress boundaries 0 and 100', () => {
    const base = {
      title: 'Restauración de manglares',
      summary: 'Un resumen breve.',
      description: 'Descripción detallada con al menos diez caracteres.',
      zoneSlug: 'mexico',
    };
    expect(createProjectSchema.safeParse({ ...base, progress: 0 }).success).toBe(true);
    expect(createProjectSchema.safeParse({ ...base, progress: 100 }).success).toBe(true);
  });
});

describe('updateProjectSchema', () => {
  it('accepts an empty object since all fields are optional', () => {
    const result = updateProjectSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});

describe('publishUpdateSchema', () => {
  it('rejects an empty body', () => {
    const result = publishUpdateSchema.safeParse({
      title: 'Nuevo avance',
      body: '',
      progress: 10,
    });
    expect(result.success).toBe(false);
  });

  it('accepts a valid update', () => {
    const result = publishUpdateSchema.safeParse({
      title: 'Nuevo avance',
      body: 'Descripción del avance con al menos diez caracteres.',
      progress: 10,
    });
    expect(result.success).toBe(true);
  });
});
