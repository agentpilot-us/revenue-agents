// Simple script to wake up Neon database
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function wakeDatabase() {
  try {
    console.log('Attempting to connect to database...');
    await prisma.$connect();
    console.log('✅ Database connection successful!');
    
    // Make a simple query to wake it up
    const count = await prisma.user.count();
    console.log(`✅ Database is awake! Found ${count} user(s) in database.`);
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
}

wakeDatabase();
