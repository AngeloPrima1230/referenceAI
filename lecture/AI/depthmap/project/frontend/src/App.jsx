import { useState, useRef } from 'react';
import { API_URL } from './config';
import UploadZone      from './components/UploadZone';
import SettingsPanel   from './components/SettingsPanel';
import CompareSlider   from './components/CompareSlider';
import DepthViewer3D   from './components/DepthViewer3D';
import DownloadButtons from './components/DownloadButtons';
import ClassifyBadge   from './components/ClassifyBadge';
import LoadingCard     from './components/LoadingCard';
import BatchTab        from './components/BatchTab';

export default function App() {
  /* ── file ────────────────────────────────── */
  const [file,        setFile]        = useState(null);
  const [origUrl,     setOrigUrl]     = useState(null);
  /* ── results ─────────────────────────────── */
  const [depthUrl,    setDepthUrl]    = useState(null);
  /* ── ui ──────────────────────────────────── */
  const [loading,     setLoading]     = useState(false);
  const [loadingStl,  setLoadingStl]  = useState(false);
  const [loadingNorm, setLoadingNorm] = useState(false);
  const [error,       setError]       = useState(null);
  const [progress,    setProgress]    = useState({stage:'',pct:0});
  const [wireframe,   setWireframe]   = useState(false);
  const [cls,         setCls]         = useState(null);
  const [tab,         setTab]         = useState('generate');
  /* ── settings ────────────────────────────── */
  const [removeBg,    setRemoveBg]    = useState(true);
  const [maxWidth,    setMaxWidth]    = useState(512);
  const [bitDepth,    setBitDepth]    = useState(16);
  const [depthScale,  setDepthScale]  = useState(2.0);
  const [modelSize,   setModelSize]   = useState('small');
  const [invert,      setInvert]      = useState(false);

  /* ── classify on upload ──────────────────── */
  const handleFileSelected = async (f) => {
    setFile(f);
    setOrigUrl(URL.createObjectURL(f));
    setDepthUrl(null); setError(null); setCls(null);
    try {
      const fd = new FormData(); fd.append('file', f);
      const res = await fetch(`${API_URL}/classify`, {method:'POST',body:fd});
      if (res.ok) {
        const data = await res.json();
        setCls(data);
        const s = data.recommended_settings;
        setRemoveBg(s.remove_bg ?? true);
        setModelSize(s.model_size ?? 'small');
        setInvert(s.invert_depth ?? false);
      }
    } catch {/* non-fatal */}
  };

  /* ── generate depth ──────────────────────── */
  const generate = async () => {
    if (!file) return;
    setLoading(true); setError(null); setDepthUrl(null);
    setProgress({stage:'Sending image…', pct:10});
    try {
      const fd = new FormData(); fd.append('file', file);
      const q  = new URLSearchParams({
        remove_bg:removeBg, max_width:maxWidth,
        bit_depth:bitDepth, model_size:modelSize, invert
      });
      setProgress({stage: removeBg ? 'Removing background then estimating depth…'
                                    : 'Estimating depth…', pct:35});
      const res = await fetch(`${API_URL}/generate-depth?${q}`, {method:'POST',body:fd});
      if (!res.ok) {
        const e = await res.json().catch(()=>({detail:`HTTP ${res.status}`}));
        throw new Error(e.detail);
      }
      setProgress({stage:'Processing result…', pct:90});
      const blob = await res.blob();
      setDepthUrl(URL.createObjectURL(blob));
      setProgress({stage:'Done!', pct:100});
    } catch(e) { setError(e.message); }
    finally    { setLoading(false); }
  };

  /* ── download helpers ────────────────────── */
  const triggerDownload = (blob, name) => {
    const url = URL.createObjectURL(blob);
    Object.assign(document.createElement('a'),{href:url,download:name}).click();
    URL.revokeObjectURL(url);
  };

  const downloadSTL = async () => {
    if (!file) return;
    setLoadingStl(true);
    try {
      const fd = new FormData(); fd.append('file', file);
      const q  = new URLSearchParams({
        remove_bg:removeBg, max_width:maxWidth,
        model_size:modelSize, depth_scale:depthScale, base_thickness:1.0
      });
      const res = await fetch(`${API_URL}/generate-stl?${q}`,{method:'POST',body:fd});
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      triggerDownload(await res.blob(), 'depth_model.stl');
    } catch(e) { setError('STL: '+e.message); }
    finally    { setLoadingStl(false); }
  };

  const downloadNormal = async () => {
    if (!file) return;
    setLoadingNorm(true);
    try {
      const fd = new FormData(); fd.append('file', file);
      const q  = new URLSearchParams({max_width:maxWidth, remove_bg:removeBg});
      const res = await fetch(`${API_URL}/generate-normal-map?${q}`,{method:'POST',body:fd});
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      triggerDownload(await res.blob(), 'normal_map.png');
    } catch(e) { setError('Normal map: '+e.message); }
    finally    { setLoadingNorm(false); }
  };

  /* ── render ──────────────────────────────── */
  return (
    <div className="container" style={{paddingTop:28,paddingBottom:60}}>

      {/* Header */}
      <div className="flex-between mb-16">
        <div>
          <h1>Depth Map Tool</h1>
          <p style={{fontSize:13,color:'var(--muted)',marginTop:2}}>
            AI-powered depth maps for 3D printing &amp; CNC
          </p>
        </div>
        <div className="tab-bar">
          {['generate','batch'].map(t=>(
            <button key={t} className={`tab${tab===t?' active':''}`}
              onClick={()=>setTab(t)} style={{textTransform:'capitalize'}}>{t}</button>
          ))}
        </div>
      </div>

      {/* ── Generate tab ── */}
      {tab==='generate' && (<>

        <UploadZone onFileSelected={handleFileSelected} />

        {cls && <ClassifyBadge cls={cls} />}

        <SettingsPanel
          removeBg={removeBg}     setRemoveBg={setRemoveBg}
          maxWidth={maxWidth}     setMaxWidth={setMaxWidth}
          bitDepth={bitDepth}     setBitDepth={setBitDepth}
          depthScale={depthScale} setDepthScale={setDepthScale}
          modelSize={modelSize}   setModelSize={setModelSize}
          invert={invert}         setInvert={setInvert}
        />

        {/* Generate button */}
        <button
          className="btn btn-primary btn-full btn-lg mt-8"
          disabled={!file || loading}
          onClick={generate}>
          {loading ? 'Generating…' : 'Generate Depth Map'}
        </button>

        {error && <div className="alert alert-error">{error}</div>}
        {loading && <LoadingCard stage={progress.stage} pct={progress.pct} />}

        {depthUrl && !loading && (<>
          {/* Compare slider */}
          <CompareSlider beforeUrl={origUrl} afterUrl={depthUrl} />

          {/* 3D preview */}
          <div className="mt-24">
            <div className="flex-between mb-8">
              <h3>3D Preview</h3>
              <button className="btn btn-ghost"
                style={{padding:'5px 12px',fontSize:12}}
                onClick={()=>setWireframe(w=>!w)}>
                {wireframe?'Show texture':'Show wireframe'}
              </button>
            </div>
            <DepthViewer3D
              depthUrl={depthUrl}
              colorUrl={origUrl}
              displacementScale={depthScale*0.3}
              wireframe={wireframe}
            />
          </div>

          {/* Downloads */}
          <DownloadButtons
            depthUrl={depthUrl}
            onDownloadSTL={downloadSTL}
            onDownloadNormal={downloadNormal}
            loadingSTL={loadingStl}
            loadingNormal={loadingNorm}
          />
        </>)}
      </>)}

      {/* ── Batch tab ── */}
      {tab==='batch' && <BatchTab apiUrl={API_URL} />}
    </div>
  );
}
