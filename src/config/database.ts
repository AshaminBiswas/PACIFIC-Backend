import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export const connectDatabases = async (): Promise<void> => {
  const dbUrl = process.env.DATABASE_URL || '';
  if (!dbUrl || dbUrl.includes('[YOUR_PASSWORD]') || dbUrl.includes('[PROJECT_REF]')) {
    console.warn('⚠️ [Pacific-DB] DATABASE_URL in D:\\PACIFIC-Backend\\.env is not yet configured with real credentials.');
    console.warn('ℹ️ [Pacific-DB] Set your Pacific Supabase/PostgreSQL connection string to enable live database operations.');
    return;
  }

  try {
    await prisma.$connect();
    console.log('✅ Prisma connected to PostgreSQL (Pacific Restroom Cubicle DB)');
  } catch (error: any) {
    console.warn(`⚠️ [Pacific-DB] PostgreSQL connection attempt failed: ${error.message}`);
    if (process.env.NODE_ENV === 'production') {
      throw error;
    }
  }
};

export const disconnectDatabases = async (): Promise<void> => {
  try {
    await prisma.$disconnect();
    console.log('🔌 Prisma disconnected');
  } catch (_err) {
    // ignore
  }
};
