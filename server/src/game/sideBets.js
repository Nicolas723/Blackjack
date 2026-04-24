const { calculateScore, isBlackjack } = require('./deck');

/**
 * Perfect Pairs:
 * - Perfect Pair: same rank, same suit (25:1)
 * - Colored Pair: same rank, same color (12:1)
 * - Mixed Pair: same rank, different color (6:1)
 */
function evaluatePerfectPairs(hand, bet) {
  if (!bet || bet <= 0) return 0;
  if (hand.length < 2) return 0;
  const c1 = hand[0];
  const c2 = hand[1];

  if (c1.rank !== c2.rank) return 0;

  if (c1.suit === c2.suit) return bet * 25;
  
  const isRed = s => s === 'hearts' || s === 'diamonds';
  if (isRed(c1.suit) === isRed(c2.suit)) return bet * 12;
  
  return bet * 6;
}

/**
 * 21+3:
 * - Suited Triple: Three cards same rank, same suit (100:1)
 * - Straight Flush: Consecutive ranks, same suit (40:1)
 * - Three of a Kind: Three cards same rank, different suits (30:1)
 * - Straight: Consecutive ranks, different suits (10:1)
 * - Flush: Three cards same suit (5:1)
 */
function evaluate21Plus3(playerHand, dealerCard, bet) {
  if (!bet || bet <= 0) return 0;
  const cards = [...playerHand, dealerCard];
  const suits = cards.map(c => c.suit);
  const ranks = cards.map(c => c.rank);
  
  const rankVals = ranks.map(r => {
    if (r === 'A') return 14; // Can be 1 or 14, simplified
    if (r === 'K') return 13;
    if (r === 'Q') return 12;
    if (r === 'J') return 11;
    return parseInt(r);
  }).sort((a,b) => a-b);

  const isFlush = suits.every(s => s === suits[0]);
  
  // Straight check (including A,2,3)
  let isStraight = (rankVals[1] === rankVals[0] + 1 && rankVals[2] === rankVals[1] + 1);
  if (!isStraight && rankVals[2] === 14 && rankVals[0] === 2 && rankVals[1] === 3) isStraight = true;

  const isThreeOfAKind = ranks.every(r => r === ranks[0]);

  if (isFlush && isThreeOfAKind) return bet * 100;
  if (isFlush && isStraight) return bet * 40;
  if (isThreeOfAKind) return bet * 30;
  if (isStraight) return bet * 10;
  if (isFlush) return bet * 5;
  
  return 0;
}

function evaluateBustBonus(dealerHand, bet) {
  if (!bet || bet <= 0) return 0;
  const score = calculateScore(dealerHand);
  if (score <= 21) return 0; // Dealer didn't bust

  const cardCount = dealerHand.length;
  // Payout table based on number of cards dealer used to bust
  const payouts = {
    3: 1,
    4: 3,
    5: 15,
    6: 50,
    7: 100,
    8: 250
  };

  const multiplier = payouts[cardCount] || (cardCount > 8 ? 250 : 0);
  return bet * (multiplier + 1); // Win + return original bet
}

module.exports = { evaluatePerfectPairs, evaluate21Plus3, evaluateBustBonus };
