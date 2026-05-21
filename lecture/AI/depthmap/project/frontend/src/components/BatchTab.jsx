import { useState, useRef } from 'react';

export default function BatchTab({ apiUrl }) {
  const [files,    setFiles]    = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [zipUrl,   setZipUrl]   = useState(null);
  const [error,    setError]    = useState(null);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef();

  const handleFiles = e => setFiles(Array.from(e.target.files).slice(0,10));

  const runBatch = async () => {
    if (!files.length) return;
    setLoading(true); setError(null); setZipUrl(null); setProgress(10);
    try {
      const fd = new FormData();
      files.forEach(f => fd.append('files', f));
      setProgress(30);
      const res = await fetch(
        `${apiUrl}/generate-depth-batch?remove_bg=true&max_width=512&model_size=small`,
        { method:'POST', body:fd }
      );
      setProgress(90);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      setZipUrl(URL.createObjectURL(blob));
      setProgress(100);
    } catch(e) { setError(e.message); }
    finally    { setLoading(false); }
  };

  return (
    <div>
      <div className="card">
        <h3 style={{marginBottom:14}}>Batch Processing</h3>
        <p style={{fontSize:13,color:'var(--muted)',marginBottom:18}}>
          Upload up to 10 images. Receive a single ZIP of 16-bit depth map PNGs.
        </p>

        <input ref={inputRef} type="file" multiple accept="image/*"
          onChange={handleFiles} style={{display:'none'}} />

        <div style={{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}>
          <button className="btn btn-ghost"
            onClick={() => inputRef.current.click()}>
            Select images (max 10)
          </button>
          {files.length > 0 && (
            <span style={{fontSize:13,color:'var(--muted)'}}>
              {files.length} file{files.length!==1?'s':''} selected
            </span>
          )}
        </div>

        {files.length > 0 && (
          <div style={{marginTop:12,display:'flex',flexWrap:'wrap',gap:6}}>
            {files.map((f,i) => (
              <span key={i} className="pill">{f.name}</span>
            ))}
          </div>
        )}
      </div>

      <button
        className="btn btn-primary btn-full btn-lg"
        disabled={!files.length || loading}
        onClick={runBatch}>
        {loading
          ? `Processing ${files.length} image${files.length!==1?'s':''}…`
          : `Generate ${files.length || 0} depth map${files.length!==1?'s':''}`}
      </button>

      {loading && (
        <div className="card mt-12" style={{textAlign:'center',padding:24}}>
          <div className="spinner"/>
          <div className="progress-track" style={{marginTop:10}}>
            <div className="progress-fill" style={{width:`${progress}%`}}/>
          </div>
          <p style={{fontSize:12,color:'var(--faint)',marginTop:8}}>
            Processing all images with the small model…
          </p>
        </div>
      )}

      {error && <div className="alert alert-error">{error}</div>}

      {zipUrl && (
        <div className="alert alert-success">
          ✓ All done!{' '}
          <a href={zipUrl} download="depth_maps.zip"
            style={{fontWeight:600,textDecoration:'underline',color:'inherit'}}>
            Download ZIP
          </a>
        </div>
      )}
    </div>
  );
}
