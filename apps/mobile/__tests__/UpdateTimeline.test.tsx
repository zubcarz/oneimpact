import { render, screen } from '@testing-library/react-native';
import type { ProjectUpdate } from '@oneimpact/shared';
import { UpdateTimeline } from '@/components/ui/UpdateTimeline';

// Fixtures deliberadamente fuera de orden: el objetivo del segundo test es
// probar que el componente los reordena, no que confien en el orden del
// array de entrada.
const items: ProjectUpdate[] = [
  {
    id: 'update-1',
    projectId: 'project-1',
    title: 'Update from January',
    body: 'Arranque del proyecto en enero.',
    progress: 10,
    publishedAt: '2024-01-10T00:00:00.000Z',
  },
  {
    id: 'update-2',
    projectId: 'project-1',
    title: 'Update from March',
    body: 'El avance mas reciente.',
    progress: 60,
    publishedAt: '2026-03-05T00:00:00.000Z',
  },
  {
    id: 'update-3',
    projectId: 'project-1',
    title: 'Update from June',
    body: 'Avance intermedio.',
    progress: 35,
    publishedAt: '2025-06-01T00:00:00.000Z',
  },
];

describe('UpdateTimeline', () => {
  it('renders one entry per item', () => {
    render(<UpdateTimeline items={items} />);

    for (const item of items) {
      expect(screen.getByText(item.title)).toBeTruthy();
    }
  });

  it('orders items by publishedAt descending, regardless of input order', () => {
    render(<UpdateTimeline items={items} />);

    // Los titulos son unicos por item: su orden de aparicion en el arbol
    // renderizado es la unica forma de observar el orden que aplica el
    // componente (el seed real solo tiene un update por proyecto, asi que
    // esto no se puede ver en pantalla).
    const renderedTitles = screen.getAllByText(/^Update from/).map((node) => node.props.children);

    expect(renderedTitles).toEqual([
      'Update from March',
      'Update from June',
      'Update from January',
    ]);
  });
});
