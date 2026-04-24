const { createDeck, shuffle, calculateScore, isBlackjack } = require('./deck');

function dealCard(room) {
  if (room.deck.length < 10) room.deck = shuffle(createDeck(6));
  return room.deck.pop();
}

/** Deal cards and transition room to 'playing' or 'dealer_turn' */
function startGame(room) {
  room.deck = shuffle(createDeck(6));
  room.dealerHand = [];
  room.dealerScore = 0;
  room.turnOrder = Object.keys(room.players).filter(id => room.players[id].isConnected);
  room.currentTurnIndex = 0;

  // Deal 2 cards to every active player
  for (const pid of room.turnOrder) {
    const p = room.players[pid];
    p.hand = [dealCard(room), dealCard(room)];
    p.score = calculateScore(p.hand);
    p.status = isBlackjack(p.hand) ? 'blackjack' : 'playing';
  }

  // Dealer: first card visible, second face-down
  room.dealerHand = [dealCard(room), { ...dealCard(room), faceDown: true }];
  room.dealerScore = calculateScore(room.dealerHand);

  // Skip blackjack players at the front of the queue
  _skipNonPlaying(room);

  return room.currentTurnIndex >= room.turnOrder.length ? 'dealer_turn' : 'playing';
}

function playerHit(room, playerId) {
  const p = room.players[playerId];
  if (!p || p.status !== 'playing') return null;
  const card = dealCard(room);
  p.hand.push(card);
  p.score = calculateScore(p.hand);
  if (p.score > 21) { p.status = 'bust'; return _advanceTurn(room); }
  if (p.score === 21) { p.status = 'standing'; return _advanceTurn(room); }
  return 'playing';
}

function playerStand(room, playerId) {
  const p = room.players[playerId];
  if (!p || p.status !== 'playing') return null;
  p.status = 'standing';
  return _advanceTurn(room);
}

function dealerPlay(room) {
  // Reveal hole card
  if (room.dealerHand[1]) room.dealerHand[1] = { ...room.dealerHand[1], faceDown: false };
  room.dealerScore = calculateScore(room.dealerHand);
  // Draw to 17
  while (room.dealerScore < 17) {
    room.dealerHand.push(dealCard(room));
    room.dealerScore = calculateScore(room.dealerHand);
  }
  return evaluateResults(room);
}

function evaluateResults(room) {
  const ds = room.dealerScore;
  const dealerBust = ds > 21;
  const results = {};

  for (const pid of room.turnOrder) {
    const p = room.players[pid];
    let outcome, payout;

    if (p.status === 'blackjack') {
      outcome = 'blackjack'; payout = Math.floor(p.bet * 2.5);
    } else if (p.status === 'bust') {
      outcome = 'bust'; payout = 0;
    } else if (dealerBust || p.score > ds) {
      outcome = 'win'; payout = p.bet * 2;
    } else if (p.score === ds) {
      outcome = 'push'; payout = p.bet;
    } else {
      outcome = 'loss'; payout = 0;
    }

    p.chips += payout;
    results[pid] = { playerId: pid, username: p.username, outcome, payout, hand: p.hand, finalScore: p.score };
    p.bet = 0;
  }
  return results;
}

function getCurrentTurnPlayerId(room) {
  if (room.phase !== 'playing') return null;
  if (room.currentTurnIndex >= room.turnOrder.length) return null;
  return room.turnOrder[room.currentTurnIndex];
}

function _advanceTurn(room) {
  room.currentTurnIndex++;
  _skipNonPlaying(room);
  return room.currentTurnIndex >= room.turnOrder.length ? 'dealer_turn' : 'playing';
}

function _skipNonPlaying(room) {
  while (
    room.currentTurnIndex < room.turnOrder.length &&
    room.players[room.turnOrder[room.currentTurnIndex]].status !== 'playing'
  ) { room.currentTurnIndex++; }
}

module.exports = { startGame, playerHit, playerStand, dealerPlay, getCurrentTurnPlayerId };
