# Depth Map Tool – Frontend

## Quick start

```bash
npm install
cp .env.example .env.local
npm run dev
```

App runs at http://localhost:5173  (backend must be on :8000)

## Scripts

| Command | What it does |
|---------|-------------|
| `npm run dev` | Hot-reload dev server |
| `npm run build` | Production build → dist/ |
| `npm run preview` | Serve production build |
| `npm run test` | Vitest unit tests |

## Env vars

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `http://localhost:8000` | Backend base URL |

## Structure

```
src/
  App.jsx              Main app + tab routing
  config.js            API URL
  index.css            Design system
  main.jsx             React entry
  components/
    UploadZone.jsx       Drag & drop upload
    SettingsPanel.jsx    All settings controls
    CompareSlider.jsx    Before/after slider
    DepthViewer3D.jsx    Three.js 3D preview
    DownloadButtons.jsx  PNG / STL / Normal downloads
    ClassifyBadge.jsx    Classification result
    LoadingCard.jsx      Progress spinner
    BatchTab.jsx         Batch processing
```

## Deploy

Push to GitHub → import in Vercel → set `VITE_API_URL` → Deploy.
