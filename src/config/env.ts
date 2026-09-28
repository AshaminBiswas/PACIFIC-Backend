import dotenv from 'dotenv';
dotenv.config();

function required(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

function optional(key: string, fallback: string): string {
  return process.env[key] || fallback;
}

export const env = {
  NODE_ENV: optional('NODE_ENV', 'development'),
  PORT: parseInt(optional('PORT', '5001'), 10),
  API_PREFIX: optional('API_PREFIX', '/api/v1'),
  INSTANCE_ID: optional('INSTANCE_ID', 'pacific-api-1'),

  isDev: optional('NODE_ENV', 'development') === 'development',
  isProd: process.env.NODE_ENV === 'production',

  database: {
    url: process.env.DATABASE_URL || '',
    directUrl: process.env.DIRECT_URL || '',
  },

  jwt: {
    secret: optional('JWT_SECRET', 'dev-secret-change-in-production'),
    refreshSecret: optional('JWT_REFRESH_SECRET', 'dev-refresh-secret-change-in-production'),
    expiresIn: optional('JWT_EXPIRES_IN', '15m'),
    refreshExpiresIn: optional('JWT_REFRESH_EXPIRES_IN', '7d'),
  },

  cors: {
    origin: optional('CORS_ORIGIN', 'https://pacific-admin-one.vercel.app'),
    allowedOrigins: optional(
      'ALLOWED_ORIGINS',
      'http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:5176,http://localhost:3000,https://pacific-admin-one.vercel.app,https://admin-delta-kohl.vercel.app,https://pacific-backend-psuw.onrender.com'
    ),
  },

  frontend: {
    url: optional('FRONTEND_URL', 'http://localhost:5173'),
    adminUrl: optional('ADMIN_URL', 'https://pacific-admin-one.vercel.app'),
  },

  smtp: {
    host: optional('SMTP_HOST', 'smtp.gmail.com'),
    port: parseInt(optional('SMTP_PORT', '587'), 10),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: optional('SMTP_FROM', 'Pacific Restroom Cubicle <noreply@pacificrestroomcubicle.com>'),
  },

  keepAlive: {
    url: process.env.KEEP_ALIVE_URL || '',
    intervalMs: parseInt(optional('KEEP_ALIVE_INTERVAL_MS', '600000'), 10),
  },

  supabase: {
    url: optional('SUPABASE_URL', 'https://ydpzlqjnhbcuzmjyylaj.supabase.co'),
    publishableKey: process.env.SUPABASE_PUBLISHABLE_KEY || '',
    secretKey: process.env.SUPABASE_SECRET_KEY || '',
    jwksUrl: optional('SUPABASE_JWKS_URL', 'https://ydpzlqjnhbcuzmjyylaj.supabase.co/auth/v1/.well-known/jwks.json'),
  },

  resend: {
    apiKey: process.env.RESEND_API_KEY || '',
    from: optional('RESEND_FROM', 'Pacific Products & Solutions <ejaj@pacificproduct.in>'),
  },
};
