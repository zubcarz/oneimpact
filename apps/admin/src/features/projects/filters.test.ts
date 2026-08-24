import type { ProjectsListParams } from '@oneimpact/api-client';
import { ProjectStatus } from '@oneimpact/shared';
import { describe, expect, it } from 'vitest';
import { parseProjectsFilters, serializeProjectsFilters } from './filters';

describe('parseProjectsFilters', () => {
  it('returns no filters for an empty query', () => {
    expect(parseProjectsFilters({})).toEqual({});
  });

  it('keeps a valid slug and a valid status', () => {
    expect(parseProjectsFilters({ zoneSlug: 'amazonia', status: 'ACTIVE' })).toEqual({
      zoneSlug: 'amazonia',
      status: ProjectStatus.ACTIVE,
    });
  });

  it('accepts every value of ProjectStatus', () => {
    for (const status of Object.values(ProjectStatus)) {
      expect(parseProjectsFilters({ status })).toEqual({ status });
    }
  });

  it('drops a status that is not in the enum', () => {
    expect(parseProjectsFilters({ status: 'DELETED' })).toEqual({});
  });

  it('drops a status written in lowercase', () => {
    expect(parseProjectsFilters({ status: 'active' })).toEqual({});
  });

  it('drops a slug that does not match the shared schema', () => {
    expect(parseProjectsFilters({ zoneSlug: 'Amazonia Norte' })).toEqual({});
    expect(parseProjectsFilters({ zoneSlug: 'AMAZONIA' })).toEqual({});
    expect(parseProjectsFilters({ zoneSlug: ' amazonia' })).toEqual({});
    expect(parseProjectsFilters({ zoneSlug: 'amazonia/../admin' })).toEqual({});
  });

  it('drops empty values', () => {
    expect(parseProjectsFilters({ zoneSlug: '', status: '' })).toEqual({});
  });

  it('keeps the valid filter when the other one is garbage', () => {
    expect(parseProjectsFilters({ zoneSlug: 'amazonia', status: 'nope' })).toEqual({
      zoneSlug: 'amazonia',
    });
  });

  it('takes the first occurrence of a repeated parameter', () => {
    expect(
      parseProjectsFilters({ status: ['ACTIVE', 'COMPLETED'], zoneSlug: ['amazonia', 'andes'] }),
    ).toEqual({ zoneSlug: 'amazonia', status: ProjectStatus.ACTIVE });
  });

  it('drops a repeated parameter whose first occurrence is invalid', () => {
    expect(parseProjectsFilters({ status: ['nope', 'ACTIVE'] })).toEqual({});
  });

  it('ignores an empty array and unknown keys', () => {
    expect(parseProjectsFilters({ status: [], page: '2' })).toEqual({});
  });
});

describe('serializeProjectsFilters', () => {
  it('returns an empty string when there is nothing to filter', () => {
    expect(serializeProjectsFilters({})).toBe('');
  });

  it('omits empty values instead of writing bare keys', () => {
    expect(serializeProjectsFilters({ zoneSlug: '' })).toBe('');
  });

  it('serializes a single filter', () => {
    expect(serializeProjectsFilters({ status: ProjectStatus.PLANNED })).toBe('?status=PLANNED');
  });

  it('serializes both filters in a stable order', () => {
    expect(serializeProjectsFilters({ status: ProjectStatus.ACTIVE, zoneSlug: 'amazonia' })).toBe(
      '?zoneSlug=amazonia&status=ACTIVE',
    );
  });
});

describe('round trip', () => {
  const cases: ProjectsListParams[] = [
    {},
    { zoneSlug: 'amazonia' },
    { status: ProjectStatus.COMPLETED },
    { zoneSlug: 'costa-pacifica', status: ProjectStatus.ACTIVE },
  ];

  for (const params of cases) {
    it(`parses back what it serialized: ${JSON.stringify(params)}`, () => {
      const query = serializeProjectsFilters(params);
      const raw = Object.fromEntries(new URLSearchParams(query));

      expect(parseProjectsFilters(raw)).toEqual(params);
    });
  }
});
