import { useState, useEffect } from 'react';

export default function Lobby({ player, emit, on, off }) {
  const [rooms, setRooms]   = useState([]);
  const [code, setCode]     = useState('');
  const [tab, setTab]       = useState('public');
  const [toast, setToast]   = useState('');

  useEffect(() => {
    emit('get_public_rooms');
    const unsub = on('public_rooms', setRooms);
    const iv = setInterval(() => emit('get_public_rooms'), 4000);
    return () => { off('public_rooms', setRooms); clearInterval(iv); };
  }, []);

  useEffect(() => {
    const handler = ({ message }) => { setToast(message); setTimeout(() => setToast(''), 3000); };
    on('error', handler);
    return () => off('error', handler);
  }, []);

  const create = (type) => emit('create_room', { type });
  const join   = (id)   => emit('join_room', { roomId: id });
  const joinCode = () => { if (code.trim().length === 6) emit('join_room', { code: code.trim() }); };

  return (
    <div className="felt-bg" style={{ minHeight:'100vh', padding:'28px 16px 48px' }}>
      {toast && <div className="toast">{toast}</div>}

      <div className="z1" style={{ maxWidth: 780, margin:'0 auto' }}>

        {/* ── Header bar ─────────────────────────────────────── */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom: 36 }}>
          <div>
            <h1 className="display-lg" style={{ color:'var(--gold-light)' }}>Blackjack Royal</h1>
            <p style={{ color:'var(--text-muted)', fontSize:13, marginTop:4 }}>Choose a table to join or create your own</p>
          </div>

          <div className="panel" style={{ padding:'12px 20px', textAlign:'right', flexShrink:0 }}>
            <div style={{ fontWeight:600, color:'var(--cream)', fontSize:14 }}>{player.username}</div>
            <div style={{ color:'var(--gold)', fontSize:13, marginTop:2 }}>
              💰 {player.chips.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })}
            </div>
          </div>
        </div>

        {/* ── Tab switcher ────────────────────────────────────── */}
        <div style={{ display:'flex', gap:8, marginBottom: 24 }}>
          {[
            { key:'public',  label:'🌐  Public Tables' },
            { key:'private', label:'🔒  Private Room' },
          ].map(t => (
            <button
              key={t.key} id={`tab-${t.key}`}
              className={`btn ${tab === t.key ? 'btn-gold' : 'btn-ghost'}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Public tables ────────────────────────────────────── */}
        {tab === 'public' && (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
              <span style={{ color:'var(--text-muted)', fontSize:13 }}>
                {rooms.length} table{rooms.length !== 1 ? 's' : ''} open
              </span>
              <button id="create-public-btn" className="btn btn-gold btn-sm" onClick={() => create('public')}>
                + New Table
              </button>
            </div>

            {rooms.length === 0 && (
              <div className="panel" style={{ padding: 48, display:'flex', flexDirection:'column', alignItems:'center', gap:12 }}>
                <span style={{ fontSize:40, opacity:.5 }}>🎰</span>
                <p style={{ color:'var(--text-muted)', fontSize:14 }}>No tables open — be the first to deal.</p>
                <button className="btn btn-gold btn-sm" onClick={() => create('public')}>Create Table</button>
              </div>
            )}

            {rooms.map(r => {
              const full = r.playerCount >= r.maxPlayers;
              return (
                <div key={r.id} className="panel" style={{
                  padding:'18px 24px', display:'flex', alignItems:'center', justifyContent:'space-between',
                  transition:'border-color .2s',
                  borderColor: full ? 'var(--border-dim)' : 'var(--border)'
                }}>
                  <div style={{ display:'flex', alignItems:'center', gap:16 }}>
                    <div style={{ fontSize:28, opacity:.8 }}>🃏</div>
                    <div>
                      <div style={{ fontWeight:600, color:'var(--cream)', fontSize:14 }}>
                        Table <span style={{ fontFamily:'monospace', color:'var(--gold)' }}>#{r.id.slice(0,6).toUpperCase()}</span>
                      </div>
                      <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:3 }}>
                        {r.playerCount} / {r.maxPlayers} players · Waiting in lobby
                      </div>
                    </div>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <span className={`pill ${full ? 'pill-red' : 'pill-green'}`}>
                      {full ? 'Full' : 'Open'}
                    </span>
                    <button
                      id={`join-${r.id}`} className="btn btn-gold btn-sm"
                      disabled={full} onClick={() => join(r.id)}
                    >
                      Join →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Private tab ─────────────────────────────────────── */}
        {tab === 'private' && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>

            {/* Create */}
            <div className="panel" style={{ padding: 28, display:'flex', flexDirection:'column', gap:16 }}>
              <div>
                <div className="display-sm" style={{ color:'var(--cream)', marginBottom:8 }}>Create a Private Table</div>
                <p style={{ color:'var(--text-muted)', fontSize:13, lineHeight:1.6 }}>
                  You'll receive a 6-character code to share with friends.
                </p>
              </div>
              <button id="create-private-btn" className="btn btn-gold" onClick={() => create('private')}>
                🔒 Create Private Table
              </button>
            </div>

            {/* Join by code */}
            <div className="panel" style={{ padding:28, display:'flex', flexDirection:'column', gap:16 }}>
              <div>
                <div className="display-sm" style={{ color:'var(--cream)', marginBottom:8 }}>Join with Code</div>
                <p style={{ color:'var(--text-muted)', fontSize:13, lineHeight:1.6 }}>
                  Enter the 6-character room code from your host.
                </p>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <input
                  id="join-code-input"
                  className="input"
                  placeholder="ABC123"
                  value={code}
                  onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,''))}
                  maxLength={6}
                  style={{ letterSpacing:4, fontWeight:700, textAlign:'center', flex:1 }}
                />
                <button id="join-code-btn" className="btn btn-gold" disabled={code.length < 6} onClick={joinCode}>
                  Join
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
