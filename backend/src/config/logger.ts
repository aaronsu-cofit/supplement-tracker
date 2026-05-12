import pino from 'pino';

const isDev = process.env.NODE_ENV !== 'production';

export const createLogger = () => {
  if (isDev) {
    return pino({
      level: process.env.LOG_LEVEL || 'debug',
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      },
    });
  }

  // Production: JSON logs
  return pino({
    level: process.env.LOG_LEVEL || 'info',
  });
};

export const logger = createLogger();
