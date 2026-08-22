import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import {
  SEED_ZONES,
  SEED_PLANS,
  SEED_PROJECTS,
} from '@oneimpact/shared/seed-data';

const prisma = new PrismaClient();

export async function seed(client: PrismaClient): Promise<void> {
  const adminPassword = await argon2.hash('Admin123!');
  const userPassword = await argon2.hash('User123!');

  const admin = await client.user.upsert({
    where: { email: 'admin@oneimpact.org' },
    update: {},
    create: {
      email: 'admin@oneimpact.org',
      name: 'Admin One Impact',
      role: 'ADMIN',
      passwordHash: adminPassword,
    },
  });
  await client.user.upsert({
    where: { email: 'ana@oneimpact.org' },
    update: {},
    create: {
      email: 'ana@oneimpact.org',
      name: 'Ana Rodriguez',
      role: 'USER',
      passwordHash: userPassword,
    },
  });

  for (const plan of SEED_PLANS) {
    const data = {
      name: plan.name,
      monthlyPrice: plan.monthlyPrice,
      annualMonthlyPrice: plan.annualMonthlyPrice,
      annualTotal: plan.annualTotal,
      recommended: plan.recommended ?? false,
    };
    await client.plan.upsert({
      where: { id: plan.id },
      update: data,
      create: { id: plan.id, ...data },
    });
  }

  for (const zone of SEED_ZONES) {
    const data = {
      name: zone.name,
      description: zone.description,
      imageKey: zone.imageKey,
      order: zone.order,
    };
    await client.zone.upsert({
      where: { slug: zone.slug },
      update: data,
      create: { slug: zone.slug, ...data },
    });
  }

  for (const project of SEED_PROJECTS) {
    const zone = await client.zone.findUnique({
      where: { slug: project.zoneSlug },
    });
    if (!zone) {
      throw new Error(
        `Seed error: zone with slug "${project.zoneSlug}" not found for project "${project.slug}"`,
      );
    }

    const data = {
      title: project.title,
      summary: project.summary,
      description: project.description,
      status: project.status,
      progress: project.progress,
      targetDate: project.targetDate ? new Date(project.targetDate) : null,
      lat: project.lat,
      lng: project.lng,
      coverKey: project.coverKey,
      zoneId: zone.id,
      createdById: admin.id,
    };
    const savedProject = await client.project.upsert({
      where: { slug: project.slug },
      update: data,
      create: { slug: project.slug, ...data },
    });

    for (const update of project.updates) {
      const updateData = {
        title: update.title,
        body: update.body,
        progress: update.progress,
        mediaKey: update.mediaKey,
        publishedAt: new Date(update.publishedAt),
        projectId: savedProject.id,
        authorId: admin.id,
      };
      await client.projectUpdate.upsert({
        where: { id: update.id },
        update: updateData,
        create: { id: update.id, ...updateData },
      });
    }
  }

  const [zoneCount, projectCount, updateCount, planCount, userCount] =
    await Promise.all([
      client.zone.count(),
      client.project.count(),
      client.projectUpdate.count(),
      client.plan.count(),
      client.user.count(),
    ]);

  console.log(
    `Seed done: ${zoneCount} zones, ${projectCount} projects, ${updateCount} project updates, ` +
      `${planCount} plans, ${userCount} users. Credentials: admin@oneimpact.org / Admin123! ` +
      '· ana@oneimpact.org / User123!',
  );
}

async function main(): Promise<void> {
  await seed(prisma);
}

if (require.main === module) {
  main()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
