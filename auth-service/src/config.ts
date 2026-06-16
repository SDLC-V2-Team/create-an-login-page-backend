import dotenv from 'dotenv';

dotenv.config();

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
  port: parseInt(process.env.PORT ?? '4000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:8080',
  databaseUrl: required('DATABASE_URL', 'postgres://app_user:app_password@localhost:5432/auth_db'),
  jwt: {
    accessSecret: required('JWT_ACCESS_SECRET', 'dev_access_secret'),
    refreshSecret: required('JWT_REFRESH_SECRET', 'dev_refresh_secret'),
    accessExpires: process.env.JWT_ACCESS_EXPIRES ?? '15m',
    refreshExpires: process.env.JWT_REFRESH_EXPIRES ?? '7d'
  },
  bcryptCost: parseInt(process.env.BCRYPT_COST ?? '10', 10)
};
