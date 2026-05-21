export default function ClassifyBadge({ cls }) {
  if (!cls) return null;
  const typeColors = {
    portrait:  { bg:'#102030', border:'#2E86AB', text:'#A8D8F0' },
    landscape: { bg:'#0e2210', border:'#1A6B3C', text:'#7FC47F' },
    line_art:  { bg:'#1e1230', border:'#5B2D8C', text:'#C4A8F0' },
    object:    { bg:'#1e1a0e', border:'#7A4B0E', text:'#FAC775' },
  };
  const c = typeColors[cls.type] || typeColors.object;
  const warnings = cls.quality?.warnings || [];
  return (
    <div style={{background:c.bg,border:`1px solid ${c.border}`,
      borderRadius:'var(--r)',padding:'12px 16px',marginBottom:'var(--gap)'}}>
      <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
        <span style={{background:c.border,color:'#fff',fontSize:11,fontWeight:700,
          padding:'2px 9px',borderRadius:10,textTransform:'uppercase',letterSpacing:.5}}>
          {cls.type.replace('_',' ')}
        </span>
        <span style={{fontSize:13,color:c.text}}>
          {Math.round(cls.confidence*100)}% confidence
          {cls.aspect_ratio && <span style={{color:'var(--faint)',marginLeft:8}}>· {cls.aspect_ratio} ratio</span>}
        </span>
        <span style={{fontSize:12,color:'var(--faint)',marginLeft:'auto'}}>Settings auto-applied</span>
      </div>
      {cls.quality && (
        <div style={{marginTop:8,fontSize:12,color:'var(--muted)',display:'flex',gap:16,flexWrap:'wrap'}}>
          <span>Quality: <b style={{color:c.text}}>{cls.quality.quality}</b></span>
          <span>Resolution: {cls.quality.resolution}</span>
          <span>Brightness: {cls.quality.brightness}</span>
        </div>
      )}
      {warnings.map((w,i)=>(
        <div key={i} className="alert alert-warning" style={{marginTop:8,padding:'8px 12px'}}>⚠ {w}</div>
      ))}
    </div>
  );
}
