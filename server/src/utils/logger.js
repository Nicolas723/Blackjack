/**
 * Structured logger — wraps console with JSON output and correlation IDs.
 * In production, swap this with pino / winston without changing call sites.
 */
const LOG_LEVEL_ORDER = { debug:0, info:1, warn:2, error:3 };
const CURRENT_LEVEL   = process.env.LOG_LEVEL || 'info';

function _log(level, msg, meta = {}) {
  if (LOG_LEVEL_ORDER[level] < LOG_LEVEL_ORDER[CURRENT_LEVEL]) return;
  const entry = {
    ts:    new Date().toISOString(),
    level,
    msg,
    ...meta
  };
  const fn = level === 'error' ? console.error : console.log;
  fn(JSON.stringify(entry));
}

const logger = {
  debug : (msg, meta) => _log('debug', msg, meta),
  info  : (msg, meta) => _log('info',  msg, meta),
  warn  : (msg, meta) => _log('warn',  msg, meta),
  error : (msg, meta) => _log('error', msg, meta),
  /** Returns a child logger that always includes the given context fields */
  child : (ctx) => ({
    debug : (msg, meta) => _log('debug', msg, { ...ctx, ...meta }),
    info  : (msg, meta) => _log('info',  msg, { ...ctx, ...meta }),
    warn  : (msg, meta) => _log('warn',  msg, { ...ctx, ...meta }),
    error : (msg, meta) => _log('error', msg, { ...ctx, ...meta }),
  })
};

module.exports = logger;
