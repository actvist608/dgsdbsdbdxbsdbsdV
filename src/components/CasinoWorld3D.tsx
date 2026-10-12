import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  CASINO_STATIONS,
  CharacterCustomization,
  GameStationId,
  PlayerState,
} from '../types/casino.ts';
import { soundFX } from '../utils/sound.ts';

interface CasinoWorld3DProps {
  myPlayerId: string;
  myName: string;
  myCustomization: CharacterCustomization;
  players: PlayerState[];
  activeStation: GameStationId | null;
  onSelectStation: (stationId: GameStationId) => void;
  onNearStationChange: (stationId: GameStationId | null) => void;
  onSendMove: (movePayload: {
    x: number;
    y: number;
    z: number;
    vx: number;
    vz: number;
    rotationY: number;
    armSwingPhase: number;
    leftArmGrab: boolean;
    rightArmGrab: boolean;
    isJumping: boolean;
    isRagdollFlop: boolean;
  }) => void;
  externalJoystick: { dx: number; dz: number };
  externalActions: {
    jumpTrigger: number;
    flopTrigger: number;
    leftGrab: boolean;
    rightGrab: boolean;
  };
}

interface RagdollAvatarRig {
  root: THREE.Group;
  pelvis: THREE.Group;
  torso: THREE.Mesh;
  headGroup: THREE.Group;
  leftShoulder: THREE.Group;
  rightShoulder: THREE.Group;
  leftHip: THREE.Group;
  rightHip: THREE.Group;
  hatContainer: THREE.Group;
  accessoryContainer: THREE.Group;
  bodyMat: THREE.MeshStandardMaterial;
  outfitMat: THREE.MeshStandardMaterial;
  lastCustomizationKey: string;
  // Spring-damper state for wobbly Human Fall Flat feel
  tiltX: number;
  tiltZ: number;
  velTiltX: number;
  velTiltZ: number;
  currX: number;
  currY: number;
  currZ: number;
  currRotY: number;
}

function createRagdollRig(customization: CharacterCustomization): RagdollAvatarRig {
  const root = new THREE.Group();
  const pelvis = new THREE.Group();
  pelvis.position.y = 0.85;
  root.add(pelvis);

  const bodyMat = new THREE.MeshStandardMaterial({
    color: customization.bodyColor || '#FDBA74',
    roughness: 0.45,
    metalness: 0.05,
  });

  const outfitMat = new THREE.MeshStandardMaterial({
    color: customization.outfitColor || '#3B82F6',
    roughness: 0.5,
    metalness: 0.1,
  });

  // Plump Jelly-like Torso (Human Fall Flat aesthetic)
  const torsoGeo = new THREE.CapsuleGeometry(0.38, 0.52, 8, 16);
  const torso = new THREE.Mesh(torsoGeo, outfitMat);
  torso.position.y = 0.35;
  torso.castShadow = true;
  torso.receiveShadow = true;
  pelvis.add(torso);

  // Belly button / belt accent
  const beltGeo = new THREE.CylinderGeometry(0.39, 0.39, 0.1, 16);
  const beltMat = new THREE.MeshStandardMaterial({ color: '#1E293B', roughness: 0.6 });
  const belt = new THREE.Mesh(beltGeo, beltMat);
  belt.position.y = 0.1;
  pelvis.add(belt);

  // Head Group
  const headGroup = new THREE.Group();
  headGroup.position.y = 0.98;
  pelvis.add(headGroup);

  const headGeo = new THREE.SphereGeometry(0.34, 18, 18);
  const headMesh = new THREE.Mesh(headGeo, bodyMat);
  headMesh.castShadow = true;
  headGroup.add(headMesh);

  // Expressive Eyes
  const eyeMat = new THREE.MeshBasicMaterial({ color: '#0F172A' });
  const eyeGeo = new THREE.SphereGeometry(0.045, 8, 8);
  const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
  leftEye.position.set(-0.11, 0.06, 0.3);
  const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
  rightEye.position.set(0.11, 0.06, 0.3);
  headGroup.add(leftEye, rightEye);

  // Hat & Accessory Containers
  const hatContainer = new THREE.Group();
  hatContainer.position.y = 0.28;
  headGroup.add(hatContainer);

  const accessoryContainer = new THREE.Group();
  headGroup.add(accessoryContainer);

  // Left & Right Pendulum Arms (Long floppy noodle arms!)
  const armGeo = new THREE.CapsuleGeometry(0.11, 0.58, 6, 12);

  const leftShoulder = new THREE.Group();
  leftShoulder.position.set(-0.46, 0.62, 0);
  const leftArmMesh = new THREE.Mesh(armGeo, bodyMat);
  leftArmMesh.position.y = -0.32;
  leftArmMesh.castShadow = true;
  leftShoulder.add(leftArmMesh);
  pelvis.add(leftShoulder);

  const rightShoulder = new THREE.Group();
  rightShoulder.position.set(0.46, 0.62, 0);
  const rightArmMesh = new THREE.Mesh(armGeo, bodyMat);
  rightArmMesh.position.y = -0.32;
  rightArmMesh.castShadow = true;
  rightShoulder.add(rightArmMesh);
  pelvis.add(rightShoulder);

  // Left & Right Wobbly Legs
  const legGeo = new THREE.CapsuleGeometry(0.13, 0.42, 6, 12);

  const leftHip = new THREE.Group();
  leftHip.position.set(-0.19, 0.0, 0);
  const leftLegMesh = new THREE.Mesh(legGeo, outfitMat);
  leftLegMesh.position.y = -0.28;
  leftLegMesh.castShadow = true;
  leftHip.add(leftLegMesh);
  pelvis.add(leftHip);

  const rightHip = new THREE.Group();
  rightHip.position.set(0.19, 0.0, 0);
  const rightLegMesh = new THREE.Mesh(legGeo, outfitMat);
  rightLegMesh.position.y = -0.28;
  rightLegMesh.castShadow = true;
  rightHip.add(rightLegMesh);
  pelvis.add(rightHip);

  const rig: RagdollAvatarRig = {
    root,
    pelvis,
    torso,
    headGroup,
    leftShoulder,
    rightShoulder,
    leftHip,
    rightHip,
    hatContainer,
    accessoryContainer,
    bodyMat,
    outfitMat,
    lastCustomizationKey: '',
    tiltX: 0,
    tiltZ: 0,
    velTiltX: 0,
    velTiltZ: 0,
    currX: 0,
    currY: 0,
    currZ: 0,
    currRotY: 0,
  };

  applyCustomizationToRig(rig, customization);
  return rig;
}

