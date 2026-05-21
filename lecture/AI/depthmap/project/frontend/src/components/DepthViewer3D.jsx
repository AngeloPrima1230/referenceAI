import { useRef, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useTexture } from '@react-three/drei';
import * as THREE from 'three';

function DepthMesh({ depthUrl, colorUrl, displacementScale, wireframe }) {
  const [depthTex, colorTex] = useTexture([depthUrl, colorUrl]);
  [depthTex, colorTex].forEach(t => {
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  });
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[10, 10, 256, 256]} />
      <meshStandardMaterial
        map={colorTex}
        displacementMap={depthTex}
        displacementScale={displacementScale}
        wireframe={wireframe}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

export default function DepthViewer3D({ depthUrl, colorUrl,
  displacementScale = 1.5, wireframe = false }) {
  if (!depthUrl || !colorUrl) return null;
  const controlsRef = useRef();
  return (
    <div style={{width:'100%',height:380,borderRadius:'var(--r)',
      overflow:'hidden',background:'#0d0d1a'}}>
      <Canvas camera={{position:[0,8,12],fov:45}} gl={{antialias:true}}>
        <ambientLight intensity={0.6}/>
        <directionalLight position={[5,10,5]} intensity={1.2}/>
        <directionalLight position={[-5,5,-5]} intensity={0.3}/>
        <Suspense fallback={null}>
          <DepthMesh depthUrl={depthUrl} colorUrl={colorUrl}
            displacementScale={displacementScale} wireframe={wireframe}/>
        </Suspense>
        <OrbitControls ref={controlsRef}
          enableDamping dampingFactor={0.05}
          minDistance={3} maxDistance={30}
          touches={{ONE:THREE.TOUCH.ROTATE, TWO:THREE.TOUCH.DOLLY_PAN}}
        />
      </Canvas>
      <div style={{display:'flex',justifyContent:'space-between',
        padding:'5px 14px',borderTop:'1px solid var(--border)'}}>
        <span style={{fontSize:11,color:'var(--faint)'}}>
          Left-drag: rotate · Scroll: zoom · Right-drag: pan
        </span>
        <button onClick={()=>controlsRef.current?.reset()}
          style={{fontSize:11,background:'transparent',border:'none',
            color:'var(--faint)',cursor:'pointer'}}>
          Reset view
        </button>
      </div>
    </div>
  );
}
