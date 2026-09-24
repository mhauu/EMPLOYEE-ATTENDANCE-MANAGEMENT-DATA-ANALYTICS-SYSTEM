const { PrismaClient } = require('./backend/node_modules/@prisma/client');

async function checkAndCreateDb() {
  const url = `postgresql://postgres:1234@localhost:5432/postgres?schema=public`;
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  try {
    await prisma.$connect();
    console.log('Connected to postgres default DB.');
    const dbs = await prisma.$queryRawUnsafe(`SELECT datname FROM pg_database WHERE datname = 'attendance_db'`);
    console.log('attendance_db exists:', dbs);
    if (dbs.length === 0) {
      console.log('Creating attendance_db...');
      await prisma.$executeRawUnsafe(`CREATE DATABASE attendance_db`);
      console.log('attendance_db created successfully!');
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

checkAndCreateDb();
