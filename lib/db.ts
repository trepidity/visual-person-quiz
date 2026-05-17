import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  console.warn('DATABASE_URL is not set. Database writes will fail until Neon is configured.');
}

export const sql = neon(process.env.DATABASE_URL || 'DATABASE_URL_NOT_CONFIGURED');
