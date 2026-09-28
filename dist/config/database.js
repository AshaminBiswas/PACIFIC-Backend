"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.disconnectDatabases = exports.connectDatabases = exports.prisma = void 0;
const client_1 = require("@prisma/client");
const globalForPrisma = globalThis;
exports.prisma = globalForPrisma.prisma ??
    new client_1.PrismaClient({
        log: ['error'],
    });
if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = exports.prisma;
}
const connectDatabases = async () => {
    const dbUrl = process.env.DATABASE_URL || '';
    if (!dbUrl || dbUrl.includes('[YOUR_PASSWORD]') || dbUrl.includes('[PROJECT_REF]')) {
        console.warn('⚠️ [Pacific-DB] DATABASE_URL in D:\\PACIFIC-Backend\\.env is not yet configured with real credentials.');
        console.warn('ℹ️ [Pacific-DB] Set your Pacific Supabase/PostgreSQL connection string to enable live database operations.');
        return;
    }
    try {
        await exports.prisma.$connect();
        console.log('✅ Prisma connected to PostgreSQL (Pacific Restroom Cubicle DB)');
    }
    catch (error) {
        console.warn(`⚠️ [Pacific-DB] PostgreSQL connection attempt failed: ${error.message}`);
        if (process.env.NODE_ENV === 'production') {
            throw error;
        }
    }
};
exports.connectDatabases = connectDatabases;
const disconnectDatabases = async () => {
    try {
        await exports.prisma.$disconnect();
        console.log('🔌 Prisma disconnected');
    }
    catch (_err) {
        // ignore
    }
};
exports.disconnectDatabases = disconnectDatabases;
//# sourceMappingURL=database.js.map