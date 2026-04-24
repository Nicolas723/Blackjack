import { useState, useEffect } from 'react';
import Hand from '../components/Hand.jsx';

const CHIPS = [
  { val: 10000, label: '10K', cls: '10k' },
  { val: 25000, label: '25K', cls: '25k' },
  { val: 50000, label: '50K', cls: '50k' },
  { val: 100000, label: '100K', cls: '100k' },
  { val: 500000, label: '500K', cls: '500k' }
];

export default function Game({ player, room, myHand, myScore, emit, on, off, onLeave }) {
  const [bet, setBet]     = useState(0);
  const [timer, setTimer] = useState(null);
  const [toast, setToast] = useState('');
  const [result, setResult] = useState('');
  const [dealProgress, setDealProgress] = useState(999);
  const [isWatchingAd, setIsWatchingAd] = useState(false);

  const startAd = () => {
    setIsWatchingAd(true);
    setTimeout(() => {
      setIsWatchingAd(false);
      emit('restock_chips');
      setToast('💰 ¡Felicidades! Has recibido $1.000.000 por ver el anuncio.');
    }, 4000); // 4 second simulation
  };

  const phase      = room.phase;
  const isMyTurn   = room.currentTurnPlayerId === player.playerId;
  const myPub      = room.players?.[player.playerId];
  const myStatus   = myPub?.status;
  const myChips    = myPub?.chips ?? player.chips;

  /* Turn countdown */
  useEffect(() => {
    let interval = null;
    const unsub = on('turn_timer', ({ deadline }) => {
      if (interval) clearInterval(interval);
      
      const tick = () => {
        const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
        setTimer(left);
        if (left <= 0) {
          setTimer(null);
          if (interval) clearInterval(interval);
        }
      };
      
      tick();
      interval = setInterval(tick, 1000); // Ticking once per second is enough
    });
    return () => {
      off('turn_timer', unsub);
      if (interval) clearInterval(interval);
    };
  }, [on, off]);

  /* Deal Animation Sequence */
  const turnOrder = room.turnOrder || [];
  useEffect(() => {
    if (phase === 'betting') setDealProgress(0);
    if (phase === 'playing' && dealProgress === 0) {
      const total = turnOrder.length * 2 + 2;
      let curr = 0;
      const t = setInterval(() => {
        curr++;
        setDealProgress(curr);
        if (curr >= total) clearInterval(t);
      }, 100); // Faster deal animation
      return () => clearInterval(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const getVisibleCount = (type, pId, totalCards) => {
    if (phase !== 'playing' || dealProgress > 900) return totalCards;
    
    const N = turnOrder.length;
    let count = 0;
    for (let c = 0; c < totalCards; c++) {
      let req = 0;
      if (c >= 2) {
        req = 0; 
      } else {
        if (type === 'player') {
          const idx = turnOrder.indexOf(pId);
          if (idx === -1) req = 0;
          else if (c === 0) req = idx + 1;
          else if (c === 1) req = N + 1 + idx + 1;
        } else {
          if (c === 0) req = N + 1;
          if (c === 1) req = 2 * N + 2;
        }
      }
      if (dealProgress >= req) count++;
    }
    return count;
  };

  /* Errors */
  useEffect(() => {
    const h = ({ message }) => { setToast(message); setTimeout(() => setToast(''), 3000); };
    on('error', h);
    return () => off('error', h);
  }, []);

  /* Flash result */
  useEffect(() => {
    if (phase === 'results' && room.results?.[player.playerId]) {
      const r = room.results[player.playerId];
      const map = { win:'🎉 You win!', blackjack:'🌟 Blackjack!', push:'🤝 Push — bet returned', bust:'💥 Bust!', loss:'😔 Dealer wins' };
      setResult(map[r.outcome] || '');
    }
  }, [phase]);

  useEffect(() => {
    try {
      if (window.adsbygoogle) {
        window.adsbygoogle.push({});
      }
    } catch (e) {
      console.error('Ads error', e);
    }
  }, [phase]);

  const addChip = v => {
    const next = bet + v;
    if (next <= myChips) setBet(next);
  };
  const placeBet = () => { if (bet >= 10000) { emit('place_bet', { amount: bet }); setBet(0); } };
  const act      = a  => emit('player_action', { action: a });

  const allPlayers  = Object.values(room.players || {});
  const dealerHand  = room.dealerHand || [];
  const isDealing   = phase === 'playing' || phase === 'dealer_turn';
  const isDealAnimating = phase === 'playing' && dealProgress < (turnOrder.length * 2 + 2);

  return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', background:'radial-gradient(ellipse 160% 120% at 50% 0%, var(--felt-mid) 0%, var(--felt-dark) 70%)' }}>
      {toast  && <div className="toast">{toast}</div>}
      {result && <div className="toast" style={{ borderColor:'var(--gold-light)', color:'var(--gold-light)' }}>{result}</div>}

      {isWatchingAd && (
        <div style={{
          position:'fixed', inset:0, zIndex:999, background:'rgba(0,0,0,0.95)',
          display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:24
        }}>
          <div className="display-md" style={{ color:'var(--gold)' }}>Anuncio en curso...</div>
          <div style={{ width:200, height:6, background:'rgba(255,255,255,0.1)', borderRadius:3, overflow:'hidden' }}>
            <div className="progress-bar-fill" style={{ height:'100%', background:'var(--gold)', animation:'progress 4s linear' }} />
          </div>
          <p style={{ color:'var(--text-dim)', fontSize:14 }}>Recibirás tus fichas al finalizar el video</p>
          <style>{`
            @keyframes progress { from { width: 0; } to { width: 100%; } }
          `}</style>
        </div>
      )}

      {/* ── Nav bar ───────────────────────────────────────────── */}
      <div style={{
        display:'flex', justifyContent:'space-between', alignItems:'center',
        padding:'12px 24px', background:'rgba(0,0,0,.28)',
        borderBottom:'1px solid var(--border-dim)', flexShrink:0
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:16 }}>
          <span className="display-sm" style={{ color:'var(--gold-light)' }}>Blackjack Royal</span>
          {room.type === 'private' && (
            <span style={{
              fontFamily:'monospace', fontSize:13, fontWeight:700, letterSpacing:3,
              color:'var(--gold)', background:'rgba(0,0,0,.3)', padding:'3px 12px',
              borderRadius:6, border:'1px solid var(--gold-dim)'
            }}>
              {room.code}
            </span>
          )}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:16 }}>
          <span style={{ color:'var(--text-muted)', fontSize:13 }}>
            💰 <strong style={{ color:'var(--gold)' }}>{myChips.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })}</strong>
          </span>
          <button className="btn btn-ghost btn-sm" onClick={onLeave} id="leave-btn">Leave</button>
        </div>
      </div>

      {/* ── Phase strip ───────────────────────────────────────── */}
      <div style={{
        display:'flex', justifyContent:'center', gap:8, padding:'8px 0',
        background:'rgba(0,0,0,.15)', borderBottom:'1px solid var(--border-dim)', flexShrink:0
      }}>
        {[
          { id:'lobby',       label:'Lobby' },
          { id:'betting',     label:'Betting' },
          { id:'playing',     label:'Playing' },
          { id:'dealer_turn', label:'Dealer' },
          { id:'results',     label:'Results' },
        ].map(s => (
          <div key={s.id} style={{
            padding:'3px 14px', borderRadius:99, fontSize:11, fontWeight:600, letterSpacing:.5,
            background: phase === s.id ? 'rgba(201,162,74,.2)' : 'transparent',
            color: phase === s.id ? 'var(--gold-light)' : 'var(--text-dim)',
            border: phase === s.id ? '1px solid rgba(201,162,74,.4)' : '1px solid transparent',
            transition:'all .25s'
          }}>
            {s.label}
          </div>
        ))}
      </div>

      {/* ── Main table ────────────────────────────────────────── */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'auto', justifyContent:'space-evenly' }}>

        {/* Dealer zone */}
        <div style={{ padding:'36px 20px 20px', display:'flex', flexDirection:'column', alignItems:'center', gap:14 }}>
          <Hand
            cards={dealerHand.slice(0, getVisibleCount('dealer', null, dealerHand.length))}
            score={room.dealerScore}
            label="Dealer"
            status={phase === 'playing' ? undefined : undefined}
          />
        </div>

        <div className="divider-gold" style={{ margin:'0 40px' }} />

        {/* Players zone */}
        <div style={{ display:'flex', justifyContent:'center', gap:14, flexWrap:'wrap', padding:'20px 16px', flex:1, alignItems:'flex-start' }}>
          {allPlayers.map(p => {
            const isMe      = p.id === player.playerId;
            const isCurrent = room.currentTurnPlayerId === p.id && phase === 'playing';
            // Ahora mostramos la mano pública para todos, fallback a myHand si es el usuario actual
            const hand      = (isMe ? (myHand || p.hand) : p.hand) || [];
            const score     = isMe ? (myScore ?? p.score) : p.score;

            return (
              <div key={p.id} style={{
                background: isCurrent
                  ? 'linear-gradient(160deg, rgba(201,162,74,.1), rgba(0,0,0,.3))'
                  : 'var(--surface)',
                border:`1px solid ${isCurrent ? 'rgba(201,162,74,.55)' : 'var(--border-dim)'}`,
                borderRadius:18, padding:'24px',
                display:'flex', flexDirection:'column', alignItems:'center', gap:16,
                minWidth:260,
                boxShadow: isCurrent ? '0 0 32px rgba(201,162,74,.2)' : 'none',
                transition:'all .3s ease',
              }}>
                {/* Player header */}
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontWeight:600, fontSize:18, color: isMe ? 'var(--gold-light)' : 'var(--cream)' }}>
                    {isMe ? '★ ' : ''}{p.username}
                    {isCurrent && <span style={{ marginLeft:5, color:'var(--gold)', fontSize:14 }}>▼</span>}
                  </div>
                  <div style={{ color:'var(--text-muted)', fontSize:14, marginTop:6 }}>
                    💰 {p.chips.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })}
                    {p.bet > 0 && <span style={{ color:'var(--gold-light)', marginLeft:8 }}>· Bet {p.bet.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })}</span>}
                  </div>
                </div>

                <Hand 
                  cards={hand.slice(0, getVisibleCount('player', p.id, hand.length))} 
                  score={score} 
                  status={p.status} 
                  small={!isMe} 
                  isCurrent={isCurrent} 
                />

                {/* Status pill */}
                <div>
                  {p.status === 'waiting'   && <span className="pill pill-muted">Waiting</span>}
                  {p.status === 'betting'   && <span className="pill pill-blue">Placing bet…</span>}
                  {p.status === 'ready'     && <span className="pill pill-green">Ready</span>}
                  {p.status === 'playing'   && isCurrent && <span className="pill pill-gold">Your turn</span>}
                  {p.status === 'playing'   && !isCurrent && <span className="pill pill-blue">Playing</span>}
                  {p.status === 'standing'  && <span className="pill pill-muted">Standing</span>}
                  {p.status === 'bust'      && <span className="pill pill-red">Bust</span>}
                  {p.status === 'blackjack' && <span className="pill pill-gold">Blackjack!</span>}
                  {p.status === 'skip'      && <span className="pill pill-muted">Observando</span>}
                </div>

                {/* Round result */}
                {phase === 'results' && room.results?.[p.id] && (() => {
                  const r = room.results[p.id];
                  const colors = { win:'#5dde8b', blackjack:'var(--gold-light)', push:'var(--cream-dim)', bust:'var(--red-bright)', loss:'var(--red-bright)' };
                  const labels = { win:`+${r.payout} WIN`, blackjack:`+${r.payout} BJ`, push:'PUSH', bust:'BUST', loss:'LOSS' };
                  return (
                    <div style={{ fontWeight:700, color: colors[r.outcome], fontSize:14, letterSpacing:.5 }}>
                      {labels[r.outcome] || r.outcome}
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Action bar ────────────────────────────────────────── */}
      <div style={{ background:'rgba(0,0,0,.35)', borderTop:'1px solid var(--border)', padding:'18px 24px', flexShrink:0 }}>

        {/* BETTING */}
        {phase === 'betting' && myStatus === 'betting' && (
          <div style={{ display:'flex', flexDirection:'column', gap:14, alignItems:'center' }}>
            {myChips < 10000 && bet === 0 ? (
              <div style={{ textAlign: 'center' }}>
                <p style={{ color: 'var(--red-bright)', marginBottom: 12, fontWeight: 600, fontSize: 16 }}>¡Te quedaste sin fondos!</p>
                <button className="btn btn-gold btn-xl" onClick={startAd}>
                  🎬 Ver anuncio para recargar
                </button>
              </div>
            ) : (
              <>
                <p className="label">Place your bet</p>
                <div style={{ display:'flex', gap:10, flexWrap:'wrap', justifyContent:'center' }}>
                  {CHIPS.map(c => (
                    <div key={c.val} className={`chip chip-${c.cls}`} onClick={() => addChip(c.val)} id={`chip-${c.cls}`} title={`+${c.label}`}>
                      {c.label}
                    </div>
                  ))}
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:16 }}>
                  <span className="bet-display">{bet > 0 ? bet.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }) : '–'}</span>
                  <div style={{ display:'flex', gap:8 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => setBet(0)} disabled={bet === 0}>Clear</button>
                    <button className="btn btn-ghost btn-sm" style={{ color:'var(--gold-light)' }} onClick={() => setBet(myChips)} disabled={myChips === 0}>All In</button>
                  </div>
                  <button id="place-bet-btn" className="btn btn-gold btn-xl" onClick={placeBet} disabled={bet < 10000}>
                    Confirm Bet
                  </button>
                </div>
                <button className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={() => emit('skip_round')}>
                  Saltar esta ronda
                </button>
              </>
            )}
          </div>
        )}

        {phase === 'betting' && myStatus !== 'betting' && (
          <div style={{ textAlign:'center', color:'var(--text-muted)', fontSize:14 }}>
            ⏳ Waiting for other players to bet…
          </div>
        )}

        {/* PLAYING — my turn */}
        {phase === 'playing' && isMyTurn && myStatus === 'playing' && !isDealAnimating && (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:12 }}>
            {timer !== null && (
              <div style={{
                width:42, height:42, borderRadius:'50%', border:`2px solid ${timer <= 10 ? 'var(--red)' : 'var(--border)'}`,
                display:'flex', alignItems:'center', justifyContent:'center',
                fontWeight:700, fontSize:14, color: timer <= 10 ? 'var(--red-bright)' : 'var(--cream-dim)',
                transition:'border-color .3s, color .3s',
                flexShrink:0
              }}>
                {timer}
              </div>
            )}
            <button id="hit-btn" className="btn btn-green btn-xl" onClick={() => act('hit')}>
              Hit  ↑
            </button>
            <button id="stand-btn" className="btn btn-gold btn-xl" onClick={() => act('stand')}>
              Stand  ✋
            </button>
          </div>
        )}

        {/* PLAYING — waiting for others */}
        {phase === 'playing' && (!isMyTurn || myStatus !== 'playing' || isDealAnimating) && (
          <div style={{ textAlign:'center', color:'var(--text-muted)', fontSize:14 }}>
            {isDealAnimating && '🃏 Repartiendo cartas...'}
            {!isDealAnimating && myStatus === 'standing'  && '✋ You stood — watching the rest of the round'}
            {!isDealAnimating && myStatus === 'bust'      && '💥 Busted — watching the dealer'}
            {!isDealAnimating && myStatus === 'blackjack' && '🌟 Blackjack! — watching the dealer'}
            {!isDealAnimating && myStatus === 'playing'   && !isMyTurn && `⏳ Waiting for ${room.players[room.currentTurnPlayerId]?.username ?? '…'} to play…`}
          </div>
        )}

        {/* DEALER TURN */}
        {phase === 'dealer_turn' && (
          <div style={{ textAlign:'center', color:'var(--text-muted)', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center', gap:10 }}>
            <span style={{ fontSize:22 }}>🎰</span>
            Dealer is drawing cards…
          </div>
        )}

        {/* RESULTS */}
        {phase === 'results' && (
          <div style={{ textAlign:'center', color:'var(--text-muted)', fontSize:13 }}>
            ⏳ Next round starting in a few seconds…
          </div>
        )}
      </div>

      {/* ── Ad Banner ────────────────────────────────────────── */}
      <div style={{
        background: 'var(--surface-hi)',
        borderTop: '1px solid var(--border)',
        minHeight: 90,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        overflow: 'hidden'
      }}>
        {/* Google AdSense Banner */}
        <ins className="adsbygoogle"
             style={{ display:'inline-block', width:'728px', height:'90px' }}
             data-ad-client="ca-pub-6583856496198486"
             data-ad-slot="auto"></ins>
      </div>
    </div>
  );
}
