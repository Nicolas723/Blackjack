/**
 * Input validators for every socket event payload.
 * Returns the sanitised value or throws AppError.
 */
const { Errors } = require('./errors');

function validateUsername(raw) {
  if (typeof raw !== 'string') throw Errors.INVALID_USERNAME();
  const v = raw.trim().slice(0, 18);
  if (v.length < 2) throw Errors.INVALID_USERNAME();
  return v;
}

function validateRoomType(raw) {
  return raw === 'private' ? 'private' : 'public';
}

function validateBet(raw, chips, min = 10, max = 500) {
  const bet = Number.isInteger(raw) ? raw : parseInt(raw, 10);
  if (!Number.isInteger(bet) || bet < min || bet > max) throw Errors.INVALID_BET(min, max);
  if (bet > chips) throw Errors.INSUFFICIENT_CHIPS();
  return bet;
}

function validateAction(raw) {
  if (!['hit', 'stand'].includes(raw)) throw Errors.INVALID_ACTION();
  return raw;
}

function validateJoinPayload({ roomId, code } = {}) {
  const hasId   = typeof roomId === 'string' && roomId.length > 0;
  const hasCode = typeof code   === 'string' && code.trim().length === 6;
  if (!hasId && !hasCode) throw Errors.ROOM_NOT_FOUND();
  return {
    roomId: hasId   ? roomId          : null,
    code:   hasCode ? code.trim().toUpperCase() : null
  };
}

module.exports = { validateUsername, validateRoomType, validateBet, validateAction, validateJoinPayload };
