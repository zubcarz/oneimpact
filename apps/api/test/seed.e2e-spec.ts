import { PrismaClient } from '@prisma/client';
import { seed } from '../prisma/seed';

jest.setTimeout(60000);

describe('Seed (e2e)', () => {
  const prisma = new PrismaClient();

  beforeAll(async () => {
    await seed(prisma);
    await seed(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('creates the expected number of zones', async () => {
    expect(await prisma.zone.count()).toBe(5);
  });

  it('creates the expected number of projects', async () => {
    expect(await prisma.project.count()).toBe(5);
  });

  it('creates the expected number of project updates', async () => {
    expect(await prisma.projectUpdate.count()).toBe(5);
  });

  it('creates the expected number of plans', async () => {
    expect(await prisma.plan.count()).toBe(3);
  });

  it('creates the expected number of users', async () => {
    expect(await prisma.user.count()).toBe(2);
  });

  it('does not duplicate records when run twice (idempotency)', async () => {
    await seed(prisma);
    expect(await prisma.zone.count()).toBe(5);
    expect(await prisma.project.count()).toBe(5);
    expect(await prisma.projectUpdate.count()).toBe(5);
    expect(await prisma.plan.count()).toBe(3);
    expect(await prisma.user.count()).toBe(2);
  });

  it('gives every project exactly one update', async () => {
    const projects = await prisma.project.findMany({
      include: { updates: true },
    });
    expect(projects).toHaveLength(5);
    for (const project of projects) {
      expect(project.updates).toHaveLength(1);
    }
  });

  it('resolves every project zoneSlug to an existing zone', async () => {
    const projects = await prisma.project.findMany({ include: { zone: true } });
    for (const project of projects) {
      expect(project.zone).not.toBeNull();
      expect(project.zone?.id).toBe(project.zoneId);
    }
  });
});
