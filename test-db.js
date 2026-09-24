const { PrismaClient } = require('./backend/node_modules/@prisma/client');
require('./backend/node_modules/dotenv').config({ path: './backend/.env' });

console.log('Testing DATABASE_URL:', process.env.DATABASE_URL);
const prisma = new PrismaClient();

async function test() {
  try {
    await prisma.$connect();
    console.log('SUCCESS: Connected to database!');
    const users = await prisma.user.findMany();
    console.log('Users in DB:', users.length);
  } catch (err) {
    console.error('DATABASE ERROR:', err);
  } finally {
    await prisma.$disconnect();
  }
}

test();
