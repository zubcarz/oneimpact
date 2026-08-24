import type { ProjectUpdate } from '@oneimpact/shared';
import Image from 'next/image';
import { EmptyState } from '@/components/ui/EmptyState';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { formatTargetDate } from './dates';
import { isRenderableMediaUrl } from './media';

/**
 * Published updates of a project, newest first.
 *
 * Server Component: it renders what the page loaded and holds no state. The
 * order is **not** applied here -- `GET /v1/projects/:id` already returns them
 * as `orderBy: { publishedAt: 'desc' }`
 * (apps/api/src/modules/projects/infrastructure/projects.repository.ts:84, read
 * and confirmed), and re-sorting a list that arrives sorted only hides the day
 * the API changes its mind.
 */
export interface UpdatesListProps {
  updates: ProjectUpdate[];
}

export function UpdatesList({ updates }: UpdatesListProps) {
  if (updates.length === 0) {
    return (
      <EmptyState
        title="Este proyecto todavía no tiene avances"
        description="Publica el primero con el formulario de arriba. El progreso del proyecto pasará a ser el del avance."
      />
    );
  }

  return (
    <ol className="flex flex-col gap-4">
      {updates.map((update) => (
        <li key={update.id} className="rounded-3xl border border-black/5 bg-white p-6">
          <article className="flex flex-col gap-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-lg font-bold text-gray-900">{update.title}</h3>
              {/*
                Same UTC formatter as the table: the day an update was published
                must not move with the time zone of whoever opens the panel.
              */}
              <p className="text-sm text-gray-600">{formatTargetDate(update.publishedAt)}</p>
            </div>

            <ProgressBar
              value={update.progress}
              label={`Progreso del avance ${update.title}`}
              className="max-w-xs"
            />

            <p className="max-w-prose text-sm whitespace-pre-line text-gray-900">{update.body}</p>

            <UpdateMedia mediaKey={update.mediaKey} title={update.title} />
          </article>
        </li>
      ))}
    </ol>
  );
}

/**
 * The image of an update, or the truth about why there is none.
 *
 * `ProjectUpdate.mediaKey` holds whatever was sent as `mediaUrl`, verbatim
 * (apps/api/src/modules/projects/application/projects-writes.service.ts:113-121),
 * and the seed fills it with relative storage keys. Only an absolute http(s) URL
 * can be rendered; a key is shown as text, because an `<img src="updates/a.jpg">`
 * would ask the panel's own origin for a path that does not exist and paint a
 * broken image with no explanation.
 */
function UpdateMedia({ mediaKey, title }: { mediaKey?: string; title: string }) {
  if (mediaKey === undefined || mediaKey.trim() === '') return null;

  if (!isRenderableMediaUrl(mediaKey)) {
    return (
      <p className="text-sm text-gray-600">
        Imagen almacenada con la clave <code className="font-mono">{mediaKey}</code>. El panel no
        puede mostrarla porque no es una dirección completa.
      </p>
    );
  }

  return (
    <div className="relative h-48 w-full max-w-sm overflow-hidden rounded-2xl bg-gray-200">
      {/*
        `unoptimized` because the URL is arbitrary: it points at whatever storage
        the API signed or at whatever address the admin pasted. Sending it
        through the image optimizer would require every host to be listed in
        `next.config.ts` and would answer with an "unconfigured host" error the
        first time somebody uses a new bucket.
      */}
      <Image
        src={mediaKey}
        alt={`Imagen del avance ${title}`}
        fill
        unoptimized
        sizes="(max-width: 768px) 100vw, 384px"
        className="object-cover"
      />
    </div>
  );
}
