type LogArgs = unknown[];

const isDev = process.env.NODE_ENV !== 'production';

export const logger = {
  debug: (...args: LogArgs): void => {
    if (isDev) console.debug(...args);
  },
  info: (...args: LogArgs): void => {
    console.info(...args);
  },
  warn: (...args: LogArgs): void => {
    console.warn(...args);
  },
  error: (...args: LogArgs): void => {
    console.error(...args);
  },
  log: (...args: LogArgs): void => {
    console.log(...args);
  },
};
