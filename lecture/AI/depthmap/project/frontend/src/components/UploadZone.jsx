import { useState, useRef } from 'react';

export default function UploadZone({ onFileSelected }) {
  const [drag,    setDrag]    = useState(false);
  const [preview, setPreview] = useState(null);
  const ref = useRef();

  const handle = (f) => {
    if (!f?.type.startsWith('image/')) { alert('Please select an image file.'); return; }
    setPreview(URL.createObjectURL(f));
    onFileSelected(f);
  };

  return (
    <div
      onClick={() => ref.current.click()}
      onDragOver={e=>{e.preventDefault();setDrag(true)}}
      onDragLeave={()=>setDrag(false)}
      onDrop={e=>{e.preventDefault();setDrag(false);handle(e.dataTransfer.files[0])}}
      style={{
        border:`2px dashed ${drag?'var(--accent)':'var(--border)'}`,
        borderRadius:'var(--r)', padding:28, textAlign:'center',
        cursor:'pointer', background: drag?'#0e1e30':'var(--bg2)',
        transition:'all .2s', minHeight:180,
        display:'flex', flexDirection:'column',
        alignItems:'center', justifyContent:'center', gap:12,
        marginBottom:'var(--gap)',
      }}>
      <input ref={ref} type="file" accept="image/*"
        onChange={e=>handle(e.target.files[0])} style={{display:'none'}} />

      {preview ? (
        <img src={preview} alt="preview"
          style={{maxWidth:'100%',maxHeight:280,borderRadius:8,pointerEvents:'none'}} />
      ) : (<>
        <svg width="38" height="38" viewBox="0 0 24 24" fill="none"
          stroke="var(--faint)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="17 8 12 3 7 8"/>
          <line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
        <p style={{fontSize:15,color:'var(--muted)'}}>Drag &amp; drop, or click to select</p>
        <p style={{fontSize:12,color:'var(--faint)'}}>JPG · PNG · WebP · Max 20 MB</p>
      </>)}
    </div>
  );
}