function applyCustomizationToRig(rig: RagdollAvatarRig, cust: CharacterCustomization) {
  const key = `${cust.bodyColor}-${cust.outfitColor}-${cust.hat}-${cust.accessory}`;
  if (rig.lastCustomizationKey === key) return;
  rig.lastCustomizationKey = key;

  rig.bodyMat.color.set(cust.bodyColor || '#FDBA74');
  rig.outfitMat.color.set(cust.outfitColor || '#3B82F6');

  // Clear old hat & accessories
  while (rig.hatContainer.children.length > 0) {
    rig.hatContainer.remove(rig.hatContainer.children[0]);
  }
  while (rig.accessoryContainer.children.length > 0) {
    rig.accessoryContainer.remove(rig.accessoryContainer.children[0]);
  }

  const goldMat = new THREE.MeshStandardMaterial({ color: '#D4AF37', metalness: 0.75, roughness: 0.2 });
  const darkMat = new THREE.MeshStandardMaterial({ color: '#111827', roughness: 0.3 });

  if (cust.hat === 'tophat') {
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.05, 20), darkMat);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.26, 0.42, 20), darkMat);
    top.position.y = 0.22;
    const ribbon = new THREE.Mesh(new THREE.CylinderGeometry(0.275, 0.275, 0.06, 20), goldMat);
    ribbon.position.y = 0.06;
    rig.hatContainer.add(brim, top, ribbon);
  } else if (cust.hat === 'crown') {
    const crownBase = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.28, 0.22, 8), goldMat);
    crownBase.position.y = 0.1;
    rig.hatContainer.add(crownBase);
  } else if (cust.hat === 'cowboy') {
    const brim = new THREE.Mesh(
      new THREE.CylinderGeometry(0.48, 0.48, 0.04, 20),
      new THREE.MeshStandardMaterial({ color: '#78350F', roughness: 0.6 })
    );
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(0.27, 14, 10),
      new THREE.MeshStandardMaterial({ color: '#78350F', roughness: 0.6 })
    );
    dome.position.y = 0.12;
    rig.hatContainer.add(brim, dome);
  } else if (cust.hat === 'cap') {
    const capMat = new THREE.MeshStandardMaterial({ color: '#EF4444', roughness: 0.5 });
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.33, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), capMat);
    dome.position.y = -0.02;
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.04, 0.28), capMat);
    visor.position.set(0, 0.0, 0.28);
    rig.hatContainer.add(dome, visor);
  } else if (cust.hat === 'viking') {
    const helm = new THREE.Mesh(
      new THREE.SphereGeometry(0.34, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: '#64748B', metalness: 0.6, roughness: 0.3 })
    );
    const hornGeo = new THREE.ConeGeometry(0.07, 0.32, 8);
    const hornMat = new THREE.MeshStandardMaterial({ color: '#F8FAFC' });
    const leftHorn = new THREE.Mesh(hornGeo, hornMat);
    leftHorn.position.set(-0.35, 0.14, 0);
    leftHorn.rotation.z = Math.PI / 4;
    const rightHorn = new THREE.Mesh(hornGeo, hornMat);
    rightHorn.position.set(0.35, 0.14, 0);
    rightHorn.rotation.z = -Math.PI / 4;
    rig.hatContainer.add(helm, leftHorn, rightHorn);
  }

  if (cust.accessory === 'sunglasses') {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.11, 0.08), darkMat);
    frame.position.set(0, 0.06, 0.31);
    rig.accessoryContainer.add(frame);
  } else if (cust.accessory === 'monocle') {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.015, 8, 20), goldMat);
    ring.position.set(0.12, 0.06, 0.33);
    rig.accessoryContainer.add(ring);
  } else if (cust.accessory === 'bowtie') {
    const tieMat = new THREE.MeshStandardMaterial({ color: '#DC2626', roughness: 0.4 });
    const bow = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.1, 0.08), tieMat);
    bow.position.set(0, -0.32, 0.32);
    rig.accessoryContainer.add(bow);
  } else if (cust.accessory === 'cape') {
    const capeMat = new THREE.MeshStandardMaterial({
      color: '#991B1B',
      side: THREE.DoubleSide,
      roughness: 0.5,
    });
    const cape = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 1.05), capeMat);
    cape.position.set(0, -0.75, -0.38);
    cape.rotation.x = 0.22;
    rig.accessoryContainer.add(cape);
  }
}

