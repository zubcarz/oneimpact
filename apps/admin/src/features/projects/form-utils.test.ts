import { ProjectStatus, createProjectSchema } from '@oneimpact/shared';
import type { Project } from '@oneimpact/shared';
import { describe, expect, it } from 'vitest';
import {
  emptyProjectFormValues,
  emptyPublishUpdateFormValues,
  pickDirtyValues,
  projectToFormValues,
  toDateTimeLocalValue,
  toIsoDateTime,
  toProjectPayload,
  toPublishUpdatePayload,
} from './form-utils';
import type { ProjectFormValues, PublishUpdateFormValues } from './form-utils';

describe('toIsoDateTime', () => {
  it('turns the value of a datetime-local input into an ISO instant with Z', () => {
    expect(toIsoDateTime('2026-12-31T00:00')).toBe('2026-12-31T00:00:00.000Z');
  });

  it('keeps the seconds a browser with a sub-minute step may send', () => {
    expect(toIsoDateTime('2026-12-31T10:30:45')).toBe('2026-12-31T10:30:45.000Z');
  });

  it('produces a value that createProjectSchema accepts, which is the reason this module exists', () => {
    const raw = '2026-12-31T00:00';
    // The raw value of the input is exactly what does NOT validate: `targetDate`
    // is `z.iso.datetime()` (packages/shared/src/schemas/projects.ts:19) and it
    // requires seconds and an offset.
    expect(createProjectSchema.shape.targetDate.safeParse(raw).success).toBe(false);
    expect(createProjectSchema.shape.targetDate.safeParse(toIsoDateTime(raw)).success).toBe(true);
  });

  it('returns undefined for an empty field, so the optional key can be dropped', () => {
    expect(toIsoDateTime('')).toBeUndefined();
    expect(toIsoDateTime('   ')).toBeUndefined();
  });

  it('returns undefined for a value that is not a datetime-local reading', () => {
    expect(toIsoDateTime('31/12/2026')).toBeUndefined();
    expect(toIsoDateTime('2026-12-31')).toBeUndefined();
    expect(toIsoDateTime('lo que sea')).toBeUndefined();
  });

  it('rejects a date that does not exist instead of rolling it over', () => {
    // `Date.UTC(2026, 1, 31)` is 3 March. Storing a day the admin never typed is
    // worse than asking again.
    expect(toIsoDateTime('2026-02-31T00:00')).toBeUndefined();
    expect(toIsoDateTime('2026-13-01T00:00')).toBeUndefined();
    expect(toIsoDateTime('2026-12-31T25:00')).toBeUndefined();
  });

  it('reads the value as UTC, so the day never shifts whatever the browser zone is', () => {
    // The invariant that matters: the calendar day that comes out is the one
    // that was typed, at both ends of the day. A local reading would move
    // `00:00` to the previous day east of Greenwich and `23:59` to the next day
    // west of it -- and this assertion holds no matter what TZ the runner has,
    // because the conversion never touches the local calendar.
    expect(toIsoDateTime('2026-12-31T00:00')?.slice(0, 10)).toBe('2026-12-31');
    expect(toIsoDateTime('2026-12-31T23:59')?.slice(0, 10)).toBe('2026-12-31');
  });
});

describe('toDateTimeLocalValue', () => {
  it('turns the ISO instant of the API into the value the input displays', () => {
    expect(toDateTimeLocalValue('2026-12-31T00:00:00.000Z')).toBe('2026-12-31T00:00');
  });

  it('drops the seconds the input cannot show by default', () => {
    expect(toDateTimeLocalValue('2026-12-31T10:30:45.000Z')).toBe('2026-12-31T10:30');
  });

  it('returns an empty string for a missing value, which is a valid defaultValue', () => {
    expect(toDateTimeLocalValue(undefined)).toBe('');
    expect(toDateTimeLocalValue('')).toBe('');
  });

  it('returns an empty string for an unusable value instead of NaN in the field', () => {
    expect(toDateTimeLocalValue('lo que sea')).toBe('');
  });
});

describe('round trip', () => {
  it('gives back the same reading in both directions', () => {
    const typed = '2026-12-31T00:00';
    expect(toDateTimeLocalValue(toIsoDateTime(typed))).toBe(typed);
  });

  it('does not move a project opened for editing and saved untouched', () => {
    const fromApi = '2027-01-01T00:00:00.000Z';
    expect(toIsoDateTime(toDateTimeLocalValue(fromApi))).toBe(fromApi);
  });
});

describe('pickDirtyValues', () => {
  const values = { title: 'Nuevo titulo', progress: 40, zoneSlug: 'amazonia' };

  it('keeps only the fields marked as dirty', () => {
    expect(pickDirtyValues(values, { title: true })).toEqual({ title: 'Nuevo titulo' });
  });

  it('keeps several dirty fields and drops the rest', () => {
    expect(pickDirtyValues(values, { title: true, progress: true })).toEqual({
      title: 'Nuevo titulo',
      progress: 40,
    });
  });

  it('returns an empty object when nothing was touched', () => {
    expect(pickDirtyValues(values, {})).toEqual({});
  });

  it('ignores a field flagged as not dirty', () => {
    expect(pickDirtyValues(values, { title: false, progress: undefined })).toEqual({});
  });

  it('keeps a dirty field whose value is falsy, which a truthiness check would lose', () => {
    expect(pickDirtyValues({ progress: 0 }, { progress: true })).toEqual({ progress: 0 });
  });
});

