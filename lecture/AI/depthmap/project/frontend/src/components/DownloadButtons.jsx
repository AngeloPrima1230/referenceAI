export default function DownloadButtons({
  depthUrl, onDownloadSTL, onDownloadNormal, loadingSTL, loadingNormal,
}) {
  if (!depthUrl) return null;

  const save = (url, name) => {
    Object.assign(document.createElement('a'), { href:url, download:name }).click();
  };

  return (
    <div style={{marginTop:20,display:'flex',gap:10,flexWrap:'wrap'}}>
      <button className="btn btn-success"
        onClick={() => save(depthUrl, 'depth_map.png')}>
        ↓ Depth Map (PNG)
      </button>
      <button className="btn btn-amber"
        disabled={loadingSTL} onClick={onDownloadSTL}>
        {loadingSTL ? 'Generating STL…' : '↓ 3D Model (STL)'}
      </button>
      <button className="btn btn-ghost"
        disabled={loadingNormal} onClick={onDownloadNormal}>
        {loadingNormal ? 'Generating…' : '↓ Normal Map'}
      </button>
    </div>
  );
}
