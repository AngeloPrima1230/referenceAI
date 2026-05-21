export default function LoadingCard({ stage = 'Processing…', pct = 0 }) {
  return (
    <div className="card mt-12" style={{textAlign:'center',padding:'28px 20px'}}>
      <div className="spinner" />
      <p style={{fontSize:14,color:'var(--muted)',marginBottom:12}}>{stage}</p>
      <div className="progress-track">
        <div className="progress-fill" style={{width:`${pct}%`}} />
      </div>
      <p style={{fontSize:12,color:'var(--faint)',marginTop:8}}>
        {pct < 100 ? 'This takes 5–90 seconds depending on settings' : 'Done!'}
      </p>
    </div>
  );
}
