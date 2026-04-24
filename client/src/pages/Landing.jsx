import { useState } from 'react';

export default function Landing({ onRegister, connected }) {
  const [name, setName] = useState('');

  function submit(e) {
    e.preventDefault();
    const t = name.trim();
    if (t.length >= 2) onRegister(t);
  }

  return (
    <div className="felt-bg" style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding: 24 }}>
      <div className="z1" style={{ width: '100%', maxWidth: 420, display:'flex', flexDirection:'column', alignItems:'center', gap: 40 }}>

        {/* Logo mark */}
        <div style={{ textAlign:'center' }}>
          {/* Decorative suit row */}
          <div style={{ fontSize: 28, letterSpacing: 16, color:'var(--gold-dim)', marginBottom: 20, fontFamily:'var(--font-display)' }}>
            ♠ ♥ ♦ ♣
          </div>

          <h1 className="display-xl" style={{ color:'var(--gold-light)', marginBottom: 10 }}>
            Blackjack Royal
          </h1>

          <div className="gold-rule" style={{ margin:'0 auto', maxWidth:220 }}>
            Multiplayer · Free Play
          </div>
        </div>

        {/* Panel */}
        <div className="panel" style={{ width:'100%', padding: 36, display:'flex', flexDirection:'column', gap: 24 }}>
          <div>
            <p className="label" style={{ marginBottom: 8 }}>Display name</p>
            <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap: 14 }}>
              <input
                id="username-input"
                className="input"
                placeholder="e.g. Lucky Seven…"
                value={name}
                onChange={e => setName(e.target.value)}
                maxLength={18}
                autoFocus
                autoComplete="off"
              />
              <button
                id="enter-btn"
                type="submit"
                className="btn btn-gold btn-xl"
                disabled={name.trim().length < 2 || !connected}
                style={{ width:'100%' }}
              >
                {connected ? 'Enter the Casino' : 'Connecting…'}
              </button>
            </form>
          </div>

          <div className="divider" />

          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', fontSize: 12 }}>
            <span style={{ color:'var(--text-dim)' }}>
              You start with <strong style={{ color:'var(--gold)' }}>$1.000.000 COP</strong>
            </span>
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              <span className={`conn-dot ${connected ? 'on' : ''}`} />
              <span style={{ color:'var(--text-dim)' }}>{connected ? 'Connected' : 'Offline'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
