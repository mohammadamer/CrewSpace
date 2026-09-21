export interface AppConfig {
  databaseUrl: string;
  redisUrl: string;
  port: number;
  sessionSecret: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return {
    databaseUrl:
      env.DATABASE_URL ??
      'postgresql://crewspace:crewspace@localhost:5432/crewspace',
    redisUrl: env.REDIS_URL ?? 'redis://localhost:6379',
    port: Number(env.PORT ?? 3000),
    sessionSecret: env.SESSION_SECRET ?? 'development-only-secret',
  };
}
