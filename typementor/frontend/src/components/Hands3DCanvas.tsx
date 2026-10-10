import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { FingerId, FINGER_DATA } from '../utils/fingerMapping';

interface Hands3DCanvasProps {
  activeFingerId: FingerId | null;
  shiftFingerId?: FingerId | null;
  isCorrect?: boolean | null;
  className?: string;
  theme?: 'dark' | 'light';
  showLabels?: boolean;
}

interface FingerMeshGroup {
  id: FingerId;
  group: THREE.Group;
  materials: THREE.MeshStandardMaterial[];
  tipMesh: THREE.Mesh;
  baseRotX: number;
}

// Procedural realistic hand builder using three.js primitives & PBR skin shading
function createProceduralHand(
  handSide: 'left' | 'right',
  skinMaterial: THREE.MeshStandardMaterial
): {
  handGroup: THREE.Group;
  fingers: Record<string, FingerMeshGroup>;
} {
  const handGroup = new THREE.Group();
  const fingers: Record<string, FingerMeshGroup> = {};
  const isLeft = handSide === 'left';
  const mirrorX = isLeft ? -1 : 1;

  // ── 1. Palm / Metacarpal Base ──────────────────────────────────────────────
  const palmGeo = new THREE.BoxGeometry(2.3, 0.45, 2.5);
  // Slightly taper palm towards wrist
  const palmMesh = new THREE.Mesh(palmGeo, skinMaterial);
  palmMesh.castShadow = true;
  palmMesh.receiveShadow = true;
  palmMesh.position.set(mirrorX * 0.1, 0, 0);
  handGroup.add(palmMesh);

  // Wrist cuff
  const wristGeo = new THREE.CylinderGeometry(0.9, 0.95, 0.9, 16);
  const wristMesh = new THREE.Mesh(wristGeo, skinMaterial);
  wristMesh.rotation.x = Math.PI / 2;
  wristMesh.position.set(mirrorX * 0.1, -0.05, 1.6);
  wristMesh.castShadow = true;
  handGroup.add(wristMesh);

  // ── 2. Fingers ─────────────────────────────────────────────────────────────
  // Finger definitions: [fingerKey, xOffset, zOffset, length, radius, angleY]
  type FingerDef = {
    id: FingerId;
    x: number;
    z: number;
    length: number;
    radius: number;
    angleY: number;
    isThumb?: boolean;
  };

  const fingerDefs: FingerDef[] = isLeft
    ? [
        { id: 'left_pinky', x: -0.92, z: -1.2, length: 1.5, radius: 0.16, angleY: -0.1 },
        { id: 'left_ring', x: -0.32, z: -1.35, length: 1.85, radius: 0.18, angleY: -0.03 },
        { id: 'left_middle', x: 0.28, z: -1.4, length: 2.05, radius: 0.19, angleY: 0.02 },
        { id: 'left_index', x: 0.88, z: -1.28, length: 1.8, radius: 0.18, angleY: 0.08 },
        { id: 'left_thumb', x: 1.15, z: 0.2, length: 1.35, radius: 0.22, angleY: 0.55, isThumb: true },
      ]
    : [
        { id: 'right_thumb', x: -1.15, z: 0.2, length: 1.35, radius: 0.22, angleY: -0.55, isThumb: true },
        { id: 'right_index', x: -0.88, z: -1.28, length: 1.8, radius: 0.18, angleY: -0.08 },
        { id: 'right_middle', x: -0.28, z: -1.4, length: 2.05, radius: 0.19, angleY: -0.02 },
        { id: 'right_ring', x: 0.32, z: -1.35, length: 1.85, radius: 0.18, angleY: 0.03 },
        { id: 'right_pinky', x: 0.92, z: -1.2, length: 1.5, radius: 0.16, angleY: 0.1 },
      ];

  fingerDefs.forEach((def) => {
    const fingerGroup = new THREE.Group();
    fingerGroup.position.set(def.x, 0, def.z);
    fingerGroup.rotation.y = def.angleY;

    // Slight resting arch curvature for natural hand posture
    const baseRotX = def.isThumb ? 0.2 : 0.32;
    fingerGroup.rotation.x = baseRotX;

    const materials: THREE.MeshStandardMaterial[] = [];

    // Clone skin material per finger so we can illuminate active target finger
    const matProximal = skinMaterial.clone();
    const matMiddle = skinMaterial.clone();
    const matDistal = skinMaterial.clone();
    materials.push(matProximal, matMiddle, matDistal);

    // Proximal phalanx (Knuckle to mid)
    const phalanx1Len = def.length * 0.45;
    const geo1 = new THREE.CylinderGeometry(def.radius * 0.9, def.radius, phalanx1Len, 14);
    geo1.translate(0, 0, -phalanx1Len / 2);
    geo1.rotateX(Math.PI / 2);
    const mesh1 = new THREE.Mesh(geo1, matProximal);
    mesh1.castShadow = true;
    fingerGroup.add(mesh1);

    // Knuckle joint sphere
    const joint1Geo = new THREE.SphereGeometry(def.radius * 1.05, 12, 12);
    const joint1 = new THREE.Mesh(joint1Geo, matProximal);
    fingerGroup.add(joint1);

    // Middle phalanx (nested group for natural joint bending)
    const midJointGroup = new THREE.Group();
    midJointGroup.position.set(0, 0, -phalanx1Len);
    midJointGroup.rotation.x = def.isThumb ? 0.15 : 0.25;

    const phalanx2Len = def.length * 0.33;
    const geo2 = new THREE.CylinderGeometry(def.radius * 0.75, def.radius * 0.88, phalanx2Len, 14);
    geo2.translate(0, 0, -phalanx2Len / 2);
    geo2.rotateX(Math.PI / 2);
    const mesh2 = new THREE.Mesh(geo2, matMiddle);
    mesh2.castShadow = true;
    midJointGroup.add(mesh2);

    // Distal phalanx (Fingertip)
    const tipJointGroup = new THREE.Group();
    tipJointGroup.position.set(0, 0, -phalanx2Len);
    tipJointGroup.rotation.x = def.isThumb ? 0.1 : 0.2;

    const phalanx3Len = def.length * 0.28;
    const geo3 = new THREE.CylinderGeometry(def.radius * 0.55, def.radius * 0.72, phalanx3Len, 14);
    geo3.translate(0, 0, -phalanx3Len / 2);
    geo3.rotateX(Math.PI / 2);
    const mesh3 = new THREE.Mesh(geo3, matDistal);
    mesh3.castShadow = true;
    tipJointGroup.add(mesh3);

    // Soft rounded fingertip pad
    const tipPadGeo = new THREE.SphereGeometry(def.radius * 0.6, 12, 12);
    const tipPadMesh = new THREE.Mesh(tipPadGeo, matDistal);
    tipPadMesh.position.set(0, 0, -phalanx3Len);
    tipPadMesh.castShadow = true;
    tipJointGroup.add(tipPadMesh);

    midJointGroup.add(tipJointGroup);
    fingerGroup.add(midJointGroup);
    handGroup.add(fingerGroup);

    fingers[def.id] = {
      id: def.id,
      group: fingerGroup,
      materials,
      tipMesh: tipPadMesh,
      baseRotX,
    };
  });

  return { handGroup, fingers };
}

