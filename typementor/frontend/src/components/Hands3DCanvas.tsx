import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { FingerId, FINGER_DATA } from '../utils/fingerMapping';
import { Rotate3d, Sun, Check, RefreshCw } from 'lucide-react';

export type SkinToneId = 'warm_ivory' | 'natural_peach' | 'golden_tan' | 'rich_espresso' | 'cyber_neon';

export interface SkinToneConfig {
  id: SkinToneId;
  name: string;
  baseColor: number;
  sheenColor: number;
  nailColor: number;
  roughness: number;
  isCyber?: boolean;
}

export const SKIN_TONES: Record<SkinToneId, SkinToneConfig> = {
  natural_peach: {
    id: 'natural_peach',
    name: 'Natural Peach',
    baseColor: 0xe0ad8a,
    sheenColor: 0xffb59b,
    nailColor: 0xf5cfc5,
    roughness: 0.52,
  },
  warm_ivory: {
    id: 'warm_ivory',
    name: 'Warm Ivory',
    baseColor: 0xf2d1b8,
    sheenColor: 0xffc4b2,
    nailColor: 0xfce1da,
    roughness: 0.50,
  },
  golden_tan: {
    id: 'golden_tan',
    name: 'Golden Tan',
    baseColor: 0xbf8255,
    sheenColor: 0xdb8e5a,
    nailColor: 0xe6b598,
    roughness: 0.54,
  },
  rich_espresso: {
    id: 'rich_espresso',
    name: 'Rich Espresso',
    baseColor: 0x6e432a,
    sheenColor: 0x8f5533,
    nailColor: 0xab7558,
    roughness: 0.56,
  },
  cyber_neon: {
    id: 'cyber_neon',
    name: 'Cyber Hologram',
    baseColor: 0x1e293b,
    sheenColor: 0x38bdf8,
    nailColor: 0x818cf8,
    roughness: 0.35,
    isCyber: true,
  },
};

interface Hands3DCanvasProps {
  activeFingerId: FingerId | null;
  shiftFingerId?: FingerId | null;
  isCorrect?: boolean | null;
  className?: string;
  theme?: 'dark' | 'light';
  showLabels?: boolean;
}

interface FingerJoints {
  id: FingerId;
  rootGroup: THREE.Group;
  midGroup: THREE.Group;
  tipGroup: THREE.Group;
  materials: THREE.MeshPhysicalMaterial[];
  nailMaterial: THREE.MeshPhysicalMaterial;
  baseRotX: number;
  baseMidRotX: number;
  baseTipRotX: number;
  baseRotZ: number;
}

// ── Realistic Anatomical Procedural Hand Builder ─────────────────────────────

