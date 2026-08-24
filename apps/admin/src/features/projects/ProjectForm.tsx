'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { createProjectSchema, updateProjectSchema } from '@oneimpact/shared';
import type { Project } from '@oneimpact/shared';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { Resolver } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { FieldError } from '@/components/ui/FieldError';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import type { SelectOption } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { useZones } from '@/features/zones/hooks';
import {
  emptyProjectFormValues,
  pickDirtyValues,
  projectToFormValues,
  toProjectPayload,
} from './form-utils';
import type { ProjectFormValues, ProjectPayload } from './form-utils';
import { useCreateProject, useUpdateProject } from './hooks';
import { projectIssueMessage, projectSaveErrorMessage } from './project-messages';
import { PROJECT_STATUS_OPTIONS } from './status';

/**
 * Create and edit form of a project. The only Client Component of both screens.
 *
 * It validates with the schemas of `packages/shared` -- `createProjectSchema`
 * when creating, `updateProjectSchema` (its `.partial()`) when editing -- so the
 * rules are written once and the panel cannot drift from what the API accepts.
 *
 * The slug is **not** here and is not editable: the API derives it from the
 * title and resolves collisions on its own
 * (apps/api/src/modules/projects/application/projects-writes.service.ts:152-172).
 * Showing it would suggest the admin owns a value they do not.
 */

export type ProjectFormMode = 'create' | 'edit';

export type ProjectFormProps =
  | { mode: 'create' }
  | {
      mode: 'edit';
      project: Project;
      /**
       * Zone of the project, as `GET /v1/projects/:id` returns it. It cannot be
       * derived from the project: `Project` carries `zoneId` while the write
       * contract takes `zoneSlug`. It also seeds the select, so the current zone
       * is readable before `useZones` resolves.
       */
      zone?: { slug: string; name: string };
    };

const AFTER_SAVE_PATH = '/projects';

const FIELD_IDS = {
  title: 'project-title',
  summary: 'project-summary',
  description: 'project-description',
  zoneSlug: 'project-zone',
  status: 'project-status',
  progress: 'project-progress',
  targetDate: 'project-target-date',
  lat: 'project-lat',
  lng: 'project-lng',
} as const;

const errorId = (field: keyof typeof FIELD_IDS): string => `${FIELD_IDS[field]}-error`;

const PROGRESS_HINT_ID = 'project-progress-hint';
const FORM_ERROR_ID = 'project-form-error';
const ZONES_ERROR_ID = 'project-zone-status';

const PLACEHOLDER_ZONE: SelectOption = { value: '', label: 'Selecciona una zona' };

/** `aria-describedby` takes a list, so a field can point at a hint and an error at once. */
function describedBy(...ids: (string | false | undefined)[]): string | undefined {
  const used = ids.filter((id): id is string => typeof id === 'string' && id !== '');
  return used.length > 0 ? used.join(' ') : undefined;
}

