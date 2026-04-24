import Card from './Card.jsx';

/** Score classification for pill styling */
function scoreClass(score, status) {
  if (status === 'blackjack') return 'bj';
  if (status === 'bust' || score > 21) return 'bust';
  if (score >= 18 && score <= 21)      return 'safe';
  return '';
}

export default function Hand({ cards = [], score, label, status, small = false, isCurrent = false }) {
  const isBJ   = status === 'blackjack';
  const isBust = status === 'bust' || (score > 21 && score !== undefined);
  const cls    = scoreClass(score, status);

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}>
      {label && (
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{
            fontSize: small ? 14 : 18, fontWeight: 600, letterSpacing: 2, textTransform:'uppercase',
            color: isCurrent ? 'var(--gold-light)' : 'var(--text-muted)'
          }}>
            {label}
          </span>
          {isBJ   && <span className="pill pill-gold">★ Blackjack</span>}
          {isBust && !isBJ && <span className="pill pill-red">Bust</span>}
        </div>
      )}

      <div style={{ display:'flex', gap: small ? 10 : 16, flexWrap:'wrap', justifyContent:'center', alignItems:'flex-end' }}>
        {cards.length > 0
          ? cards.map((c, i) => <Card key={i} card={c} small={small} />)
          : <div style={{ width: small?95:140, height: small?142:210, borderRadius:small?10:14, border:'3px dashed rgba(255,255,255,.12)', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-dim)', fontSize:32 }}>?</div>
        }
      </div>

      {score !== undefined && score !== null && cards.length > 0 && (
        <span className={`score ${cls}`}>
          {isBJ ? '21 ★' : score}
        </span>
      )}
    </div>
  );
}