describe('toProjectPayload', () => {
  const filled: ProjectFormValues = {
    title: '  Reforestación del Amazonas  ',
    summary: 'Resumen',
    description: 'Una descripción suficientemente larga',
    zoneSlug: 'amazonia',
    status: ProjectStatus.ACTIVE,
    progress: '40',
    targetDate: '2026-12-31T00:00',
    lat: '-3.4653',
    lng: '-62.2159',
  };

  it('produces a payload createProjectSchema accepts', () => {
    const result = createProjectSchema.safeParse(toProjectPayload(filled));
    expect(result.success).toBe(true);
  });

  it('trims the free text and converts the numbers and the date', () => {
    expect(toProjectPayload(filled)).toEqual({
      title: 'Reforestación del Amazonas',
      summary: 'Resumen',
      description: 'Una descripción suficientemente larga',
      zoneSlug: 'amazonia',
      status: ProjectStatus.ACTIVE,
      progress: 40,
      targetDate: '2026-12-31T00:00:00.000Z',
      lat: -3.4653,
      lng: -62.2159,
    });
  });

  it('omits the optional fields that were left empty', () => {
    const payload = toProjectPayload({ ...filled, targetDate: '', lat: '', lng: '' });
    expect(payload).not.toHaveProperty('targetDate');
    expect(payload).not.toHaveProperty('lat');
    expect(payload).not.toHaveProperty('lng');
    expect(createProjectSchema.safeParse(payload).success).toBe(true);
  });

  it('keeps an unparseable date so zod rejects it instead of ignoring it', () => {
    const payload = toProjectPayload({ ...filled, targetDate: '31/12/2026' });
    expect(payload.targetDate).toBe('31/12/2026');
    expect(createProjectSchema.safeParse(payload).success).toBe(false);
  });

  it('turns an empty progress into NaN, not into 0', () => {
    // `Number('')` is 0: without the guard, a cleared box would store "not
    // started" and look like a deliberate value.
    expect(toProjectPayload({ ...filled, progress: '' }).progress).toBeNaN();
    expect(createProjectSchema.safeParse(toProjectPayload({ ...filled, progress: '' })).success).toBe(
      false,
    );
  });

  it('keeps latitude 0, which is a real coordinate', () => {
    expect(toProjectPayload({ ...filled, lat: '0' }).lat).toBe(0);
  });
});

describe('projectToFormValues', () => {
  const project: Project = {
    id: 'project-1',
    slug: 'reforestacion',
    zoneId: 'zone-1',
    title: 'Reforestación',
    summary: 'Resumen',
    description: 'Descripción larga del proyecto',
    status: ProjectStatus.PLANNED,
    progress: 0,
    targetDate: '2026-12-31T00:00:00.000Z',
    lat: -3.4653,
    createdAt: '2026-01-01T00:00:00.000Z',
  };

  it('brings the project back to display space', () => {
    expect(projectToFormValues(project, 'amazonia')).toEqual({
      title: 'Reforestación',
      summary: 'Resumen',
      description: 'Descripción larga del proyecto',
      zoneSlug: 'amazonia',
      status: ProjectStatus.PLANNED,
      progress: '0',
      targetDate: '2026-12-31T00:00',
      lat: '-3.4653',
      lng: '',
    });
  });

  it('survives a full round trip without changing what would be stored', () => {
    const payload = toProjectPayload(projectToFormValues(project, 'amazonia'));
    expect(payload.targetDate).toBe(project.targetDate);
    expect(payload.progress).toBe(project.progress);
    expect(payload.lat).toBe(project.lat);
  });
});

describe('emptyProjectFormValues', () => {
  it('starts with no zone chosen and the defaults of the schema', () => {
    const values = emptyProjectFormValues();
    expect(values.zoneSlug).toBe('');
    expect(values.status).toBe(ProjectStatus.ACTIVE);
    expect(values.progress).toBe('0');
  });
});

describe('toPublishUpdatePayload', () => {
  const values: PublishUpdateFormValues = {
    title: '  Primer avance  ',
    body: '  Se plantaron 400 arboles.  ',
    progress: '40',
    mediaUrl: '',
  };

  it('turns the range value into a number and trims the text', () => {
    expect(toPublishUpdatePayload(values)).toEqual({
      title: 'Primer avance',
      body: 'Se plantaron 400 arboles.',
      progress: 40,
    });
  });

  it('omits mediaUrl when the box is empty, instead of sending an empty string', () => {
    // `publishUpdateSchema.mediaUrl` is an optional `z.url()`: a missing field
    // validates, `''` does not.
    const payload = toPublishUpdatePayload({ ...values, mediaUrl: '   ' });
    expect('mediaUrl' in payload).toBe(false);
  });

  it('keeps a pasted url, trimmed', () => {
    const payload = toPublishUpdatePayload({
      ...values,
      mediaUrl: '  https://cdn.example.com/a.jpg  ',
    });
    expect(payload.mediaUrl).toBe('https://cdn.example.com/a.jpg');
  });

  it('does not turn an empty progress into a silent zero', () => {
    expect(toPublishUpdatePayload({ ...values, progress: '' }).progress).toBeNaN();
  });
});

describe('emptyPublishUpdateFormValues', () => {
  it('starts from the current progress of the project', () => {
    expect(emptyPublishUpdateFormValues(35)).toEqual({
      title: '',
      body: '',
      progress: '35',
      mediaUrl: '',
    });
  });
});
