'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { publishUpdateSchema } from '@oneimpact/shared';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import type { Resolver } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { FieldError } from '@/components/ui/FieldError';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { formatProgress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/Slider';
import { Textarea } from '@/components/ui/Textarea';
import { emptyPublishUpdateFormValues, toPublishUpdatePayload } from './form-utils';
import type { PublishUpdateFormValues } from './form-utils';
import { usePublishUpdate } from './hooks';
import {
  projectSaveErrorMessage,
  UPDATE_FALLBACK_ERROR,
  UPDATE_FIELD_FALLBACK_MESSAGE,
} from './project-messages';
import { signAndUpload } from './upload';

/**
 * Publishes an update of a project: title, text, progress and -- when storage
 * allows it -- an image.
 *
 * IMAGE PRECEDENCE, decided here and stated in the form itself: **a pasted URL
 * wins over the selected file**, and when there is one the file is not even
 * signed. Two reasons. The pasted URL is the only path that works with no
 * Supabase credentials, which is the situation in local and in CI (see
 * `./upload.ts`), so making the file win would mean the visible field is
 * silently ignored precisely when it is the one that works. And it is the value
 * the admin can read on screen before submitting: what gets stored is what they
 * see.
 *
 * Publishing also overwrites `Project.progress` with the progress of this update
 * (apps/api/src/modules/projects/application/projects-writes.service.ts:125-130),
 * which is why the slider starts at the current value of the project instead of
 * at zero.
 */

export interface PublishUpdateFormProps {
  projectId: string;
  /** Current progress of the project: the starting point of the slider. */
  projectProgress: number;
}

const FIELD_IDS = {
  title: 'update-title',
  body: 'update-body',
  progress: 'update-progress',
  file: 'update-file',
  mediaUrl: 'update-media-url',
} as const;

const errorId = (field: keyof typeof FIELD_IDS): string => `${FIELD_IDS[field]}-error`;

const PROGRESS_HINT_ID = 'update-progress-hint';
const FILE_HINT_ID = 'update-file-hint';
const MEDIA_URL_HINT_ID = 'update-media-url-hint';
const FORM_ERROR_ID = 'update-form-error';

/** Exact copy of the banner required by decision D4 of the plan. */
const SIMULATED_NOTICE = 'Almacenamiento simulado: el avance se publica sin imagen';
const PUBLISHED_NOTICE = 'Avance publicado.';

/** `aria-describedby` takes a list, so a field can point at a hint and an error at once. */
function describedBy(...ids: (string | false | undefined)[]): string | undefined {
  const used = ids.filter((id): id is string => typeof id === 'string' && id !== '');
  return used.length > 0 ? used.join(' ') : undefined;
}

