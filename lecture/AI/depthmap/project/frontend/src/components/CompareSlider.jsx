// CompareSlider.jsx
import { useState, useRef, useCallback } from 'react';

export function CompareSlider({ beforeUrl, afterUrl,
  beforeLabel='Original', afterLabel='Depth map' }) {
  const [pos, setPos] = useState(50);
  const containerRef  = useRef(null);
  const dragging      = useRef(false);

  const move = useCallback(clientX => {
    if (!containerRef.current) return;
    const r = containerRef.current.getBoundingClientRect();
    setPos(Math.max(2, Math.min(98, ((clientX - r.left) / r.width) * 100)));
  }, []);

  if (!beforeUrl || !afterUrl) return null;

  return (
    <div
      ref={containerRef}
      onMouseMove={e => dragging.current && move(e.clientX)}
      onMouseUp={()  => { dragging.current = false; }}
      onMouseLeave={()=> { dragging.current = false; }}
      onTouchMove={e => move(e.touches[0].clientX)}
      style={{position:'relative',userSelect:'none',cursor:'ew-resize',
        borderRadius:'var(--r)',overflow:'hidden',marginTop:24,lineHeight:0}}>

      {/* after (depth) – full width baseline */}
      <img src={afterUrl} alt={afterLabel} style={{width:'100%',display:'block'}} />

      {/* before (original) – clipped left portion */}
      <div style={{position:'absolute',top:0,left:0,height:'100%',
        width:`${pos}%`,overflow:'hidden'}}>
        <img src={beforeUrl} alt={beforeLabel}
          style={{width:`${100/(pos/100)}%`,maxWidth:'none',height:'100%',
            objectFit:'cover',display:'block'}} />
      </div>

      {/* divider + handle */}
      <div
        onMouseDown={()=>{ dragging.current = true; }}
        onTouchStart={()=>{ dragging.current = true; }}
        style={{position:'absolute',top:0,left:`${pos}%`,
          transform:'translateX(-50%)',height:'100%',width:2,
          background:'#fff',cursor:'ew-resize'}}>
        <div style={{position:'absolute',top:'50%',left:'50%',
          transform:'translate(-50%,-50%)',
          width:34,height:34,borderRadius:'50%',background:'#fff',
          display:'flex',alignItems:'center',justifyContent:'center',
          boxShadow:'0 2px 8px rgba(0,0,0,.45)'}}>
          <span style={{fontSize:14,color:'#333',letterSpacing:-2}}>&#8596;</span>
        </div>
      </div>

      {/* labels */}
      {[{l:beforeLabel,side:'left'},{l:afterLabel,side:'right'}].map(({l,side})=>(
        <span key={side} style={{position:'absolute',top:8,[side]:8,fontSize:11,
          color:'#fff',background:'rgba(0,0,0,.5)',padding:'2px 8px',borderRadius:4}}>
          {l}
        </span>
      ))}
    </div>
  );
}

export default CompareSlider;
