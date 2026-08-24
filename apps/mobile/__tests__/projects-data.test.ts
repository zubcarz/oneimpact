import type { Project, Zone } from '@oneimpact/shared';
import { ProjectStatus, SEED_PROJECTS } from '@oneimpact/shared';
import { projectStatusLabels, toProjectCardView } from '@/data/projects';
import { assetForKey } from '@/data/zones';
import { seedProjectsFixture, seedZonesFixture } from '@/api/msw/seed-fixtures';

function findZone(zoneId: string): Zone | undefined {
  return seedZonesFixture.find((zone) => zone.id === zoneId);
}

describe('projects data layer', () => {
  describe('toProjectCardView (Project -> ProjectCardView)', () => {
    it('resolves the 5 seeded coverKey values to a mapped image', () => {
      expect(SEED_PROJECTS).toHaveLength(5);
      expect(seedProjectsFixture).toHaveLength(5);

      for (const project of seedProjectsFixture) {
        expect(project.coverKey).toBeDefined();
        const view = toProjectCardView(project, findZone(project.zoneId));
        expect(view.image).toBe(assetForKey(project.coverKey as string));
        expect(view.image).toBeDefined();
      }
    });

    it('keeps the view when coverKey has no mapped asset, leaving image undefined instead of dropping the card', () => {
      const project: Project = {
        ...seedProjectsFixture[0],
        coverKey: 'advances/inventada.jpg',
      };

      const view = toProjectCardView(project, undefined);

      expect(view).toBeDefined();
      expect(view.image).toBeUndefined();
      expect(view.id).toBe(project.id);
      expect(view.title).toBe(project.title);
    });

    it('maps every ProjectStatus to its Spanish label', () => {
      expect(projectStatusLabels[ProjectStatus.PLANNED]).toBe('Planeado');
      expect(projectStatusLabels[ProjectStatus.ACTIVE]).toBe('Activo');
      expect(projectStatusLabels[ProjectStatus.COMPLETED]).toBe('Completado');

      const completed: Project = { ...seedProjectsFixture[0], status: ProjectStatus.COMPLETED };
      expect(toProjectCardView(completed, undefined).statusLabel).toBe('Completado');
    });

    it('resolves zoneName from the given zone, undefined when no zone is passed', () => {
      const project = seedProjectsFixture[0];
      const zone = findZone(project.zoneId);
      expect(zone).toBeDefined();

      expect(toProjectCardView(project, zone).zoneName).toBe(zone?.name);
      expect(toProjectCardView(project, undefined).zoneName).toBeUndefined();
    });
  });
});
