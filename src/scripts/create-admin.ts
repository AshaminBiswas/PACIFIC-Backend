#!/usr/bin/env ts-node
/**
 * Create or Promote a Super Admin user in Pacific Restroom Cubicle ERP
 *
 * Usage:
 *   npx ts-node src/scripts/create-admin.ts <email> <password> [firstName] [lastName]
 *
 * Example:
 *   npx ts-node src/scripts/create-admin.ts admin@pacificrestroomcubicle.com MySecurePassword123 "Pacific" "Admin"
 */

import dotenv from 'dotenv';
dotenv.config();

import bcrypt from 'bcryptjs';
import { prisma } from '../config/database';

async function main() {
  const args = process.argv.slice(2);
  const email = args[0] || process.env.ADMIN_EMAIL || 'admin@pacificrestroomcubicle.com';
  const password = args[1] || process.env.ADMIN_PASSWORD || 'PacificAdmin@2026';
  const firstName = args[2] || 'Pacific';
  const lastName = args[3] || 'SuperAdmin';

  console.log('\n======================================================');
  console.log('🛡️  PACIFIC RESTROOM CUBICLE — SUPER ADMIN PROVISIONER');
  console.log('======================================================');
  console.log(`Target Email : ${email}`);
  console.log(`Target Role  : SUPER_ADMIN`);
  console.log('------------------------------------------------------');

  if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes('[YOUR_PASSWORD]')) {
    console.error('❌ Error: DATABASE_URL in D:\\PACIFIC-Backend\\.env is not configured.');
    console.error('👉 Please set your real database password in .env before running this script.');
    process.exit(1);
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 12);

    // Upsert into Prisma User table
    const existing = await prisma.user.findUnique({ where: { email } });

    if (existing) {
      const updated = await prisma.user.update({
        where: { email },
        data: {
          role: 'SUPER_ADMIN',
          password: hashedPassword,
          firstName,
          lastName,
          isActive: true,
        },
      });
      console.log(`✅ Existing user updated to SUPER_ADMIN (ID: ${updated.id})`);
    } else {
      const created = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          firstName,
          lastName,
          role: 'SUPER_ADMIN',
          isActive: true,
        },
      });
      console.log(`✅ New SUPER_ADMIN created successfully (ID: ${created.id})`);
    }

    // Also link to RBAC system role if roles table exists
    try {
      const superRole = await prisma.role.findFirst({
        where: { code: 'SUPER_ADMIN' },
      });
      if (superRole) {
        const userId = existing?.id || (await prisma.user.findUnique({ where: { email } }))?.id;
        if (userId) {
          await prisma.userRoleAssignment.upsert({
            where: {
              userId_roleId: { userId, roleId: superRole.id },
            },
            create: { userId, roleId: superRole.id },
            update: {},
          });
          console.log(`✅ Attached RBAC capability role: SUPER_ADMIN`);
        }
      }
    } catch (_roleErr) {
      // Non-fatal if RBAC table is pending seed
    }

    console.log('------------------------------------------------------');
    console.log('🎉 Super Admin Ready!');
    console.log(`👉 Login URL : http://localhost:5176/login`);
    console.log(`👉 Email     : ${email}`);
    console.log(`👉 Password  : ${password}`);
    console.log('======================================================\n');
  } catch (error: any) {
    console.error('❌ Failed to provision Super Admin:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
