/**
 * Lives in src/, not test/, on purpose. The unit jest config
 * (apps/api/package.json "jest") uses rootDir "src" and
 * testRegex ".*\\.spec\\.ts$"; the e2e config only picks up
 * ".e2e-spec.ts$" files under test/. A test/enums.spec.ts would never be
 * collected by either runner and would silently never fail (see
 * "Hallazgo 1" in .claude/plans/20260822-api-catalog-and-projects.plan.md).
 *
 * Unit test, no database: @prisma/client exports each enum as a plain
 * object at runtime (node_modules/.prisma/client/index.d.ts), so this
 * only needs the generated client, not a live Postgres connection.
 */
import { ENUM_VALUES } from '@oneimpact/shared';
import * as prismaClient from '@prisma/client';

const prismaExports = prismaClient as unknown as Record<string, unknown>;

function sortedValuesOf(enumName: string): string[] {
  const candidate = prismaExports[enumName];
  if (typeof candidate !== 'object' || candidate === null) {
    throw new Error(`@prisma/client does not export an enum named "${enumName}"`);
  }
  return Object.values(candidate as Record<string, string>).sort();
}

describe.each(Object.entries(ENUM_VALUES))(
  'Prisma enum %s mirrors packages/shared',
  (enumName, sharedValues) => {
    it('has exactly the same set of values as the shared enum', () => {
      expect(sortedValuesOf(enumName)).toEqual([...sharedValues].sort());
    });
  },
);
