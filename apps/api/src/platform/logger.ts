import { pino } from 'pino'
import type { Config } from './config'

export type Logger = pino.Logger

export function createLogger(config: Pick<Config, 'LOG_LEVEL'>, name: string): Logger {
  return pino({ name, level: config.LOG_LEVEL })
}
