const { PrismaClient } = require('./backend/node_modules/@prisma/client');

const passwords = ['postgres', '123456', 'root', 'admin', '123', '1234', '12345', '12345678', 'password', 'hau', 'HAU'];

async function testPassword(pwd) {
  const url = `postgresql://postgres:${encodeURIComponent(pwd)}@localhost:5432/postgres?schema=public`;
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  try {
    await prisma.$connect();
    console.log(`FOUND_PASSWORD: "${pwd}"`);
    await prisma.$disconnect();
    return pwd;
  } catch (err) {
    await prisma.$disconnect();
    return null;
  }
}

async function run() {
  for (const p of passwords) {
    const success = await testPassword(p);
    if (success) {
      process.exit(0);
    }
  }
  console.log('NONE_MATCHED');
}

run();
