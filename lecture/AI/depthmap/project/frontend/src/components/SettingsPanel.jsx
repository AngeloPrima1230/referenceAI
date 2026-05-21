export default function SettingsPanel({
  removeBg, setRemoveBg,
  maxWidth, setMaxWidth,
  bitDepth, setBitDepth,
  depthScale, setDepthScale,
  modelSize, setModelSize,
  invert, setInvert,
}) {
  const Row = ({ label, hint, children }) => (
    <div style={{marginBottom:18}}>
      <div style={{marginBottom:6}}>
        <span style={{fontSize:14}}>{label}</span>
        {hint && <span style={{fontSize:12,color:'var(--faint)',marginLeft:8}}>{hint}</span>}
      </div>
      {children}
    </div>
  );

  const Toggle = ({ label, hint, value, onChange }) => (
    <div style={{display:'flex',justifyContent:'space-between',
      alignItems:'center',marginBottom:18}}>
      <div>
        <p style={{fontSize:14}}>{label}</p>
        {hint && <p style={{fontSize:12,color:'var(--faint)',marginTop:2}}>{hint}</p>}
      </div>
      <input type="checkbox" checked={value} onChange={e=>onChange(e.target.checked)} />
    </div>
  );

  return (
    <div className="card">
      <h3 style={{marginBottom:18}}>Settings</h3>

      <Toggle label="Remove background"
        hint="Isolate subject before depth estimation"
        value={removeBg} onChange={setRemoveBg} />

      <Toggle label="Invert depth"
        hint="Swap near / far — useful for line art"
        value={invert} onChange={setInvert} />

      <Row label="Resolution" hint={`${maxWidth} px`}>
        <input type="range" min={256} max={2048} step={256}
          value={maxWidth} onChange={e=>setMaxWidth(+e.target.value)} />
        <div style={{display:'flex',justifyContent:'space-between',marginTop:4}}>
          <span style={{fontSize:11,color:'var(--faint)'}}>256 (fast)</span>
          <span style={{fontSize:11,color:'var(--faint)'}}>2048 (best)</span>
        </div>
      </Row>

      <Row label="Depth scale (STL)" hint={`${depthScale.toFixed(1)}×`}>
        <input type="range" min={0.5} max={5} step={0.5}
          value={depthScale} onChange={e=>setDepthScale(+e.target.value)} />
      </Row>

      <Row label="Output quality">
        <div style={{display:'flex',gap:8}}>
          {[{v:8,l:'8-bit (web)'},{v:16,l:'16-bit (CNC/print)'}].map(({v,l})=>(
            <button key={v} onClick={()=>setBitDepth(v)} style={{
              flex:1,padding:'8px 4px',borderRadius:'var(--rs)',cursor:'pointer',
              fontSize:13,border:'1px solid',
              background: bitDepth===v ? 'var(--accent)' : 'var(--bg3)',
              color:      bitDepth===v ? '#fff' : 'var(--muted)',
              borderColor:bitDepth===v ? 'var(--accent)' : 'var(--border)',
            }}>{l}</button>
          ))}
        </div>
      </Row>

      <Row label="Model quality">
        <div style={{display:'flex',gap:8}}>
          {[
            {id:'small',l:'Fast',    sub:'~12s'},
            {id:'base', l:'Balanced',sub:'~35s'},
            {id:'large',l:'Best',    sub:'~90s'},
          ].map(m=>(
            <button key={m.id} onClick={()=>setModelSize(m.id)} style={{
              flex:1,padding:'8px 4px',borderRadius:'var(--rs)',cursor:'pointer',
              textAlign:'center',border:'1px solid',
              background: modelSize===m.id ? 'var(--accent)' : 'var(--bg3)',
              color:      modelSize===m.id ? '#fff' : 'var(--muted)',
              borderColor:modelSize===m.id ? 'var(--accent)' : 'var(--border)',
            }}>
              <div style={{fontWeight:600,fontSize:13}}>{m.l}</div>
              <div style={{fontSize:10,opacity:.7}}>{m.sub} CPU</div>
            </button>
          ))}
        </div>
      </Row>
    </div>
  );
}
