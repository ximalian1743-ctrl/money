import path from 'node:path';

export function getConfig() {
  return {
    port: Number(process.env.PORT ?? 3001),
    corsOrigin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173',
    databasePath:
      process.env.MONEY_RECORD_DB_PATH ?? path.join(process.cwd(), 'data', 'money-record.sqlite'),
    nodeEnv: process.env.NODE_ENV ?? 'development',
  };
}
