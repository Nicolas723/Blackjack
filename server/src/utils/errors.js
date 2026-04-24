/**
 * AppError — typed domain errors that propagate cleanly through socket events.
 *
 * Usage:
 *   throw new AppError('Room is full', 'ROOM_FULL', 400);
 *
 * In handlers, catch with:
 *   } catch (e) { handleError(socket, e); }
 */
class AppError extends Error {
  /**
   * @param {string} message  Human-readable message (sent to client)
   * @param {string} code     Machine-readable error code
   * @param {number} [status] HTTP-equivalent status (for REST logging context)
   */
  constructor(message, code = 'INTERNAL_ERROR', status = 500) {
    super(message);
    this.name    = 'AppError';
    this.code    = code;
    this.status  = status;
  }
}

/** Emit a structured error to a socket and log it */
function handleError(socket, err, log) {
  const isApp  = err instanceof AppError;
  const code   = isApp ? err.code    : 'INTERNAL_ERROR';
  const msg    = isApp ? err.message : 'An unexpected error occurred';
  const status = isApp ? err.status  : 500;

  if (!isApp && log) log.error('Unhandled error', { err: err.message, stack: err.stack });

  socket.emit('error', { code, message: msg, status });
}

// ─── Pre-defined domain errors ─────────────────────────────────────────────
const Errors = {
  NOT_REGISTERED     : () => new AppError('Not registered',         'NOT_REGISTERED',      401),
  ALREADY_IN_ROOM    : () => new AppError('Already in a room',      'ALREADY_IN_ROOM',     409),
  ROOM_NOT_FOUND     : () => new AppError('Room not found',         'ROOM_NOT_FOUND',      404),
  ROOM_FULL          : () => new AppError('Room is full',           'ROOM_FULL',           409),
  GAME_STARTED       : () => new AppError('Game already in progress','GAME_STARTED',        409),
  NOT_IN_ROOM        : () => new AppError('Not in a room',          'NOT_IN_ROOM',         400),
  WRONG_PHASE        : (p) => new AppError(`Invalid action in phase: ${p}`, 'WRONG_PHASE', 400),
  NOT_YOUR_TURN      : () => new AppError('Not your turn',          'NOT_YOUR_TURN',       403),
  INVALID_ACTION     : () => new AppError('Invalid action',         'INVALID_ACTION',      400),
  INVALID_BET        : (min, max) => new AppError(`Bet must be between ${min} and ${max}`, 'INVALID_BET', 400),
  INSUFFICIENT_CHIPS : () => new AppError('Insufficient chips',     'INSUFFICIENT_CHIPS',  400),
  INVALID_USERNAME   : () => new AppError('Username must be 2–18 characters', 'INVALID_USERNAME', 400),
};

module.exports = { AppError, handleError, Errors };
