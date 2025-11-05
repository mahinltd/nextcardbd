// © NextCartBD - Developed by Mahin Ltd (Tanvir)

// A simple console logger utility.
// In a large-scale app, this could be expanded to use libraries like Winston.

const logLevels = {
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
  DEBUG: 'DEBUG',
};

const getTimestamp = () => new Date().toISOString();

const log = (level, message, ...args) => {
  if (process.env.NODE_ENV !== 'test') {
    const timestamp = getTimestamp();
    console.log(`[${timestamp}] [${level}] - ${message}`, ...args);
  }
};

const logger = {
  info: (message, ...args) => log(logLevels.INFO, message, ...args),
  warn: (message, ...args) => log(logLevels.WARN, message, ...args),
  error: (message, ...args) => log(logLevels.ERROR, message, ...args),
  debug: (message, ...args) => {
    if (process.env.NODE_ENV === 'development') {
      log(logLevels.DEBUG, message, ...args);
    }
  },
};

export default logger;