function createRealisticHand(
  handSide: 'left' | 'right',
  skinConfig: SkinToneConfig,
  sharedNailMaterial: THREE.MeshPhysicalMaterial
): {
  handGroup: THREE.Group;
  fingers: Record<string, FingerJoints>;
} {
  const handGroup = new THREE.Group();
  const fingers: Record<string, FingerJoints> = {};
  const isLeft = handSide === 'left';
  const mirrorX = isLeft ? -1 : 1;

  // 1. Base PBR Skin Material
  const baseSkinMaterial = new THREE.MeshPhysicalMaterial({
    color: skinConfig.baseColor,
    roughness: skinConfig.roughness,
    metalness: skinConfig.isCyber ? 0.35 : 0.02,
    clearcoat: skinConfig.isCyber ? 0.4 : 0.12,
    clearcoatRoughness: 0.35,
    sheen: skinConfig.isCyber ? 0.9 : 0.65,
    sheenColor: skinConfig.sheenColor,
    sheenRoughness: 0.45,
  });

  // 2. Palm & Metacarpal Architecture (Contoured Anatomy)
  const palmGroup = new THREE.Group();

  // Central palm body (curved trapezoid)
  const palmGeo = new THREE.BoxGeometry(2.35, 0.52, 2.45, 2, 2, 2);
  const palmMesh = new THREE.Mesh(palmGeo, baseSkinMaterial);
  palmMesh.castShadow = true;
  palmMesh.receiveShadow = true;
  palmMesh.position.set(mirrorX * 0.05, -0.02, -0.05);
  palmGroup.add(palmMesh);

  // Thenar eminence (Thumb muscular mound on lateral palm)
  const thenarGeo = new THREE.SphereGeometry(0.68, 16, 16);
  thenarGeo.scale(1.15, 0.58, 1.45);
  const thenarMesh = new THREE.Mesh(thenarGeo, baseSkinMaterial);
  thenarMesh.position.set(mirrorX * 0.92, -0.06, 0.42);
  thenarMesh.rotation.y = mirrorX * 0.42;
  thenarMesh.rotation.z = -mirrorX * 0.25;
  thenarMesh.castShadow = true;
  palmGroup.add(thenarMesh);

  // Hypothenar eminence (Pinky side palm cushion)
  const hypothenarGeo = new THREE.SphereGeometry(0.55, 16, 16);
  hypothenarGeo.scale(0.85, 0.55, 1.6);
  const hypothenarMesh = new THREE.Mesh(hypothenarGeo, baseSkinMaterial);
  hypothenarMesh.position.set(-mirrorX * 0.95, -0.07, 0.35);
  hypothenarMesh.rotation.y = -mirrorX * 0.15;
  hypothenarMesh.castShadow = true;
  palmGroup.add(hypothenarMesh);

  // Knuckle Arch Mounds (MCP joint heads along the natural arch)
  const knuckleArchGeo = new THREE.CylinderGeometry(0.3, 0.35, 2.2, 16);
  knuckleArchGeo.rotateZ(Math.PI / 2);
  const knuckleArchMesh = new THREE.Mesh(knuckleArchGeo, baseSkinMaterial);
  knuckleArchMesh.position.set(0, 0.08, -1.2);
  knuckleArchMesh.castShadow = true;
  palmGroup.add(knuckleArchMesh);

  // Wrist transition cuff
  const wristGeo = new THREE.CylinderGeometry(0.88, 0.96, 1.25, 20);
  wristGeo.scale(1.22, 1, 0.72); // Natural oval cross-section of human wrist
  const wristMesh = new THREE.Mesh(wristGeo, baseSkinMaterial);
  wristMesh.rotation.x = Math.PI / 2;
  wristMesh.position.set(mirrorX * 0.05, -0.04, 1.75);
  wristMesh.castShadow = true;
  palmGroup.add(wristMesh);

  // Dorsal tendon subtle contours
  [-0.65, -0.22, 0.22, 0.65].forEach((tX) => {
    const tendonGeo = new THREE.CylinderGeometry(0.04, 0.06, 1.9, 8);
    tendonGeo.rotateX(Math.PI / 2);
    const tendonMesh = new THREE.Mesh(tendonGeo, baseSkinMaterial);
    tendonMesh.position.set(tX, 0.22, -0.2);
    tendonMesh.castShadow = true;
    palmGroup.add(tendonMesh);
  });

  handGroup.add(palmGroup);

  // 3. Fingers Configuration (Natural touch-typing resting cascade)
  type FingerParam = {
    id: FingerId;
    x: number;
    z: number;
    length: number;
    radius: number;
    angleY: number;
    angleZ: number;
    isThumb?: boolean;
  };

  const fingerParams: FingerParam[] = isLeft
    ? [
        { id: 'left_pinky', x: -0.92, z: -1.22, length: 1.58, radius: 0.17, angleY: -0.14, angleZ: 0.08 },
        { id: 'left_ring', x: -0.32, z: -1.38, length: 1.95, radius: 0.19, angleY: -0.04, angleZ: 0.02 },
        { id: 'left_middle', x: 0.28, z: -1.45, length: 2.15, radius: 0.20, angleY: 0.02, angleZ: -0.01 },
        { id: 'left_index', x: 0.88, z: -1.32, length: 1.90, radius: 0.19, angleY: 0.10, angleZ: -0.06 },
        { id: 'left_thumb', x: 1.18, z: 0.22, length: 1.45, radius: 0.23, angleY: 0.58, angleZ: -0.42, isThumb: true },
      ]
    : [
        { id: 'right_thumb', x: -1.18, z: 0.22, length: 1.45, radius: 0.23, angleY: -0.58, angleZ: 0.42, isThumb: true },
        { id: 'right_index', x: -0.88, z: -1.32, length: 1.90, radius: 0.19, angleY: -0.10, angleZ: 0.06 },
        { id: 'right_middle', x: -0.28, z: -1.45, length: 2.15, radius: 0.20, angleY: -0.02, angleZ: 0.01 },
        { id: 'right_ring', x: 0.32, z: -1.38, length: 1.95, radius: 0.19, angleY: 0.04, angleZ: -0.02 },
        { id: 'right_pinky', x: 0.92, z: -1.22, length: 1.58, radius: 0.17, angleY: 0.14, angleZ: -0.08 },
      ];

  fingerParams.forEach((param) => {
    const rootGroup = new THREE.Group();
    rootGroup.position.set(param.x, 0.02, param.z);
    rootGroup.rotation.y = param.angleY;
    rootGroup.rotation.z = param.angleZ;

    // Resting touch-typing curvature
    const baseRotX = param.isThumb ? 0.22 : 0.34;
    const baseMidRotX = param.isThumb ? 0.18 : 0.32;
    const baseTipRotX = param.isThumb ? 0.12 : 0.22;
    rootGroup.rotation.x = baseRotX;

    const materials: THREE.MeshPhysicalMaterial[] = [];
    const matProximal = baseSkinMaterial.clone();
    const matMiddle = baseSkinMaterial.clone();
    const matDistal = baseSkinMaterial.clone();
    const fingerNailMat = sharedNailMaterial.clone();
    materials.push(matProximal, matMiddle, matDistal);

    // ── Phalanx 1: Proximal (Knuckle to Mid Joint) ──────────────────────────
    const p1Len = param.length * 0.44;
    // Tapered anatomical shape: wider at knuckle, tapering towards PIP
    const p1Geo = new THREE.CylinderGeometry(param.radius * 0.92, param.radius * 1.05, p1Len, 16);
    p1Geo.scale(1, 1, 0.92); // Slight dorsal flattening
    p1Geo.translate(0, 0, -p1Len / 2);
    p1Geo.rotateX(Math.PI / 2);
    const p1Mesh = new THREE.Mesh(p1Geo, matProximal);
    p1Mesh.castShadow = true;
    rootGroup.add(p1Mesh);

    // MCP Knuckle sphere
    const mcpGeo = new THREE.SphereGeometry(param.radius * 1.08, 14, 14);
    mcpGeo.scale(1.05, 0.92, 1.05);
    const mcpMesh = new THREE.Mesh(mcpGeo, matProximal);
    mcpMesh.castShadow = true;
    rootGroup.add(mcpMesh);

    // ── Phalanx 2: Middle Phalanx Group (PIP Joint) ─────────────────────────
    const midGroup = new THREE.Group();
    midGroup.position.set(0, 0, -p1Len);
    midGroup.rotation.x = baseMidRotX;

    // PIP Knuckle hinge bulge
    const pipGeo = new THREE.SphereGeometry(param.radius * 0.95, 14, 14);
    const pipMesh = new THREE.Mesh(pipGeo, matMiddle);
    pipMesh.castShadow = true;
    midGroup.add(pipMesh);

    const p2Len = param.length * 0.32;
    const p2Geo = new THREE.CylinderGeometry(param.radius * 0.82, param.radius * 0.94, p2Len, 16);
    p2Geo.scale(1, 1, 0.90);
    p2Geo.translate(0, 0, -p2Len / 2);
    p2Geo.rotateX(Math.PI / 2);
    const p2Mesh = new THREE.Mesh(p2Geo, matMiddle);
    p2Mesh.castShadow = true;
    midGroup.add(p2Mesh);

    // ── Phalanx 3: Distal Phalanx & Fingertip (DIP Joint) ────────────────────
    const tipGroup = new THREE.Group();
    tipGroup.position.set(0, 0, -p2Len);
    tipGroup.rotation.x = baseTipRotX;

    // DIP Knuckle hinge
    const dipGeo = new THREE.SphereGeometry(param.radius * 0.84, 12, 12);
    const dipMesh = new THREE.Mesh(dipGeo, matDistal);
    tipGroup.add(dipMesh);

    const p3Len = param.length * 0.28;
    const p3Geo = new THREE.CylinderGeometry(param.radius * 0.65, param.radius * 0.82, p3Len, 16);
    p3Geo.scale(1, 1, 0.88);
    p3Geo.translate(0, 0, -p3Len / 2);
    p3Geo.rotateX(Math.PI / 2);
    const p3Mesh = new THREE.Mesh(p3Geo, matDistal);
    p3Mesh.castShadow = true;
    tipGroup.add(p3Mesh);

    // Teardrop contoured soft fingertip palmar pad
    const padGeo = new THREE.SphereGeometry(param.radius * 0.68, 16, 16);
    padGeo.scale(1.08, 0.88, 1.25);
    const padMesh = new THREE.Mesh(padGeo, matDistal);
    padMesh.position.set(0, -0.04, -p3Len * 0.92);
    padMesh.castShadow = true;
    tipGroup.add(padMesh);

    // ── Realistic Glossy Keratin Fingernail Plate ───────────────────────────
    const nailWidth = param.radius * 0.92;
    const nailLength = p3Len * 0.62;
    const nailGeo = new THREE.CylinderGeometry(nailWidth * 0.9, nailWidth, nailLength, 12, 1, false, -Math.PI / 2, Math.PI);
    nailGeo.rotateZ(Math.PI / 2);
    nailGeo.scale(1, 0.28, 1);
    const nailMesh = new THREE.Mesh(nailGeo, fingerNailMat);
    nailMesh.position.set(0, param.radius * 0.58, -p3Len * 0.72);
    nailMesh.rotation.x = 0.12;
    nailMesh.castShadow = true;
    tipGroup.add(nailMesh);

    // Tactile Home Row Bump on F & J Index Fingertips
    if ((isLeft && param.id === 'left_index') || (!isLeft && param.id === 'right_index')) {
      const bumpGeo = new THREE.BoxGeometry(0.06, 0.04, 0.18);
      const bumpMat = new THREE.MeshStandardMaterial({
        color: skinConfig.baseColor,
        roughness: 0.3,
      });
      const bumpMesh = new THREE.Mesh(bumpGeo, bumpMat);
      bumpMesh.position.set(0, -param.radius * 0.68, -p3Len * 0.88);
      tipGroup.add(bumpMesh);
    }

    midGroup.add(tipGroup);
    rootGroup.add(midGroup);
    handGroup.add(rootGroup);

    fingers[param.id] = {
      id: param.id,
      rootGroup,
      midGroup,
      tipGroup,
      materials,
      nailMaterial: fingerNailMat,
      baseRotX,
      baseMidRotX,
      baseTipRotX,
      baseRotZ: param.angleZ,
    };
  });

  return { handGroup, fingers };
}

