import { prisma } from '../../config/database';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { LoginInput, RegisterInput } from './auth.schema';

const signAccessToken = (payload: { id: string; email: string; role: string }): string =>
  jwt.sign(payload, env.jwt.secret, { expiresIn: env.jwt.expiresIn } as jwt.SignOptions);

const signRefreshToken = (payload: { id: string }): string =>
  jwt.sign(payload, env.jwt.refreshSecret, { expiresIn: env.jwt.refreshExpiresIn } as jwt.SignOptions);

export const authService = {
  async login(data: LoginInput) {
    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user || !user.isActive) throw Object.assign(new Error('Invalid credentials'), { status: 401 });

    const valid = await bcrypt.compare(data.password, user.password);
    if (!valid) throw Object.assign(new Error('Invalid credentials'), { status: 401 });

    const accessToken = signAccessToken({ id: user.id, email: user.email, role: user.role });
    const refreshToken = signRefreshToken({ id: user.id });

    await prisma.user.update({ where: { id: user.id }, data: { refreshToken } });

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role },
    };
  },

  async register(data: RegisterInput) {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw Object.assign(new Error('Email already registered'), { status: 409 });

    const hashedPassword = await bcrypt.hash(data.password, 12);
    const user = await prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        firstName: data.firstName,
        lastName: data.lastName,
        role: (data.role as any) || 'EDITOR',
      },
    });

    const accessToken = signAccessToken({ id: user.id, email: user.email, role: user.role });
    const refreshToken = signRefreshToken({ id: user.id });
    await prisma.user.update({ where: { id: user.id }, data: { refreshToken } });

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role },
    };
  },

  async refreshTokens(token: string) {
    let payload: { id: string };
    try {
      payload = jwt.verify(token, env.jwt.refreshSecret) as { id: string };
    } catch {
      throw Object.assign(new Error('Invalid refresh token'), { status: 401 });
    }

    const user = await prisma.user.findFirst({ where: { id: payload.id, refreshToken: token } });
    if (!user || !user.isActive) throw Object.assign(new Error('Refresh token revoked'), { status: 401 });

    const accessToken = signAccessToken({ id: user.id, email: user.email, role: user.role });
    const newRefreshToken = signRefreshToken({ id: user.id });
    await prisma.user.update({ where: { id: user.id }, data: { refreshToken: newRefreshToken } });

    return { accessToken, refreshToken: newRefreshToken };
  },

  async logout(userId: string) {
    await prisma.user.update({ where: { id: userId }, data: { refreshToken: null } });
  },

  async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true },
    });
    if (!user) throw Object.assign(new Error('User not found'), { status: 404 });
    return user;
  },

  async provisionSuperAdmin(data: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
  }) {
    const email = data.email.trim().toLowerCase();
    const firstName = data.firstName?.trim() || 'Pacific';
    const lastName = data.lastName?.trim() || 'Admin';
    const hashedPassword = await bcrypt.hash(data.password, 12);

    const existing = await prisma.user.findUnique({ where: { email } });
    let user;
    if (existing) {
      user = await prisma.user.update({
        where: { email },
        data: {
          role: 'SUPER_ADMIN',
          password: hashedPassword,
          firstName,
          lastName,
          isActive: true,
        },
      });
    } else {
      user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          firstName,
          lastName,
          role: 'SUPER_ADMIN',
          isActive: true,
        },
      });
    }

    // Attach system role if available
    try {
      const superRole = await prisma.role.findFirst({ where: { code: 'SUPER_ADMIN' } });
      if (superRole) {
        await prisma.userRoleAssignment.upsert({
          where: { userId_roleId: { userId: user.id, roleId: superRole.id } },
          create: { userId: user.id, roleId: superRole.id },
          update: {},
        });
      }
    } catch (_e) {}

    // Synchronize to Supabase Auth if secret key is present
    let supabaseSynced = false;
    let supabaseMessage = 'Supabase admin sync skipped (keys pending unmasking in .env)';
    const supabaseSecret = env.supabase.secretKey || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (supabaseSecret && !supabaseSecret.includes('••') && !supabaseSecret.includes('..')) {
      try {
        const supRes = await fetch(`${env.supabase.url}/auth/v1/admin/users`, {
          method: 'POST',
          headers: {
            apikey: supabaseSecret,
            Authorization: `Bearer ${supabaseSecret}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            password: data.password,
            email_confirm: true,
            user_metadata: { firstName, lastName, role: 'SUPER_ADMIN' },
          }),
        });
        const supData = await supRes.json();
        if (supRes.ok || supData?.id) {
          supabaseSynced = true;
          supabaseMessage = 'User successfully created and auto-confirmed in Supabase Auth';
        } else if (supData?.message?.includes('already been registered') || supData?.msg?.includes('already registered')) {
          try {
            const listRes = await fetch(`${env.supabase.url}/auth/v1/admin/users?email=${encodeURIComponent(email)}`, {
              headers: { apikey: supabaseSecret, Authorization: `Bearer ${supabaseSecret}` },
            });
            const listData = await listRes.json();
            const existingSupUser = listData?.users?.find((u: any) => u.email === email);
            if (existingSupUser?.id) {
              await fetch(`${env.supabase.url}/auth/v1/admin/users/${existingSupUser.id}`, {
                method: 'PUT',
                headers: { apikey: supabaseSecret, Authorization: `Bearer ${supabaseSecret}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: data.password, email_confirm: true }),
              });
            }
          } catch (_ignore) {}
          supabaseSynced = true;
          supabaseMessage = 'User password synchronized and auto-confirmed in Supabase Auth';
        } else {
          supabaseMessage = `Supabase Auth notice: ${supData?.message || supData?.msg || 'Could not auto-sync'}`;
        }
      } catch (sErr: any) {
        supabaseMessage = `Supabase sync error: ${sErr.message}`;
      }
    }

    const accessToken = signAccessToken({ id: user.id, email: user.email, role: user.role });
    const refreshToken = signRefreshToken({ id: user.id });
    await prisma.user.update({ where: { id: user.id }, data: { refreshToken } });

    return {
      success: true,
      message: 'Super Admin successfully provisioned.',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      tokens: {
        accessToken,
        refreshToken,
        tokenType: 'Bearer',
        expiresIn: env.jwt.expiresIn,
      },
      supabase: {
        synced: supabaseSynced,
        status: supabaseMessage,
      },
      loginUrl: 'http://localhost:5176/login',
    };
  },
};
