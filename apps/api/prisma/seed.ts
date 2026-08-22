import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await argon2.hash('Admin123!');
  const userPassword = await argon2.hash('User123!');
  await prisma.user.upsert({
    where: { email: 'admin@oneimpact.org' },
    update: {},
    create: { email: 'admin@oneimpact.org', name: 'Admin One Impact', role: 'ADMIN', passwordHash: adminPassword },
  });
  await prisma.user.upsert({
    where: { email: 'ana@oneimpact.org' },
    update: {},
    create: { email: 'ana@oneimpact.org', name: 'Ana Rodriguez', role: 'USER', passwordHash: userPassword },
  });
  console.log('Seed done: admin@oneimpact.org / Admin123! · ana@oneimpact.org / User123!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
