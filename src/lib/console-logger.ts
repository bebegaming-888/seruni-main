type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLevel = (import.meta.env.VITE_LOG_LEVEL as LogLevel) ?? "info";

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}

export const logger = {
  debug: (...args: unknown[]) => shouldLog("debug") && console.debug(...args),
  info: (...args: unknown[]) => shouldLog("info") && console.info(...args),
  warn: (...args: unknown[]) => shouldLog("warn") && console.warn(...args),
  error: (...args: unknown[]) => shouldLog("error") && console.error(...args),
};

export default logger;
