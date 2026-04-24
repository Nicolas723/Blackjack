/** Room waiting screen — shown while phase === 'lobby' or 'betting' */
export default function Room({ player, room, emit, onLeave }) {
  const phase      = room.phase;
  const players    = Object.values(room.players || {});
  const me         = room.players?.[player.playerId];
  const isReady    = me?.isReady ?? false;
  const allReady   = players.length > 0 && players.every(p => p.isReady);
  const isPrivate  = room.type === 'private';

  return (
    <div className="felt-bg" style={{ minHeight:'100vh', padding:'28px 16px 48px', display:'flex', flexDirection:'column', alignItems:'center' }}>
      <div className="z1" style={{ width:'100%', maxWidth:620 }}>

        {/* ── Top bar ──────────────────────────────────────────── */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:36 }}>
          <div>
            <h1 className="display-sm" style={{ color:'var(--gold-light)', display:'flex', alignItems:'center', gap:10 }}>
              {isPrivate ? '🔒' : '🃏'} Table Lobby
            </h1>
            {isPrivate && (
              <div style={{ marginTop:8, display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ color:'var(--text-muted)', fontSize:12, letterSpacing:.5 }}>Room code</span>
                <span style={{
                  fontFamily:'monospace', fontSize:20, fontWeight:700, letterSpacing:6,
                  color:'var(--gold-light)', background:'rgba(0,0,0,.35)',
                  padding:'4px 14px', borderRadius:6, border:'1px solid var(--gold-dim)'
                }}>
                  {room.code}
                </span>
              </div>
            )}
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onLeave} id="leave-btn">← Leave</button>
        </div>

        {/* ── Player roster ────────────────────────────────────── */}
        <div className="panel" style={{ padding:28, marginBottom:20 }}>
          <p className="label" style={{ marginBottom:20 }}>
            Players ({players.length} / {room.maxPlayers})
          </p>

          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {players.map(p => {
              const isMe = p.id === player.playerId;
              return (
                <div key={p.id} style={{
                  display:'flex', alignItems:'center', justifyContent:'space-between',
                  padding:'14px 18px', borderRadius:10,
                  background: isMe ? 'rgba(201,162,74,.08)' : 'var(--surface-hi)',
                  border: `1px solid ${isMe ? 'rgba(201,162,74,.3)' : 'var(--border-dim)'}`,
                  transition:'background .2s'
                }}>
                  <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                    {/* Avatar circle */}
                    <div style={{
                      width:36, height:36, borderRadius:'50%',
                      background:'linear-gradient(135deg, var(--felt-mid), var(--felt-bright))',
                      border:'2px solid rgba(255,255,255,.12)',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize:15, fontFamily:'var(--font-display)', fontWeight:700, color:'var(--gold)'
                    }}>
                      {p.username[0].toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight:600, color: isMe ? 'var(--gold-light)' : 'var(--cream)', fontSize:14 }}>
                        {p.username}{isMe && ' (you)'}
                      </div>
                      <div style={{ color:'var(--text-muted)', fontSize:12, marginTop:2 }}>
                        💰 {p.chips.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })}
                      </div>
                    </div>
                  </div>

                  <span className={`pill ${p.isReady ? 'pill-green' : 'pill-muted'}`}>
                    {p.isReady ? '✓ Ready' : 'Waiting'}
                  </span>
                </div>
              );
            })}

            {/* Empty slots */}
            {Array.from({ length: room.maxPlayers - players.length }).map((_, i) => (
              <div key={`empty-${i}`} style={{
                padding:'14px 18px', borderRadius:10,
                border:'2px dashed rgba(255,255,255,.07)',
                display:'flex', alignItems:'center', gap:12
              }}>
                <div style={{ width:36, height:36, borderRadius:'50%', background:'rgba(255,255,255,.04)', border:'1px dashed rgba(255,255,255,.12)' }} />
                <span style={{ color:'var(--text-dim)', fontSize:13 }}>Waiting for player…</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Rules / info strip ───────────────────────────────── */}
        <div className="panel-inset" style={{ padding:'14px 20px', marginBottom:20, display:'flex', gap:24, justifyContent:'center', flexWrap:'wrap' }}>
          {[
            ['Min bet', '$10K'],
            ['Max bet', '$1M'],
            ['Blackjack', '2.5×'],
            ['Dealer', 'Stands on 17'],
          ].map(([k,v]) => (
            <div key={k} style={{ textAlign:'center' }}>
              <div className="label" style={{ marginBottom:3 }}>{k}</div>
              <div style={{ color:'var(--gold-light)', fontWeight:700, fontSize:14 }}>{v}</div>
            </div>
          ))}
        </div>

        {/* ── Ready button ─────────────────────────────────────── */}
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:14 }}>
          {phase === 'lobby' && (
            <>
              <button
                id="ready-btn"
                className={`btn btn-xl w-full ${isReady ? 'btn-ghost' : 'btn-gold'}`}
                onClick={() => emit('toggle_ready')}
              >
                {isReady ? '✕  Cancel Ready' : '✓  I\'m Ready to Play'}
              </button>
              {allReady
                ? <p style={{ color:'var(--gold)', fontSize:13, fontWeight:600 }}>All players ready — starting soon…</p>
                : <p style={{ color:'var(--text-muted)', fontSize:13 }}>
                    Waiting for all present players to be ready...
                  </p>
              }
            </>
          )}
          {phase === 'betting' && (
            <p style={{ color:'var(--gold)', fontSize:14, fontWeight:600 }}>
              🎲 Bets are being placed — transitioning to game…
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
