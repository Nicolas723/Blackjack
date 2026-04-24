const { createDeck, shuffle, calculateScore, isBlackjack } = require('./deck');
const { evaluatePerfectPairs, evaluate21Plus3, evaluateBustBonus } = require('./sideBets');

function dealCard(room) {
  if (room.deck.length < 10) room.deck = shuffle(createDeck(6));
  return room.deck.pop();
}

/** Deal cards and transition room to 'playing' or 'dealer_turn' */
function startGame(room) {
  room.deck = shuffle(createDeck(6));
  room.dealerHand = [];
  room.dealerScore = 0;
  room.turnOrder = Object.keys(room.players).filter(id => {
    const p = room.players[id];
    return p.isConnected && p.bet > 0;
  });
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

  // Evaluate Pairs and 21+3 immediately
  for (const pid of room.turnOrder) {
    const p = room.players[pid];
    if (!p.sideBets) continue;

    const ppWin = evaluatePerfectPairs(p.hand, p.sideBets.perfectPairs);
    const tWin = evaluate21Plus3(p.hand, room.dealerHand[0], p.sideBets.twentyOnePlusThree);
    
    p.chips += (ppWin + tWin);
    p.sideBetResults = {
      perfectPairs: ppWin,
      twentyOnePlusThree: tWin
    };
  }

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

function dealerDraw(room) {
  const card = dealCard(room);
  room.dealerHand.push(card);
  room.dealerScore = calculateScore(room.dealerHand);
  return card;
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
    
    // Insurance evaluation
    if (p.sideBets?.insurance > 0 && isBlackjack(room.dealerHand)) {
      const insWin = p.sideBets.insurance * 3; // 2:1 plus original bet back
      p.chips += insWin;
      if (!p.sideBetResults) p.sideBetResults = {};
      p.sideBetResults.insurance = insWin;
    }

    // Bust Bonus evaluation
    if (p.sideBets?.bustBonus > 0) {
      const bbWin = evaluateBustBonus(room.dealerHand, p.sideBets.bustBonus);
      if (bbWin > 0) {
        p.chips += bbWin;
        if (!p.sideBetResults) p.sideBetResults = {};
        p.sideBetResults.bustBonus = bbWin;
      }
    }

    results[pid] = { 
      playerId: pid, 
      username: p.username, 
      outcome, 
      payout, 
      hand: p.hand, 
      finalScore: p.score,
      sideBetResults: p.sideBetResults
    };
    p.bet = 0;
    p.sideBets = { perfectPairs: 0, insurance: 0, twentyOnePlusThree: 0, bustBonus: 0 };
    p.sideBetResults = null;
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

module.exports = { 
  startGame, playerHit, playerStand, dealerDraw, evaluateResults, calculateScore,
  getCurrentTurnPlayerId 
};