export function ProjectForm(props: ProjectFormProps) {
  const router = useRouter();
  const isEdit = props.mode === 'edit';
  const project = props.mode === 'edit' ? props.project : undefined;
  const initialZone = props.mode === 'edit' ? props.zone : undefined;

  const zonesQuery = useZones();
  const createProject = useCreateProject();
  // Hooks cannot be called conditionally, so the edit mutation is always built.
  // With no project there is nothing to submit to it and its `mutateAsync` is
  // unreachable: only the edit branch of `onSubmit` calls it.
  const updateProject = useUpdateProject(project?.id ?? '');

  const [formError, setFormError] = useState<string | null>(null);

  /**
   * The same object feeds react-hook-form and the `defaultValue` of every
   * control. Repeating it on the DOM is what puts the values in the HTML the
   * server sends: `register()` does not write a `value` attribute -- it fills the
   * field from the ref after hydration -- so without this the edit screen would
   * arrive with every box empty and fill in once the JavaScript runs.
   */
  const defaultValues: ProjectFormValues =
    project !== undefined
      ? projectToFormValues(project, initialZone?.slug ?? '')
      : emptyProjectFormValues();

  /**
   * The form state lives in display space (strings) and the schema validates
   * contract space, so the resolver converts before delegating to zod. Both
   * objects use the same keys, which is what lets every issue land on its field
   * with no remapping.
   *
   * On success it returns `values` untouched, not the parsed payload, so what
   * `handleSubmit` receives keeps matching `dirtyFields` -- which is keyed by
   * form fields. The submit rebuilds the payload with the same pure function
   * over the same input, so it sends exactly what was just validated.
   */
  const validate = zodResolver(isEdit ? updateProjectSchema : createProjectSchema, {
    error: projectIssueMessage,
  });

  const resolver: Resolver<ProjectFormValues> = async (values, context, options) => {
    // `options.names` is deliberately not forwarded. It is the only field of
    // `ResolverOptions` that depends on the shape of the form -- which is why
    // forwarding it whole does not typecheck across the two spaces -- and the
    // only thing the resolver does with it is detect array fields
    // (`^campo\.\d+`, node_modules/@hookform/resolvers/dist/resolvers.js). This
    // form is flat, so with or without it the outcome is identical.
    const result = await validate(toProjectPayload(values), context, {
      criteriaMode: options.criteriaMode,
      fields: options.fields,
      shouldUseNativeValidation: options.shouldUseNativeValidation,
    });

    const failed = Object.keys(result.errors).length > 0;
    return { values: failed ? {} : values, errors: result.errors };
  };

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, dirtyFields },
  } = useForm<ProjectFormValues>({ resolver, defaultValues });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    const payload = toProjectPayload(values);

    try {
      if (project !== undefined) {
        // Only what was touched. `updateProjectSchema` would accept the whole
        // object, but then a title fix and a full rewrite look identical in the
        // request log, and every untouched field is echoed back on each save.
        const changed = pickDirtyValues<ProjectPayload>(payload, dirtyFields);
        // Nothing changed: the API would answer 200 to a no-op write. Going
        // straight back is the honest outcome.
        if (Object.keys(changed).length > 0) await updateProject.mutateAsync(changed);
      } else {
        await createProject.mutateAsync(payload);
      }

      router.push(AFTER_SAVE_PATH);
      // The projects table is a Server Component: invalidating the React Query
      // cache (which the mutation hooks already do) does not reach it. This is
      // what makes the new or edited project show up in the list.
      router.refresh();
    } catch (error) {
      // A failed save is never a crash: the message goes to the banner and the
      // form keeps every value the admin typed.
      setFormError(projectSaveErrorMessage(error));
    }
  });

  const loadedZoneOptions: SelectOption[] =
    zonesQuery.data !== undefined
      ? zonesQuery.data.map((zone) => ({ value: zone.slug, label: zone.name }))
      : // While the zones load -- or if loading them fails -- the select still
        // shows the zone the project already has, instead of falling back to the
        // placeholder and suggesting it has none.
        initialZone !== undefined
        ? [{ value: initialZone.slug, label: initialZone.name }]
        : [];

  const zoneOptions: SelectOption[] = [PLACEHOLDER_ZONE, ...loadedZoneOptions];

  const statusOptions: SelectOption[] = PROJECT_STATUS_OPTIONS.map((option) => ({
    value: option.value,
    label: option.label,
  }));

  const submitLabel = isEdit ? 'Guardar cambios' : 'Crear proyecto';
  const submittingLabel = isEdit ? 'Guardando...' : 'Creando...';

  return (
    // `noValidate` hands validation to zod: otherwise the browser blocks the
    // submit first and shows its own message, in its own locale, outside the
    // design system and impossible to assert from Playwright.
    <form onSubmit={onSubmit} noValidate className="max-w-3xl">
      <div className="rounded-3xl border border-black/5 bg-white p-6 md:p-8">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor={FIELD_IDS.title}>Título</Label>
            <Input
              id={FIELD_IDS.title}
              defaultValue={defaultValues.title}
              maxLength={120}
              placeholder="Reforestación del Amazonas"
              aria-invalid={errors.title !== undefined}
              aria-describedby={describedBy(errors.title !== undefined && errorId('title'))}
              {...register('title')}
            />
            <FieldError id={errorId('title')}>{errors.title?.message}</FieldError>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor={FIELD_IDS.summary}>Resumen</Label>
            <Input
              id={FIELD_IDS.summary}
              defaultValue={defaultValues.summary}
              maxLength={200}
              placeholder="Una línea para la ficha del proyecto"
              aria-invalid={errors.summary !== undefined}
              aria-describedby={describedBy(errors.summary !== undefined && errorId('summary'))}
              {...register('summary')}
            />
            <FieldError id={errorId('summary')}>{errors.summary?.message}</FieldError>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor={FIELD_IDS.description}>Descripción</Label>
            <Textarea
              id={FIELD_IDS.description}
              defaultValue={defaultValues.description}
              rows={5}
              placeholder="Qué se va a hacer, con quién y para qué"
              aria-invalid={errors.description !== undefined}
              aria-describedby={describedBy(
                errors.description !== undefined && errorId('description'),
              )}
              {...register('description')}
            />
            <FieldError id={errorId('description')}>{errors.description?.message}</FieldError>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor={FIELD_IDS.zoneSlug}>Zona</Label>
              <Select
                id={FIELD_IDS.zoneSlug}
                defaultValue={defaultValues.zoneSlug}
                options={zoneOptions}
                aria-invalid={errors.zoneSlug !== undefined}
                aria-describedby={describedBy(
                  errors.zoneSlug !== undefined && errorId('zoneSlug'),
                  zonesQuery.isError && ZONES_ERROR_ID,
                )}
                {...register('zoneSlug')}
              />
              <FieldError id={errorId('zoneSlug')}>{errors.zoneSlug?.message}</FieldError>
              {zonesQuery.isError ? (
                <p id={ZONES_ERROR_ID} role="alert" className="text-sm font-medium text-red-700">
                  No se pudieron cargar las zonas. Recarga la página para intentarlo de nuevo.
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor={FIELD_IDS.status}>Estado</Label>
              <Select
                id={FIELD_IDS.status}
                defaultValue={defaultValues.status}
                options={statusOptions}
                aria-invalid={errors.status !== undefined}
                aria-describedby={describedBy(errors.status !== undefined && errorId('status'))}
                {...register('status')}
              />
              <FieldError id={errorId('status')}>{errors.status?.message}</FieldError>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor={FIELD_IDS.progress}>Progreso (%)</Label>
              <Input
                id={FIELD_IDS.progress}
                defaultValue={defaultValues.progress}
                type="number"
                min={0}
                max={100}
                step={1}
                inputMode="numeric"
                aria-invalid={errors.progress !== undefined}
                aria-describedby={describedBy(
                  PROGRESS_HINT_ID,
                  errors.progress !== undefined && errorId('progress'),
                )}
                {...register('progress')}
              />
              {/*
                The warning sits next to the field and not in a footnote because
                it contradicts what the control suggests: publishing an update
                overwrites `Project.progress` inside the same transaction
                (projects-writes.service.ts:125-130, read and confirmed), so a
                number typed here does not survive the next update.
              */}
              <p id={PROGRESS_HINT_ID} className="text-sm text-gray-600">
                Al publicar un avance, el progreso del proyecto pasa a ser el de ese avance y
                sustituye a este valor.
              </p>
              <FieldError id={errorId('progress')}>{errors.progress?.message}</FieldError>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor={FIELD_IDS.targetDate}>Fecha objetivo</Label>
              <Input
                id={FIELD_IDS.targetDate}
                defaultValue={defaultValues.targetDate}
                type="datetime-local"
                aria-invalid={errors.targetDate !== undefined}
                aria-describedby={describedBy(
                  errors.targetDate !== undefined && errorId('targetDate'),
                )}
                {...register('targetDate')}
              />
              <FieldError id={errorId('targetDate')}>{errors.targetDate?.message}</FieldError>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor={FIELD_IDS.lat}>Latitud</Label>
              <Input
                id={FIELD_IDS.lat}
                defaultValue={defaultValues.lat}
                type="number"
                step="any"
                inputMode="decimal"
                placeholder="-3.4653"
                aria-invalid={errors.lat !== undefined}
                aria-describedby={describedBy(errors.lat !== undefined && errorId('lat'))}
                {...register('lat')}
              />
              <FieldError id={errorId('lat')}>{errors.lat?.message}</FieldError>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor={FIELD_IDS.lng}>Longitud</Label>
              <Input
                id={FIELD_IDS.lng}
                defaultValue={defaultValues.lng}
                type="number"
                step="any"
                inputMode="decimal"
                placeholder="-62.2159"
                aria-invalid={errors.lng !== undefined}
                aria-describedby={describedBy(errors.lng !== undefined && errorId('lng'))}
                {...register('lng')}
              />
              <FieldError id={errorId('lng')}>{errors.lng?.message}</FieldError>
            </div>
          </div>

          <FieldError id={FORM_ERROR_ID} className="rounded-2xl bg-red-50 px-4 py-3">
            {formError}
          </FieldError>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {/*
          `type="submit"` is explicit because `Button` defaults to `"button"`. It
          is what makes Enter inside a field send the form, and `disabled` while
          submitting is what keeps a double click from creating two projects.
        */}
        <Button type="submit" variant="dark" size="lg" disabled={isSubmitting}>
          {isSubmitting ? submittingLabel : submitLabel}
        </Button>
        <Link
          href={AFTER_SAVE_PATH}
          className="inline-flex min-h-11 items-center rounded-full px-6 py-2.5 text-sm font-bold text-dark-green underline underline-offset-4 transition-colors hover:bg-cream focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dark-green"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