export const CasinoWorld3D: React.FC<CasinoWorld3DProps> = ({
  myPlayerId,
  myName,
  myCustomization,
  players,
  activeStation,
  onSelectStation,
  onNearStationChange,
  onSendMove,
  externalJoystick,
  externalActions,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [projectedLabels, setProjectedLabels] = useState<
    Array<{
      id: string;
      text: string;
      subtext?: string;
      x: number;
      y: number;
      isStation?: boolean;
      color?: string;
      emote?: string | null;
    }>
  >([]);

  // Keep latest props in refs for inside requestAnimationFrame loop
  const playersRef = useRef<PlayerState[]>(players);
  playersRef.current = players;

  const myCustRef = useRef<CharacterCustomization>(myCustomization);
  myCustRef.current = myCustomization;

  const myNameRef = useRef<string>(myName);
  myNameRef.current = myName;

  const activeStationRef = useRef<GameStationId | null>(activeStation);
  activeStationRef.current = activeStation;

  const extJoyRef = useRef(externalJoystick);
  extJoyRef.current = externalJoystick;

  const extActRef = useRef(externalActions);
  extActRef.current = externalActions;

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0B0F17');
    scene.fog = new THREE.FogExp2('#0B0F17', 0.016);

    const camera = new THREE.PerspectiveCamera(
      52,
      container.clientWidth / container.clientHeight,
      0.1,
      150
    );
    camera.position.set(0, 12, 14);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // --- THREE-POINT STUDIO & CASINO LIGHTING ---
    const ambientLight = new THREE.AmbientLight('#CBD5E1', 0.85);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight('#FFFBEB', 1.45);
    keyLight.position.set(18, 32, 22);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 2;
    keyLight.shadow.camera.far = 90;
    const d = 28;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    scene.add(keyLight);

    const goldPointLight = new THREE.PointLight('#D4AF37', 2.4, 38);
    goldPointLight.position.set(0, 9, -2);
    scene.add(goldPointLight);

    // --- GRAND CASINO FLOOR & ARCHITECTURE ---
    const floorGroup = new THREE.Group();
    scene.add(floorGroup);

    // Main Velvet / Obsidian Carpet Floor
    const floorGeo = new THREE.CylinderGeometry(32, 33, 0.6, 64);
    const floorMat = new THREE.MeshStandardMaterial({
      color: '#111827',
      roughness: 0.65,
      metalness: 0.15,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.position.y = -0.3;
    floorMesh.receiveShadow = true;
    floorGroup.add(floorMesh);

    // Decorative Gold Compass Ring in Center
    const centerRingGeo = new THREE.RingGeometry(4.2, 4.5, 48);
    const goldMat = new THREE.MeshStandardMaterial({
      color: '#D4AF37',
      metalness: 0.8,
      roughness: 0.25,
      side: THREE.DoubleSide,
    });
    const centerRing = new THREE.Mesh(centerRingGeo, goldMat);
    centerRing.rotation.x = -Math.PI / 2;
    centerRing.position.y = 0.02;
    floorGroup.add(centerRing);

    const outerRing = new THREE.Mesh(new THREE.RingGeometry(24.5, 25.0, 64), goldMat);
    outerRing.rotation.x = -Math.PI / 2;
    outerRing.position.y = 0.02;
    floorGroup.add(outerRing);

    // Grand Marble Pillars around the perimeter
    const pillarGeo = new THREE.CylinderGeometry(0.85, 1.0, 12, 20);
    const pillarMat = new THREE.MeshStandardMaterial({
      color: '#1E293B',
      roughness: 0.35,
      metalness: 0.2,
    });
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const px = Math.cos(angle) * 27.5;
      const pz = Math.sin(angle) * 27.5;
      const pillar = new THREE.Mesh(pillarGeo, pillarMat);
      pillar.position.set(px, 6, pz);
      pillar.castShadow = true;
      pillar.receiveShadow = true;
      floorGroup.add(pillar);

      const baseRing = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.2, 0.4, 20), goldMat);
      baseRing.position.set(px, 0.2, pz);
      floorGroup.add(baseRing);
    }

    // --- 9 INTERACTIVE 3D GAME TABLES & MACHINES ---
    const stationMeshes: Map<GameStationId, THREE.Group> = new Map();
    const interactiveHitboxes: THREE.Mesh[] = [];
    const rouletteWheelGroup = new THREE.Group();
    const crashRocketGroup = new THREE.Group();

    CASINO_STATIONS.forEach((st) => {
      const group = new THREE.Group();
      group.position.set(st.x, 0, st.z);

      // Glowing Floor Zone Halo
      const haloGeo = new THREE.RingGeometry(2.6, 2.95, 36);
      const haloMat = new THREE.MeshBasicMaterial({
        color: st.accentColor,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.55,
      });
      const halo = new THREE.Mesh(haloGeo, haloMat);
      halo.rotation.x = -Math.PI / 2;
      halo.position.y = 0.03;
      group.add(halo);

      // Mahogany Pedestal & Table Felt
      const basePedestal = new THREE.Mesh(
        new THREE.CylinderGeometry(1.6, 1.9, 1.05, 24),
        new THREE.MeshStandardMaterial({ color: '#3E2723', roughness: 0.45 })
      );
      basePedestal.position.y = 0.525;
      basePedestal.castShadow = true;
      basePedestal.receiveShadow = true;
      group.add(basePedestal);

      const tableTop = new THREE.Mesh(
        new THREE.CylinderGeometry(2.3, 2.2, 0.22, 32),
        new THREE.MeshStandardMaterial({ color: st.color, roughness: 0.55 })
      );
      tableTop.position.y = 1.12;
      tableTop.castShadow = true;
      tableTop.receiveShadow = true;
      group.add(tableTop);

      const goldRim = new THREE.Mesh(
        new THREE.TorusGeometry(2.28, 0.09, 12, 36),
        goldMat
      );
      goldRim.rotation.x = Math.PI / 2;
      goldRim.position.y = 1.18;
      group.add(goldRim);

      // Specific 3D centerpieces per game
      if (st.id === 'roulette') {
        const wheelBase = new THREE.Mesh(
          new THREE.CylinderGeometry(0.95, 1.0, 0.25, 24),
          goldMat
        );
        wheelBase.position.y = 1.32;
        rouletteWheelGroup.add(wheelBase);

        const spinnerCross = new THREE.Mesh(
          new THREE.BoxGeometry(1.4, 0.12, 0.18),
          new THREE.MeshStandardMaterial({ color: '#DC2626' })
        );
        spinnerCross.position.y = 1.48;
        rouletteWheelGroup.add(spinnerCross);
        group.add(rouletteWheelGroup);
      } else if (st.id === 'crash') {
        const rocketBody = new THREE.Mesh(
          new THREE.ConeGeometry(0.45, 1.5, 16),
          new THREE.MeshStandardMaterial({ color: '#F59E0B', metalness: 0.4, roughness: 0.3 })
        );
        rocketBody.position.y = 2.1;
        crashRocketGroup.add(rocketBody);
        group.add(crashRocketGroup);
      } else if (st.id === 'slots') {
        const cabinet = new THREE.Mesh(
          new THREE.BoxGeometry(1.8, 2.4, 1.1),
          new THREE.MeshStandardMaterial({ color: '#991B1B', metalness: 0.3, roughness: 0.4 })
        );
        cabinet.position.y = 2.1;
        cabinet.castShadow = true;
        group.add(cabinet);
      } else if (st.id === 'plinko') {
        const board = new THREE.Mesh(
          new THREE.ConeGeometry(1.1, 1.8, 4),
          new THREE.MeshStandardMaterial({ color: '#EC4899', roughness: 0.35 })
        );
        board.position.y = 2.1;
        board.rotation.y = Math.PI / 4;
        group.add(board);
      } else if (st.id === 'dice') {
        const cube = new THREE.Mesh(
          new THREE.BoxGeometry(0.85, 0.85, 0.85),
          new THREE.MeshStandardMaterial({ color: '#8B5CF6', roughness: 0.25 })
        );
        cube.position.y = 1.95;
        cube.rotation.set(0.5, 0.5, 0.3);
        group.add(cube);
      }

      // Physics Bouncy Stools around the table that ragdolls can bump into
      for (let s = 0; s < 4; s++) {
        const sa = (s / 4) * Math.PI * 2 + Math.PI / 4;
        const stool = new THREE.Mesh(
          new THREE.CylinderGeometry(0.38, 0.32, 0.65, 16),
          new THREE.MeshStandardMaterial({ color: '#1E293B', roughness: 0.5 })
        );
        stool.position.set(Math.cos(sa) * 2.75, 0.325, Math.sin(sa) * 2.75);
        stool.castShadow = true;
        group.add(stool);
      }

      // Invisible Raycast Cylinder for direct mouse/touch clicking on a table
      const hitbox = new THREE.Mesh(
        new THREE.CylinderGeometry(2.6, 2.6, 3.2, 16),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      hitbox.position.y = 1.6;
      hitbox.userData = { stationId: st.id };
      group.add(hitbox);
      interactiveHitboxes.push(hitbox);

      scene.add(group);
      stationMeshes.set(st.id, group);
    });

    // --- PHYSICS PLAYGROUND PROPS (Bouncy Giant Casino Chips & Ragdoll Obstacles) ---
    const bouncyProps: Array<{ mesh: THREE.Mesh; vx: number; vz: number; radius: number }> = [];
    const chipColors = ['#D4AF37', '#EF4444', '#10B981', '#3B82F6'];
    for (let i = 0; i < 6; i++) {
      const chipMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.65, 0.65, 0.28, 20),
        new THREE.MeshStandardMaterial({
          color: chipColors[i % chipColors.length],
          metalness: 0.35,
          roughness: 0.3,
        })
      );
      const angle = (i / 6) * Math.PI * 2;
      chipMesh.position.set(Math.cos(angle) * 5.2, 0.14, Math.sin(angle) * 5.2);
      chipMesh.castShadow = true;
      chipMesh.receiveShadow = true;
      scene.add(chipMesh);
      bouncyProps.push({ mesh: chipMesh, vx: 0, vz: 0, radius: 0.65 });
    }

    // --- LOCAL PLAYER RAGDOLL STATE ---
    const avatarRigs = new Map<string, RagdollAvatarRig>();
    const localPos = {
      x: 0,
      y: 0,
      z: 3.5,
      vx: 0,
      vy: 0,
      vz: 0,
      rotY: Math.PI,
      armPhase: 0,
      isJumping: false,
      isFlopping: false,
      leftGrab: false,
      rightGrab: false,
    };

    const keys: Record<string, boolean> = {};
    let mouseLeftGrab = false;
    let mouseRightGrab = false;
    let cameraYaw = 0;
    let isDraggingCam = false;
    let prevPointerX = 0;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Do not intercept keys if user is typing in an input or textarea
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const k = e.key.toLowerCase();
      keys[k] = true;

      if (e.code === 'Space' && !activeStationRef.current) {
        if (!localPos.isJumping && localPos.y <= 0.05) {
          localPos.vy = 0.24;
          localPos.isJumping = true;
          soundFX.playBoingJump();
        }
      }
      if (k === 'f' && !activeStationRef.current) {
        localPos.isFlopping = !localPos.isFlopping;
        if (localPos.isFlopping) {
          localPos.vy = 0.16;
          soundFX.playBoingJump();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      keys[k] = false;
    };

    // Raycaster for clicking directly on 3D tables
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const handlePointerDown = (e: PointerEvent) => {
      if (activeStationRef.current) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointer, camera);
      const intersects = raycaster.intersectObjects(interactiveHitboxes, false);
      if (intersects.length > 0) {
        const stId = intersects[0].object.userData?.stationId as GameStationId | undefined;
        if (stId) {
          soundFX.playChipClick();
          onSelectStation(stId);
          return;
        }
      }

      if (e.button === 0) {
        isDraggingCam = true;
        prevPointerX = e.clientX;
        mouseLeftGrab = true;
      } else if (e.button === 2) {
        mouseRightGrab = true;
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (isDraggingCam) {
        const deltaX = e.clientX - prevPointerX;
        prevPointerX = e.clientX;
        cameraYaw -= deltaX * 0.0055;
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (e.button === 0) {
        isDraggingCam = false;
        mouseLeftGrab = false;
      } else if (e.button === 2) {
        mouseRightGrab = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    const domElem = renderer.domElement;
    domElem.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    let lastJumpTrig = extActRef.current.jumpTrigger;
    let lastFlopTrig = extActRef.current.flopTrigger;
    let lastNetworkEmit = 0;
    let lastDetectedNear: GameStationId | null = null;
    let animFrameId = 0;

    const animate = (now: number) => {
      animFrameId = requestAnimationFrame(animate);

      // Handle external mobile triggers
      if (extActRef.current.jumpTrigger !== lastJumpTrig) {
        lastJumpTrig = extActRef.current.jumpTrigger;
        if (!localPos.isJumping && localPos.y <= 0.05) {
          localPos.vy = 0.24;
          localPos.isJumping = true;
          soundFX.playBoingJump();
        }
      }
      if (extActRef.current.flopTrigger !== lastFlopTrig) {
        lastFlopTrig = extActRef.current.flopTrigger;
        localPos.isFlopping = !localPos.isFlopping;
        if (localPos.isFlopping) {
          localPos.vy = 0.16;
          soundFX.playBoingJump();
        }
      }

      // Animate Casino Centerpieces
      rouletteWheelGroup.rotation.y += 0.035;
      crashRocketGroup.position.y = Math.sin(now * 0.004) * 0.28;
      crashRocketGroup.rotation.y += 0.02;

      // --- LOCAL PLAYER MOVEMENT & HUMAN FALL FLAT RAGDOLL PHYSICS ---
      let inputX = extJoyRef.current.dx;
      let inputZ = extJoyRef.current.dz;

      if (!activeStationRef.current) {
        if (keys['w'] || keys['z'] || keys['arrowup']) inputZ -= 1;
        if (keys['s'] || keys['arrowdown']) inputZ += 1;
        if (keys['a'] || keys['q'] || keys['arrowleft']) inputX -= 1;
        if (keys['d'] || keys['arrowright']) inputX += 1;
      }

      const len = Math.hypot(inputX, inputZ);
      if (len > 1) {
        inputX /= len;
        inputZ /= len;
      }

      // Rotate input vector by camera yaw
      const moveX = inputX * Math.cos(cameraYaw) + inputZ * Math.sin(cameraYaw);
      const moveZ = -inputX * Math.sin(cameraYaw) + inputZ * Math.cos(cameraYaw);

      const speed = localPos.isFlopping ? 0.04 : 0.165;
      localPos.vx = localPos.vx * 0.78 + moveX * speed * 0.22;
      localPos.vz = localPos.vz * 0.78 + moveZ * speed * 0.22;

      localPos.x += localPos.vx;
      localPos.z += localPos.vz;

      // Keep inside casino arena radius
      const distFromCenter = Math.hypot(localPos.x, localPos.z);
      if (distFromCenter > 24.5) {
        const scale = 24.5 / distFromCenter;
        localPos.x *= scale;
        localPos.z *= scale;
      }

      // Table collisions & proximity detection
      let nearestStation: GameStationId | null = null;
      let nearestDist = 999;

      for (const st of CASINO_STATIONS) {
        const dx = localPos.x - st.x;
        const dz = localPos.z - st.z;
        const dist = Math.hypot(dx, dz);
        if (dist < 2.65 && dist > 0.001) {
          // Soft bouncy pushback from table edge
          const push = (2.65 - dist) * 0.35;
          localPos.x += (dx / dist) * push;
          localPos.z += (dz / dist) * push;
        }
        if (dist < 4.3 && dist < nearestDist) {
          nearestDist = dist;
          nearestStation = st.id;
        }
      }

      if (nearestStation !== lastDetectedNear) {
        lastDetectedNear = nearestStation;
        onNearStationChange(nearestStation);
      }

      // Bouncy physics props interaction
      for (const prop of bouncyProps) {
        const dx = prop.mesh.position.x - localPos.x;
        const dz = prop.mesh.position.z - localPos.z;
        const dist = Math.hypot(dx, dz);
        const minDist = prop.radius + 0.55;
        if (dist < minDist && dist > 0.001) {
          const force = (minDist - dist) * 0.22;
          prop.vx += (dx / dist) * force + localPos.vx * 0.5;
          prop.vz += (dz / dist) * force + localPos.vz * 0.5;
        }
        prop.mesh.position.x += prop.vx;
        prop.mesh.position.z += prop.vz;
        prop.vx *= 0.91;
        prop.vz *= 0.91;

        const pDist = Math.hypot(prop.mesh.position.x, prop.mesh.position.z);
        if (pDist > 24) {
          prop.vx *= -0.8;
          prop.vz *= -0.8;
        }
      }

      // Gravity & Jump physics
      localPos.y += localPos.vy;
      if (localPos.y > 0) {
        localPos.vy -= 0.013;
      } else {
        localPos.y = 0;
        localPos.vy = 0;
        localPos.isJumping = false;
      }

      const velocityMag = Math.hypot(localPos.vx, localPos.vz);
      if (velocityMag > 0.008) {
        const targetAngle = Math.atan2(localPos.vx, localPos.vz);
        let diff = targetAngle - localPos.rotY;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        localPos.rotY += diff * 0.18;
        localPos.armPhase += velocityMag * 1.95;
      }

      localPos.leftGrab = Boolean(keys['q'] || keys['e'] || mouseLeftGrab || extActRef.current.leftGrab);
      localPos.rightGrab = Boolean(keys['e'] || mouseRightGrab || extActRef.current.rightGrab);

      // Emit local player movement at ~20Hz
      if (now - lastNetworkEmit > 50) {
        lastNetworkEmit = now;
        onSendMove({
          x: Number(localPos.x.toFixed(2)),
          y: Number(localPos.y.toFixed(2)),
          z: Number(localPos.z.toFixed(2)),
          vx: Number(localPos.vx.toFixed(3)),
          vz: Number(localPos.vz.toFixed(3)),
          rotationY: Number(localPos.rotY.toFixed(2)),
          armSwingPhase: Number(localPos.armPhase.toFixed(2)),
          leftArmGrab: localPos.leftGrab,
          rightArmGrab: localPos.rightGrab,
          isJumping: localPos.isJumping,
          isRagdollFlop: localPos.isFlopping,
        });
      }

      // --- UPDATE ALL PLAYER AVATAR RIGS (LOCAL + REMOTE) ---
      const activeIds = new Set<string>();
      const allPlayers = playersRef.current;

      // Ensure local player is always rendered even before first WS roundtrip
      const renderList: PlayerState[] = [
        {
          id: myPlayerId || 'local',
          name: myNameRef.current,
          roomId: '',
          balance: 0,
          totalWon: 0,
          x: localPos.x,
          y: localPos.y,
          z: localPos.z,
          vx: localPos.vx,
          vz: localPos.vz,
          rotationY: localPos.rotY,
          armSwingPhase: localPos.armPhase,
          leftArmGrab: localPos.leftGrab,
          rightArmGrab: localPos.rightGrab,
          isJumping: localPos.isJumping,
          isRagdollFlop: localPos.isFlopping,
          customization: myCustRef.current,
          activeStation: activeStationRef.current,
          lastDailyReward: null,
          emote: allPlayers.find((p) => p.id === myPlayerId)?.emote,
          emoteExpiresAt: allPlayers.find((p) => p.id === myPlayerId)?.emoteExpiresAt,
        },
        ...allPlayers.filter((p) => p.id !== myPlayerId),
      ];

      for (const p of renderList) {
        activeIds.add(p.id);
        let rig = avatarRigs.get(p.id);
        if (!rig) {
          rig = createRagdollRig(p.customization);
          rig.currX = p.x;
          rig.currY = p.y;
          rig.currZ = p.z;
          rig.currRotY = p.rotationY;
          scene.add(rig.root);
          avatarRigs.set(p.id, rig);
        }

        applyCustomizationToRig(rig, p.customization);

        // Smooth interpolation for remote players, immediate for local
        const isLocal = p.id === (myPlayerId || 'local');
        const lerpFactor = isLocal ? 0.65 : 0.22;
        rig.currX += (p.x - rig.currX) * lerpFactor;
        rig.currY += (p.y - rig.currY) * lerpFactor;
        rig.currZ += (p.z - rig.currZ) * lerpFactor;

        let rotDiff = p.rotationY - rig.currRotY;
        while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
        while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
        rig.currRotY += rotDiff * lerpFactor;

        const speedMag = Math.hypot(p.vx || 0, p.vz || 0);
        const waddleBob = Math.abs(Math.sin(p.armSwingPhase)) * (speedMag > 0.01 ? 0.14 : 0.02);

        rig.root.position.set(rig.currX, rig.currY + waddleBob, rig.currZ);
        rig.root.rotation.y = rig.currRotY;

        // Spring-damper Human Fall Flat torso wobble!
        const targetTiltX = p.isRagdollFlop ? 1.45 : Math.min(0.42, speedMag * 2.1);
        const targetTiltZ = p.isRagdollFlop
          ? Math.sin(now * 0.008) * 0.5
          : Math.cos(p.armSwingPhase) * Math.min(0.28, speedMag * 1.8);

        const springK = 0.16;
        const damping = 0.76;
        rig.velTiltX = (rig.velTiltX + (targetTiltX - rig.tiltX) * springK) * damping;
        rig.velTiltZ = (rig.velTiltZ + (targetTiltZ - rig.tiltZ) * springK) * damping;
        rig.tiltX += rig.velTiltX;
        rig.tiltZ += rig.velTiltZ;

        rig.pelvis.rotation.x = rig.tiltX;
        rig.pelvis.rotation.z = rig.tiltZ;
        rig.pelvis.position.y = p.isRagdollFlop ? 0.38 : 0.85;

        // Head counter-wobble
        rig.headGroup.rotation.z = -rig.tiltZ * 0.8 + Math.sin(now * 0.003) * 0.05;
        rig.headGroup.rotation.x = -rig.tiltX * 0.35;

        // Exaggerated Arm Swing & Reach/Grab physics ("personnage avec les bras qui balancent")
        const swingAmp = Math.min(1.35, speedMag * 8.5 + 0.08);
        if (p.leftArmGrab) {
          rig.leftShoulder.rotation.x = -2.35 + Math.sin(now * 0.01) * 0.12;
          rig.leftShoulder.rotation.z = 0.25;
        } else {
          rig.leftShoulder.rotation.x = Math.sin(p.armSwingPhase) * swingAmp;
          rig.leftShoulder.rotation.z = 0.14 + Math.abs(Math.cos(p.armSwingPhase)) * 0.22;
        }

        if (p.rightArmGrab) {
          rig.rightShoulder.rotation.x = -2.35 + Math.cos(now * 0.01) * 0.12;
          rig.rightShoulder.rotation.z = -0.25;
        } else {
          rig.rightShoulder.rotation.x = -Math.sin(p.armSwingPhase) * swingAmp;
          rig.rightShoulder.rotation.z = -0.14 - Math.abs(Math.sin(p.armSwingPhase)) * 0.22;
        }

        // Wobbly Legs stride
        const legAmp = Math.min(0.95, speedMag * 6.5);
        rig.leftHip.rotation.x = -Math.sin(p.armSwingPhase) * legAmp;
        rig.rightHip.rotation.x = Math.sin(p.armSwingPhase) * legAmp;
      }

      // Cleanup disconnected players
      for (const [id, rig] of avatarRigs.entries()) {
        if (!activeIds.has(id)) {
          scene.remove(rig.root);
          avatarRigs.delete(id);
        }
      }

      // --- SMOOTH THIRD-PERSON CAMERA FOLLOW ---
      const camDist = 10.5;
      const camHeight = 7.4;
      const desiredCamX = localPos.x + Math.sin(cameraYaw) * camDist;
      const desiredCamZ = localPos.z + Math.cos(cameraYaw) * camDist;
      camera.position.x += (desiredCamX - camera.position.x) * 0.12;
      camera.position.z += (desiredCamZ - camera.position.z) * 0.12;
      camera.position.y += (localPos.y + camHeight - camera.position.y) * 0.12;
      camera.lookAt(localPos.x, localPos.y + 1.4, localPos.z);

      renderer.render(scene, camera);

      // --- PROJECT 3D COORDINATES TO SEMANTIC DOM OVERLAY LABELS ---
      const width = container.clientWidth;
      const height = container.clientHeight;
      const newLabels: typeof projectedLabels = [];

      // 1. Station Labels
      for (const st of CASINO_STATIONS) {
        const v = new THREE.Vector3(st.x, 3.1, st.z);
        v.project(camera);
        if (v.z < 1) {
          const sx = (v.x * 0.5 + 0.5) * width;
          const sy = (-(v.y * 0.5) + 0.5) * height;
          if (sx > -50 && sx < width + 50 && sy > -50 && sy < height + 50) {
            newLabels.push({
              id: `st-${st.id}`,
              text: st.name,
              subtext: `${st.subtitle} · Min ${st.minBet} €`,
              x: sx,
              y: sy,
              isStation: true,
              color: st.accentColor,
            });
          }
        }
      }

      // 2. Player Name & Emote Labels
      for (const p of renderList) {
        const rig = avatarRigs.get(p.id);
        if (!rig) continue;
        const v = new THREE.Vector3(rig.currX, rig.currY + 2.55, rig.currZ);
        v.project(camera);
        if (v.z < 1) {
          const sx = (v.x * 0.5 + 0.5) * width;
          const sy = (-(v.y * 0.5) + 0.5) * height;
          const activeEmote =
            p.emote && (!p.emoteExpiresAt || p.emoteExpiresAt > Date.now()) ? p.emote : null;
          newLabels.push({
            id: `pl-${p.id}`,
            text: p.name,
            subtext: p.activeStation ? `En jeu (${p.activeStation.toUpperCase()})` : undefined,
            x: sx,
            y: sy,
            isStation: false,
            color: p.customization.outfitColor,
            emote: activeEmote,
          });
        }
      }

      setProjectedLabels(newLabels);
    };

    animFrameId = requestAnimationFrame(animate);

    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animFrameId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('resize', handleResize);
      domElem.removeEventListener('pointerdown', handlePointerDown);
      renderer.dispose();
      if (container.contains(domElem)) {
        container.removeChild(domElem);
      }
    };
  }, [myPlayerId]);

  return (
    <div className="relative w-full h-full overflow-hidden select-none">
      {/* 3D WebGL Viewport */}
      <div
        ref={mountRef}
        onContextMenu={(e) => e.preventDefault()}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      />

      {/* Semantic DOM Overlay Layer for 3D Labels (Zero Canvas Pixel Text) */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-10">
        {projectedLabels.map((lbl) => (
          <div
            key={lbl.id}
            style={{
              transform: `translate3d(${lbl.x}px, ${lbl.y}px, 0) translate(-50%, -100%)`,
            }}
            className="absolute top-0 left-0 transition-transform duration-75"
          >
            {lbl.isStation ? (
              <button
                type="button"
                onClick={() => {
                  const stId = lbl.id.replace('st-', '') as GameStationId;
                  soundFX.playChipClick();
                  onSelectStation(stId);
                }}
                className="pointer-events-auto group flex flex-col items-center px-3 py-1.5 rounded-lg bg-[#0B0F17]/85 backdrop-blur-md border border-white/15 hover:border-[#D4AF37] shadow-lg transition-all hover:scale-105"
              >
                <span className="text-xs font-semibold tracking-wide text-[#F8FAFC] group-hover:text-[#D4AF37] whitespace-nowrap">
                  {lbl.text}
                </span>
                {lbl.subtext && (
                  <span className="text-[10px] text-slate-400 whitespace-nowrap">
                    {lbl.subtext}
                  </span>
                )}
              </button>
            ) : (
              <div className="flex flex-col items-center">
                {lbl.emote && (
                  <div className="mb-1 px-2.5 py-1 rounded-lg bg-[#D4AF37] text-[#0B0F17] text-xs font-bold shadow-md animate-bounce whitespace-nowrap">
                    {lbl.emote}
                  </div>
                )}
                <div className="px-2.5 py-0.5 rounded bg-[#0B0F17]/75 backdrop-blur-sm border border-white/10 text-center">
                  <div className="text-xs font-medium text-white whitespace-nowrap">
                    {lbl.text}
                  </div>
                  {lbl.subtext && (
                    <div className="text-[10px] text-[#D4AF37] whitespace-nowrap">
                      {lbl.subtext}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
