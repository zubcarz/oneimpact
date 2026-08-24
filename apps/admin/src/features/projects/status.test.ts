import { ProjectStatus } from '@oneimpact/shared';
import { describe, expect, it } from 'vitest';
import {
  PROJECT_STATUS_OPTIONS,
  projectStatusLabel,
  projectStatusPresentation,
} from './status';

describe('projectStatusPresentation', () => {
  it('maps every status of the shared enum', () => {
    for (const status of Object.values(ProjectStatus)) {
      const presentation = projectStatusPresentation(status);
      expect(presentation.label.length).toBeGreaterThan(0);
      expect(presentation.tone.length).toBeGreaterThan(0);
    }
  });

  it('labels each status in Spanish', () => {
    expect(projectStatusLabel(ProjectStatus.PLANNED)).toBe('Planificado');
    expect(projectStatusLabel(ProjectStatus.ACTIVE)).toBe('Activo');
    expect(projectStatusLabel(ProjectStatus.COMPLETED)).toBe('Completado');
  });

  it('gives a different label to every status', () => {
    const labels = Object.values(ProjectStatus).map(projectStatusLabel);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it('falls back to the raw value for a status the panel does not know yet', () => {
    // A status the API could add before this app is rebuilt. The cast is the
    // point of the test: it reproduces what arrives over the wire.
    const unknown = 'ARCHIVED' as ProjectStatus;

    expect(projectStatusPresentation(unknown)).toEqual({ label: 'ARCHIVED', tone: 'neutral' });
  });
});

describe('PROJECT_STATUS_OPTIONS', () => {
  it('covers the whole enum, in lifecycle order', () => {
    expect(PROJECT_STATUS_OPTIONS.map((option) => option.value)).toEqual([
      ProjectStatus.PLANNED,
      ProjectStatus.ACTIVE,
      ProjectStatus.COMPLETED,
    ]);
  });

  it('uses the same labels as the badge', () => {
    for (const option of PROJECT_STATUS_OPTIONS) {
      expect(option.label).toBe(projectStatusLabel(option.value));
    }
  });
});
