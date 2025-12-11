// Minimal optional Redis helper. Uses dynamic import so it won't crash
// if `ioredis` isn't installed. Returns `null` when Redis isn't available.
type AnyRedis = any;

let cachedClient: AnyRedis | null = null;

export async function getRedisClient(): Promise<AnyRedis | null> {
  if (cachedClient) return cachedClient;
  try {
    // Use require to avoid TypeScript resolving missing optional types at build-time.
    // @ts-ignore
    const RedisModule: any = require('ioredis');
    const Redis = (RedisModule && (RedisModule.default || RedisModule)) as any;
    const url = process.env.REDIS_URL || 'redis://redis:6379';
    const client = new Redis(url);
    client.on && client.on('error', (err: any) => console.error('Redis error', err));
    cachedClient = client;
    return client;
  } catch (e) {
    // ioredis not installed or import failed — Redis is optional
    return null;
  }
}

export async function safeGet(key: string) {
  const c = await getRedisClient();
  if (!c) return null;
  try { const v = await c.get(key); return v; } catch (e) { return null; }
}

export async function safeSet(key: string, value: string, ttlSeconds?: number) {
  const c = await getRedisClient();
  if (!c) return false;
  try {
    if (ttlSeconds && typeof c.set === 'function') {
      await c.set(key, value, 'EX', ttlSeconds);
    } else {
      await c.set(key, value);
    }
    return true;
  } catch (e) {
    return false;
  }
}