// ── Hands3DCanvas Component ───────────────────────────────────────────────────

function Hands3DCanvas({
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
  const fingersRef = useRef<Record<string, FingerJoints>>({});
  const animationFrameId = useRef<number>(0);
  const [webglSupported, setWebglSupported] = useState<boolean>(true);

  // Customization state
  const [activeSkinTone, setActiveSkinTone] = useState<SkinToneId>('natural_peach');
  const [isOrbiting, setIsOrbiting] = useState<boolean>(false);
  const [showSkinMenu, setShowSkinMenu] = useState<boolean>(false);

  // User 3D Orbit Drag Rotation State
  const orbitState = useRef({
    isDragging: false,
    startX: 0,
    startY: 0,
    rotX: 0,
    rotY: 0,
    targetRotX: 0,
    targetRotY: 0,
  });

  // Active finger state ref for 60fps render loop
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

  const skinConfig = useMemo(() => SKIN_TONES[activeSkinTone], [activeSkinTone]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Check WebGL availability
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) {
        setWebglSupported(false);
        return;
      }
    } catch {
      setWebglSupported(false);
      return;
    }

    const width = container.clientWidth || 640;
    const height = container.clientHeight || 290;

    // ── 1. Scene, Camera, Renderer ───────────────────────────────────────────
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 100);
    camera.position.set(0, 8.0, 5.2);
    camera.lookAt(0, -0.4, -0.85);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;

    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // ── 2. Studio Master Lighting (Skin Subsurface Highlights) ───────────────
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    // Warm Key Light (Optimized shadow map for 60-120 FPS buttery rendering)
    const keyLight = new THREE.DirectionalLight(0xfff5ea, 2.0);
    keyLight.position.set(3.5, 9.0, 5.5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 512;
    keyLight.shadow.mapSize.height = 512;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 25;
    keyLight.shadow.bias = -0.0006;
    scene.add(keyLight);

    // Cool Sky Fill Light
    const fillLight = new THREE.PointLight(0x60a5fa, 0.9, 18);
    fillLight.position.set(-4.5, 6.0, 3.0);
    scene.add(fillLight);

    // Subtle Indigo/Violet Rim Light (Silhouettes and Keratin Sheen)
    const rimLight = new THREE.DirectionalLight(0xa78bfa, 1.4);
    rimLight.position.set(0, 4.0, -5.5);
    scene.add(rimLight);

    // ── 3. Shared Fingernail Keratin Material ─────────────────────────────────
    const nailMaterial = new THREE.MeshPhysicalMaterial({
      color: skinConfig.nailColor,
      roughness: 0.22,
      metalness: skinConfig.isCyber ? 0.4 : 0.04,
      clearcoat: 0.95,
      clearcoatRoughness: 0.08,
      transmission: 0.05,
      ior: 1.52,
    });

    // ── 4. Build Anatomic Left & Right Hands ──────────────────────────────────
    const handsPivotGroup = new THREE.Group();
    scene.add(handsPivotGroup);

    const leftHand = createRealisticHand('left', skinConfig, nailMaterial);
    leftHand.handGroup.position.set(-2.55, -0.15, 0.05);
    leftHand.handGroup.rotation.set(-0.16, 0.09, 0.04);
    handsPivotGroup.add(leftHand.handGroup);

    const rightHand = createRealisticHand('right', skinConfig, nailMaterial);
    rightHand.handGroup.position.set(2.55, -0.15, 0.05);
    rightHand.handGroup.rotation.set(-0.16, -0.09, -0.04);
    handsPivotGroup.add(rightHand.handGroup);

    const allFingers = { ...leftHand.fingers, ...rightHand.fingers };
    fingersRef.current = allFingers;

    // Contact Table Shadow Receiver
    const shadowPlaneGeo = new THREE.PlaneGeometry(18, 12);
    const shadowPlaneMat = new THREE.ShadowMaterial({ opacity: 0.38 });
    const shadowPlane = new THREE.Mesh(shadowPlaneGeo, shadowPlaneMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = -0.68;
    shadowPlane.receiveShadow = true;
    scene.add(shadowPlane);

    // ── 5. 60-120 FPS Biomechanical Render Loop ─────────────────────────────
    let lastTime = performance.now();

    // Reusable color instances to eliminate garbage collection frame stutter (60-120 FPS optimization)
    const tempColor = new THREE.Color();
    const defaultSkinColor = new THREE.Color(skinConfig.baseColor);
    const blackColor = new THREE.Color(0x000000);
    const mistakeColor = new THREE.Color(0xf43f5e);
    const defaultHighlightColor = new THREE.Color(0x6366f1);

    let isPageVisible = typeof document !== 'undefined' ? !document.hidden : true;
    const onVisibilityChange = () => {
      isPageVisible = typeof document !== 'undefined' ? !document.hidden : true;
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    const animate = (time: number) => {
      animationFrameId.current = requestAnimationFrame(animate);
      if (!isPageVisible) return;

      const delta = (time - lastTime) / 1000;
      lastTime = time;
      stateRef.current.animTime += delta;

      const currentActive = stateRef.current.activeFingerId;
      const currentShift = stateRef.current.shiftFingerId;
      const isMistake = stateRef.current.isCorrect === false;

      // Smooth orbit spring dampening
      if (!orbitState.current.isDragging) {
        orbitState.current.targetRotX = THREE.MathUtils.lerp(orbitState.current.targetRotX, 0, 0.05);
        orbitState.current.targetRotY = THREE.MathUtils.lerp(orbitState.current.targetRotY, 0, 0.05);
      }
      orbitState.current.rotX = THREE.MathUtils.lerp(orbitState.current.rotX, orbitState.current.targetRotX, 0.12);
      orbitState.current.rotY = THREE.MathUtils.lerp(orbitState.current.rotY, orbitState.current.targetRotY, 0.12);

      handsPivotGroup.rotation.x = orbitState.current.rotX;
      handsPivotGroup.rotation.y = orbitState.current.rotY;

      // Animate fingers with multi-joint realistic flexion
      Object.entries(fingersRef.current).forEach(([fingerId, finger]) => {
        const isActive = fingerId === currentActive;
        const isShift = fingerId === currentShift;
        const targetHighlight = isActive || isShift;

        // Color & Biometric Glow update (Zero allocations per frame)
        finger.materials.forEach((mat) => {
          if (targetHighlight) {
            const data = FINGER_DATA[fingerId as FingerId];
            const activeColor = isMistake
              ? mistakeColor
              : data
              ? tempColor.set(data.colorHex)
              : defaultHighlightColor;
            mat.color.lerp(activeColor, 0.22);
            mat.emissive.lerp(activeColor, 0.25);
            mat.emissiveIntensity = THREE.MathUtils.lerp(mat.emissiveIntensity, 0.48, 0.22);
          } else {
            mat.color.lerp(defaultSkinColor, 0.15);
            mat.emissive.lerp(blackColor, 0.2);
            mat.emissiveIntensity = THREE.MathUtils.lerp(mat.emissiveIntensity, 0, 0.2);
          }
        });

        // Multi-joint coordinated keypress dynamics
        if (targetHighlight) {
          const tapSpeed = 6.2;
          const tapCycle = Math.sin(stateRef.current.animTime * tapSpeed);
          const tapFactor = tapCycle > 0 ? tapCycle : 0;

          // Coordinated flexion: MCP + PIP + DIP all flex realistically
          const targetRootX = finger.baseRotX + tapFactor * 0.24;
          const targetMidX = finger.baseMidRotX + tapFactor * 0.28;
          const targetTipX = finger.baseTipRotX + tapFactor * 0.18;

          finger.rootGroup.rotation.x = THREE.MathUtils.lerp(finger.rootGroup.rotation.x, targetRootX, 0.28);
          finger.midGroup.rotation.x = THREE.MathUtils.lerp(finger.midGroup.rotation.x, targetMidX, 0.28);
          finger.tipGroup.rotation.x = THREE.MathUtils.lerp(finger.tipGroup.rotation.x, targetTipX, 0.28);
        } else {
          // Smooth return to resting home-row arch
          finger.rootGroup.rotation.x = THREE.MathUtils.lerp(finger.rootGroup.rotation.x, finger.baseRotX, 0.16);
          finger.midGroup.rotation.x = THREE.MathUtils.lerp(finger.midGroup.rotation.x, finger.baseMidRotX, 0.16);
          finger.tipGroup.rotation.x = THREE.MathUtils.lerp(finger.tipGroup.rotation.x, finger.baseTipRotX, 0.16);
        }
      });

      // Subtle resting breathing camera motion
      camera.position.x = Math.sin(stateRef.current.animTime * 0.35) * 0.06;
      camera.lookAt(0, -0.4, -0.85);

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
      document.removeEventListener('visibilitychange', onVisibilityChange);
      resizeObserver.disconnect();
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      renderer.dispose();
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
  }, [theme, skinConfig]);

  // Pointer drag to orbit inspection handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    orbitState.current.isDragging = true;
    orbitState.current.startX = e.clientX;
    orbitState.current.startY = e.clientY;
    setIsOrbiting(true);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!orbitState.current.isDragging) return;
    const deltaX = (e.clientX - orbitState.current.startX) * 0.006;
    const deltaY = (e.clientY - orbitState.current.startY) * 0.005;

    orbitState.current.targetRotY = Math.max(-0.6, Math.min(0.6, orbitState.current.targetRotY + deltaX));
    orbitState.current.targetRotX = Math.max(-0.4, Math.min(0.4, orbitState.current.targetRotX + deltaY));

    orbitState.current.startX = e.clientX;
    orbitState.current.startY = e.clientY;
  };

  const handlePointerUp = () => {
    orbitState.current.isDragging = false;
    setIsOrbiting(false);
  };

  const resetOrbit = () => {
    orbitState.current.targetRotX = 0;
    orbitState.current.targetRotY = 0;
  };

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
      {/* 3D Canvas Mount with Orbit Inspection Drag */}
      <div
        ref={mountRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        className={`w-full h-[230px] sm:h-[270px] md:h-[300px] ${
          isOrbiting ? 'cursor-grabbing' : 'cursor-grab'
        } touch-none`}
        title="Click and drag to inspect 3D hands from different angles"
      />

      {/* Top HUD Controls: Hand Labels & Active Finger */}
      <div className="absolute top-2.5 left-3 right-3 flex items-center justify-between pointer-events-none text-xs">
        <div className="flex items-center gap-2 pointer-events-auto">
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-900/85 border border-slate-700/60 text-slate-300 backdrop-blur-md shadow-lg">
            Left Hand
          </span>
        </div>

        {activeData && showLabels && (
          <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-slate-950/90 border border-brand-border/70 shadow-xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-150">
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

        <div className="flex items-center gap-2 pointer-events-auto">
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-900/85 border border-slate-700/60 text-slate-300 backdrop-blur-md shadow-lg">
            Right Hand
          </span>
        </div>
      </div>

      {/* Bottom Floating Interactive Toolbar: 3D Orbit Reset & Skin Tone Selector */}
      <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between pointer-events-none text-xs">
        {/* Left: 3D Drag Hint & Reset */}
        <div className="flex items-center gap-1.5 pointer-events-auto">
          <button
            type="button"
            onClick={resetOrbit}
            className="px-2 py-1 rounded-lg bg-slate-900/80 hover:bg-slate-850 border border-slate-700/50 text-[10px] text-slate-300 flex items-center gap-1 backdrop-blur-md transition-all shadow-md active:scale-95"
            title="Reset to default typing perspective"
          >
            <Rotate3d className="w-3 h-3 text-brand-primary" />
            <span className="hidden sm:inline">Drag to Inspect</span>
            <RefreshCw className="w-2.5 h-2.5 ml-0.5 text-slate-400" />
          </button>
        </div>

        {/* Right: Skin Tone Palette Menu */}
        <div className="relative pointer-events-auto">
          <button
            type="button"
            onClick={() => setShowSkinMenu((prev) => !prev)}
            className="px-2 py-1 rounded-lg bg-slate-900/80 hover:bg-slate-850 border border-slate-700/50 text-[10px] text-slate-300 flex items-center gap-1.5 backdrop-blur-md transition-all shadow-md active:scale-95"
            title="Choose 3D Hand Skin Tone or Hologram"
          >
            <Sun className="w-3 h-3 text-amber-400" />
            <span className="hidden sm:inline">{skinConfig.name}</span>
          </button>

          {showSkinMenu && (
            <div className="absolute right-0 bottom-8 mb-1 w-44 rounded-xl bg-slate-950/95 border border-slate-800 shadow-2xl backdrop-blur-xl p-1.5 z-50 space-y-1">
              <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800/80">
                Skin Tone Shading
              </div>
              {Object.values(SKIN_TONES).map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => {
                    setActiveSkinTone(st.id);
                    setShowSkinMenu(false);
                  }}
                  className={`w-full px-2 py-1 rounded-lg text-left text-xs font-semibold flex items-center justify-between transition-colors ${
                    activeSkinTone === st.id
                      ? 'bg-brand-primary/20 text-brand-primary'
                      : 'text-slate-300 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full border border-white/20 shadow-inner"
                      style={{ backgroundColor: `#${st.baseColor.toString(16).padStart(6, '0')}` }}
                    />
                    <span>{st.name}</span>
                  </div>
                  {activeSkinTone === st.id && <Check className="w-3 h-3 text-brand-primary" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default React.memo(Hands3DCanvas);
