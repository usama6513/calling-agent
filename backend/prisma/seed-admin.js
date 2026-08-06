require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const email = (process.env.ADMIN_EMAIL || 'admin@callingagent.com').toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD || 'admin12345';
  const name = process.env.ADMIN_NAME || 'Admin';

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Admin user already exists: ${email}`);
    return;
  }

  const user = await prisma.user.create({
    data: {
      email,
      name,
      role: 'admin',
      passwordHash: bcrypt.hashSync(password, 12),
    },
  });

  console.log('Admin user created:');
  console.log(`  Email:    ${user.email}`);
  console.log(`  Password: ${password}`);
  console.log('  ⚠️  CHANGE THIS PASSWORD AFTER FIRST LOGIN');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