export function PublishUpdateForm({ projectId, projectProgress }: PublishUpdateFormProps) {
  const router = useRouter();
  const publishUpdate = usePublishUpdate(projectId);

  // The file is not part of the form state: react-hook-form keeps display
  // values (strings) and a `File` is neither serializable nor comparable, so it
  // would break the reset after publishing.
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  // The value of a file input is owned by the browser: React never wrote it and
  // `reset()` cannot clear it. Bumping this key remounts the input, which is the
  // one way to empty it without reading a ref during render (a React Compiler
  // error, and the reason this is a counter and not a `useRef`).
  const [fileInputKey, setFileInputKey] = useState(0);

  const [formError, setFormError] = useState<string | null>(null);
  const [simulatedStorage, setSimulatedStorage] = useState(false);
  const [published, setPublished] = useState(false);

  const defaultValues = emptyPublishUpdateFormValues(projectProgress);

  /**
   * Same shape as `ProjectForm`: the state lives in display space and the schema
   * validates contract space, so the resolver converts before delegating to zod.
   * Both objects use the same keys, which is what lets every issue land on its
   * own field with no remapping.
   */
  const validate = zodResolver(publishUpdateSchema, {
    error: () => UPDATE_FIELD_FALLBACK_MESSAGE,
  });

  const resolver: Resolver<PublishUpdateFormValues> = async (values, context, options) => {
    // `options.names` is deliberately not forwarded, as in `ProjectForm`: the
    // resolver only uses it to detect array fields and this form is flat.
    const result = await validate(toPublishUpdatePayload(values), context, {
      criteriaMode: options.criteriaMode,
      fields: options.fields,
      shouldUseNativeValidation: options.shouldUseNativeValidation,
    });

    const failed = Object.keys(result.errors).length > 0;
    return { values: failed ? {} : values, errors: result.errors };
  };

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PublishUpdateFormValues>({ resolver, defaultValues });

  // `useWatch` and not `watch()`: the latter returns a function the React
  // Compiler refuses to memoize ("Use of incompatible library"), which makes it
  // skip the whole component. This subscribes to a single field and gives back a
  // value, so the slider redraws its number on every drag and nothing else does.
  const progress = useWatch({ control, name: 'progress' });
  const progressLabel = formatProgress(Number(progress));

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    setSimulatedStorage(false);
    setPublished(false);

    const payload = toPublishUpdatePayload(values);

    // Precedence: the pasted URL is already in the payload, so the file is only
    // considered when that box was left empty.
    if (payload.mediaUrl === undefined && selectedFile !== null) {
      try {
        const uploaded = await signAndUpload(selectedFile);
        if (uploaded.mediaUrl !== undefined) {
          payload.mediaUrl = uploaded.mediaUrl;
        } else {
          // No URL is invented to satisfy `z.url()`: the field is left out and
          // the admin is told why the image is missing.
          setSimulatedStorage(true);
        }
      } catch (error) {
        // A failed upload stops the publish, on purpose: the admin asked for an
        // update with an image and would not notice it went out without one.
        // Their text is still in the form, so retrying costs one click.
        setFormError(projectSaveErrorMessage(error, UPDATE_FALLBACK_ERROR));
        return;
      }
    }

    try {
      await publishUpdate.mutateAsync(payload);
    } catch (error) {
      setFormError(projectSaveErrorMessage(error, UPDATE_FALLBACK_ERROR));
      return;
    }

    setPublished(true);
    // The progress keeps the value that was just published: it is now the
    // progress of the project, and the next update usually moves on from there.
    reset({ ...defaultValues, progress: values.progress });
    setSelectedFile(null);
    setFileInputKey((key) => key + 1);
    // The list of updates below is a Server Component, so the React Query
    // invalidation done by the hook does not reach it. This is what makes the
    // new update appear.
    router.refresh();
  });

  return (
    // `noValidate` hands validation to zod: otherwise the browser blocks the
    // submit first and shows its own message, in its own locale and outside the
    // design system.
    <form onSubmit={onSubmit} noValidate className="max-w-3xl">
      <div className="rounded-3xl border border-black/5 bg-white p-6 md:p-8">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor={FIELD_IDS.title}>Título del avance</Label>
            <Input
              id={FIELD_IDS.title}
              maxLength={120}
              placeholder="Primeras 400 hectáreas replantadas"
              aria-invalid={errors.title !== undefined}
              aria-describedby={describedBy(errors.title !== undefined && errorId('title'))}
              {...register('title')}
            />
            <FieldError id={errorId('title')}>{errors.title?.message}</FieldError>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor={FIELD_IDS.body}>Texto del avance</Label>
            <Textarea
              id={FIELD_IDS.body}
              rows={5}
              placeholder="Qué se hizo en este periodo y qué viene después"
              aria-invalid={errors.body !== undefined}
              aria-describedby={describedBy(errors.body !== undefined && errorId('body'))}
              {...register('body')}
            />
            <FieldError id={errorId('body')}>{errors.body?.message}</FieldError>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor={FIELD_IDS.progress}>Progreso del proyecto (%)</Label>
            <Slider
              id={FIELD_IDS.progress}
              // `register()` does not write a `value` attribute -- it fills the
              // control from the ref after hydration -- so without this the
              // server would send a thumb parked at the middle of the track (the
              // default of a range input) next to a number that already reads
              // the real progress of the project.
              defaultValue={defaultValues.progress}
              valueLabel={progressLabel}
              aria-invalid={errors.progress !== undefined}
              aria-describedby={describedBy(
                PROGRESS_HINT_ID,
                errors.progress !== undefined && errorId('progress'),
              )}
              {...register('progress')}
            />
            <p id={PROGRESS_HINT_ID} className="text-sm text-gray-600">
              Al publicar, este valor pasa a ser el progreso del proyecto y sustituye al actual.
            </p>
            <FieldError id={errorId('progress')}>{errors.progress?.message}</FieldError>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor={FIELD_IDS.file}>Imagen (archivo)</Label>
            <input
              id={FIELD_IDS.file}
              key={fileInputKey}
              type="file"
              accept="image/*"
              aria-describedby={FILE_HINT_ID}
              onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
              className="block min-h-11 w-full rounded-2xl border border-black/10 bg-cream px-4 py-2.5 text-sm text-gray-900 file:mr-4 file:rounded-full file:border-0 file:bg-gray-900 file:px-4 file:py-2 file:text-sm file:font-bold file:text-white hover:file:bg-gray-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dark-green"
            />
            <p id={FILE_HINT_ID} className="text-sm text-gray-600">
              Si el almacenamiento no está configurado, el avance se publica sin imagen. Si además
              pegas una URL abajo, se usa esa y el archivo se ignora.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor={FIELD_IDS.mediaUrl}>URL de imagen (opcional)</Label>
            <Input
              id={FIELD_IDS.mediaUrl}
              type="url"
              inputMode="url"
              placeholder="https://cdn.ejemplo.com/avances/foto.jpg"
              aria-invalid={errors.mediaUrl !== undefined}
              aria-describedby={describedBy(
                MEDIA_URL_HINT_ID,
                errors.mediaUrl !== undefined && errorId('mediaUrl'),
              )}
              {...register('mediaUrl')}
            />
            <p id={MEDIA_URL_HINT_ID} className="text-sm text-gray-600">
              Dirección completa de una imagen ya publicada. Déjala vacía para publicar sin imagen.
            </p>
            <FieldError id={errorId('mediaUrl')}>{errors.mediaUrl?.message}</FieldError>
          </div>

          {simulatedStorage ? (
            // `role="status"` and not `role="alert"`: nothing failed, the update
            // is published; it is the image that could not be stored.
            <p
              role="status"
              className="rounded-2xl bg-highlight px-4 py-3 text-sm font-bold text-gray-900"
            >
              {SIMULATED_NOTICE}
            </p>
          ) : null}

          {published ? (
            <p
              role="status"
              className="rounded-2xl bg-accent-light px-4 py-3 text-sm font-bold text-gray-900"
            >
              {PUBLISHED_NOTICE}
            </p>
          ) : null}

          <FieldError id={FORM_ERROR_ID} className="rounded-2xl bg-red-50 px-4 py-3">
            {formError}
          </FieldError>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {/*
          `type="submit"` is explicit because `Button` defaults to `"button"`,
          and `disabled` while submitting is what keeps a double click from
          publishing the same update twice.
        */}
        <Button type="submit" variant="dark" size="lg" disabled={isSubmitting}>
          {isSubmitting ? 'Publicando...' : 'Publicar avance'}
        </Button>
      </div>
    </form>
  );
}
