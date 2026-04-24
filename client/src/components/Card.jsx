/** Renders a single playing card — face-up or face-down */
const SUITS = { hearts:'♥', diamonds:'♦', clubs:'♣', spades:'♠' };
const RED   = new Set(['hearts','diamonds']);

export default function Card({ card, small = false }) {
  if (!card) return null;

  const sm = small ? ' sm' : '';

  if (card.faceDown || card.suit === 'hidden') {
    return <div className={`card-back${sm}`} aria-label="face-down card" />;
  }

  const sym    = SUITS[card.suit] ?? '?';
  const isRed  = RED.has(card.suit);
  const color  = isRed ? 'red' : 'black';

  return (
    <div className={`card-face ${color}${sm}`} aria-label={`${card.rank} of ${card.suit}`}>
      <span className="rank">{card.rank}</span>
      <span className="suit-center">{sym}</span>
      <span className="suit-corner">{sym}</span>
    </div>
  );
}