export default function Hands3DCanvas({
  activeFingerId,
  shiftFingerId,
  isCorrect,
  className = '',
  theme = 'dark',
  showLabels = true,
}: Hands3DCanvasProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const fingersRef = useRef<Record<string, FingerMeshGroup>>({});
  const animationFrameId = useRef<number>(0);
  const [webglSupported, setWebglSupported] = useState<boolean>(true);

  // Active finger state ref for render loop animation without React re-renders
  const stateRef = useRef({
    activeFingerId,
    shiftFingerId,
    isCorrect,
    animTime: 0,
  });

  useEffect(() => {
    stateRef.current.activeFingerId = activeFingerId;
    stateRef.current.shiftFingerId = shiftFingerId;
    stateRef.current.isCorrect = isCorrect;
  }, [activeFingerId, shiftFingerId, isCorrect]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Check WebGL availability
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) {
        setWebglSupported(false);
        return;
      }
    } catch {
      setWebglSupported(false);
      return;
    }

    const width = container.clientWidth || 600;
    const height = container.clientHeight || 280;

    // ── 1. Scene, Camera, Renderer ───────────────────────────────────────────
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 100);
    // Camera angled to see hands resting naturally from above/back
    camera.position.set(0, 7.8, 4.8);
    camera.lookAt(0, -0.4, -0.8);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // ── 2. Studio Lighting ───────────────────────────────────────────────────
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xfff5ea, 1.8);
    keyLight.position.set(3, 8, 5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x818cf8, 1.4); // Subtle indigo rim
    rimLight.position.set(-4, 5, -3);
    scene.add(rimLight);

    const softFillLight = new THREE.PointLight(0x38bdf8, 0.8, 15); // Cyan fill
    softFillLight.position.set(0, 4, 0);
    scene.add(softFillLight);

    // ── 3. PBR Skin Base Material ────────────────────────────────────────────
    const skinBaseColor = theme === 'dark' ? 0xd4a373 : 0xe0b589;
    const baseSkinMaterial = new THREE.MeshStandardMaterial({
      color: skinBaseColor,
      roughness: 0.52,
      metalness: 0.05,
    });

    // ── 4. Build Left & Right Hands ──────────────────────────────────────────
    const leftHand = createProceduralHand('left', baseSkinMaterial);
    leftHand.handGroup.position.set(-2.55, -0.1, 0);
    leftHand.handGroup.rotation.set(-0.15, 0.08, 0.04);
    scene.add(leftHand.handGroup);

    const rightHand = createProceduralHand('right', baseSkinMaterial);
    rightHand.handGroup.position.set(2.55, -0.1, 0);
    rightHand.handGroup.rotation.set(-0.15, -0.08, -0.04);
    scene.add(rightHand.handGroup);

    const allFingers = { ...leftHand.fingers, ...rightHand.fingers };
    fingersRef.current = allFingers;

    // Subtle table shadow receiver plane
    const shadowPlaneGeo = new THREE.PlaneGeometry(16, 10);
    const shadowPlaneMat = new THREE.ShadowMaterial({ opacity: 0.35 });
    const shadowPlane = new THREE.Mesh(shadowPlaneGeo, shadowPlaneMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = -0.6;
    shadowPlane.receiveShadow = true;
    scene.add(shadowPlane);

    // ── 5. Render Loop with Smooth Spring & Tap Dynamics ─────────────────────
    let lastTime = performance.now();

    const animate = (time: number) => {
      animationFrameId.current = requestAnimationFrame(animate);

      const delta = (time - lastTime) / 1000;
      lastTime = time;
      stateRef.current.animTime += delta;

      const currentActive = stateRef.current.activeFingerId;
      const currentShift = stateRef.current.shiftFingerId;
      const isMistake = stateRef.current.isCorrect === false;

      // Animate fingers
      Object.entries(fingersRef.current).forEach(([fingerId, finger]) => {
        const isActive = fingerId === currentActive;
        const isShift = fingerId === currentShift;
        const targetHighlight = isActive || isShift;

        // Color & Glow update
        finger.materials.forEach((mat) => {
          if (targetHighlight) {
            const data = FINGER_DATA[fingerId as FingerId];
            const activeColor = new THREE.Color(
              isMistake ? 0xf43f5e : data ? data.colorHex : 0x6366f1
            );
            mat.color.lerp(activeColor, 0.2);
            mat.emissive.lerp(activeColor, 0.25);
            mat.emissiveIntensity = THREE.MathUtils.lerp(mat.emissiveIntensity, 0.45, 0.2);
          } else {
            mat.color.lerp(new THREE.Color(skinBaseColor), 0.15);
            mat.emissive.lerp(new THREE.Color(0x000000), 0.2);
            mat.emissiveIntensity = THREE.MathUtils.lerp(mat.emissiveIntensity, 0, 0.2);
          }
        });

        // Tap/Press animation physics
        if (targetHighlight) {
          // Tap rhythm oscillation: realistic down-stroke keypress
          const tapSpeed = 6.0;
          const tapCycle = Math.sin(stateRef.current.animTime * tapSpeed);
          // Finger dips downward on target press
          const targetRotX = finger.baseRotX + (tapCycle > 0 ? tapCycle * 0.22 : 0);
          finger.group.rotation.x = THREE.MathUtils.lerp(finger.group.rotation.x, targetRotX, 0.25);
        } else {
          // Return smoothly to resting pose
          finger.group.rotation.x = THREE.MathUtils.lerp(finger.group.rotation.x, finger.baseRotX, 0.18);
        }
      });

      // Subtle breathing camera drift for realism
      camera.position.x = Math.sin(stateRef.current.animTime * 0.4) * 0.08;
      camera.lookAt(0, -0.4, -0.8);

      renderer.render(scene, camera);
    };

    animationFrameId.current = requestAnimationFrame(animate);

    // ── 6. Resize Observer ───────────────────────────────────────────────────
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        const h = entry.contentRect.height;
        if (w > 0 && h > 0) {
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        }
      }
    });

    resizeObserver.observe(container);

    // ── Cleanup ──────────────────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(animationFrameId.current);
      resizeObserver.disconnect();
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      renderer.dispose();
      // Dispose materials & geometries
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
    };
  }, [theme]);

  if (!webglSupported) {
    return (
      <div className={`flex flex-col items-center justify-center p-6 text-center text-xs text-brand-muted ${className}`}>
        <p>3D WebGL is unavailable on this device. Standard finger zone guide is active below.</p>
      </div>
    );
  }

  const activeData = activeFingerId ? FINGER_DATA[activeFingerId] : null;

  return (
    <div className={`relative w-full overflow-hidden select-none ${className}`}>
      {/* 3D Canvas Mount */}
      <div ref={mountRef} className="w-full h-[220px] sm:h-[260px] md:h-[280px]" />

      {/* Real-time HUD Indicator Overlays */}
      <div className="absolute top-2 left-3 right-3 flex items-center justify-between pointer-events-none text-xs">
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-900/80 border border-slate-700/60 text-slate-300 backdrop-blur-md">
            Left Hand
          </span>
        </div>

        {activeData && showLabels && (
          <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-slate-950/85 border border-brand-border/60 shadow-xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-150">
            <span
              className="w-2.5 h-2.5 rounded-full animate-ping"
              style={{ backgroundColor: activeData.colorHex }}
            />
            <span className="font-extrabold text-white text-xs tracking-tight">
              {activeData.name}
            </span>
            <span
              className="text-[9px] uppercase font-black px-1.5 py-0.5 rounded"
              style={{
                backgroundColor: `${activeData.colorHex}25`,
                color: activeData.colorHex,
              }}
            >
              Active
            </span>
          </div>
        )}

        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-900/80 border border-slate-700/60 text-slate-300 backdrop-blur-md">
            Right Hand
          </span>
        </div>
      </div>
    </div>
  );
}
