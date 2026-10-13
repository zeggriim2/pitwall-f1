import { Redis } from 'ioredis'
import type { Logger } from './logger'

export interface Cache {
  /** Cache-aside: return the cached value or compute, store and return it. */
  remember<T>(key: string, ttlSeconds: number, compute: () => Promise<T>): Promise<T>
  invalidatePrefix(prefix: string): Promise<number>
  ping(): Promise<boolean>
  close(): Promise<void>
}

export function createRedisCache(url: string, logger: Logger): Cache {
  const redis = new Redis(url, { maxRetriesPerRequest: 2, lazyConnect: false })
  redis.on('error', (error) => logger.warn({ err: error }, 'redis error'))

  return {
    async remember(key, ttlSeconds, compute) {
      try {
        const hit = await redis.get(key)
        if (hit !== null) return JSON.parse(hit)
      } catch (error) {
        // The cache is an optimisation: a Redis outage must never break reads.
        logger.warn({ err: error, key }, 'cache read failed, computing')
      }
      const value = await compute()
      redis.set(key, JSON.stringify(value), 'EX', ttlSeconds).catch((error: unknown) => {
        logger.warn({ err: error, key }, 'cache write failed')
      })
      return value
    },
    async invalidatePrefix(prefix) {
      let removed = 0
      const stream = redis.scanStream({ match: `${prefix}*`, count: 200 })
      for await (const keys of stream as AsyncIterable<string[]>) {
        if (keys.length > 0) removed += await redis.unlink(...keys)
      }
      return removed
    },
    async ping() {
      try {
        return (await redis.ping()) === 'PONG'
      } catch {
        return false
      }
    },
    async close() {
      await redis.quit()
    },
  }
}

/** In-memory implementation used by tests and as a no-op fallback. */
export function createMemoryCache(): Cache {
  const store = new Map<string, unknown>()
  return {
    async remember(key, _ttl, compute) {
      if (store.has(key)) return store.get(key) as never
      const value = await compute()
      store.set(key, value)
      return value
    },
    async invalidatePrefix(prefix) {
      let removed = 0
      for (const key of store.keys()) {
        if (key.startsWith(prefix)) {
          store.delete(key)
          removed++
        }
      }
      return removed
    },
    async ping() {
      return true
    },
    async close() {},
  }
}
