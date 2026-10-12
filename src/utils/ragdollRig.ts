import * as THREE from 'three';
import { CharacterCustomization, ShopItemId } from '../types/casino.ts';

export interface RagdollAvatarRig {
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
  handItemContainer: THREE.Group;
  mouthPropContainer: THREE.Group;
  auraContainer: THREE.Group;
  bodyMat: THREE.MeshStandardMaterial;
  outfitMat: THREE.MeshStandardMaterial;
  lastCustomizationKey: string;
  lastItemKey: string;
  tiltX: number;
  tiltZ: number;
  velTiltX: number;
  velTiltZ: number;
  currX: number;
  currY: number;
  currZ: number;
  currRotY: number;
}

export function createRagdollRig(customization: CharacterCustomization): RagdollAvatarRig {
  const root = new THREE.Group();
  const pelvis = new THREE.Group();
  pelvis.position.y = 0.85;
  root.add(pelvis);

  const bodyMat = new THREE.MeshStandardMaterial({
    color: customization.bodyColor || '#FDBA74',
    roughness: 0.38,
    metalness: 0.08,
  });

  const outfitMat = new THREE.MeshStandardMaterial({
    color: customization.outfitColor || '#3B82F6',
    roughness: 0.42,
    metalness: 0.15,
  });

  // Plump Jelly-like Torso (Human Fall Flat aesthetic)
  const torsoGeo = new THREE.CapsuleGeometry(0.38, 0.52, 10, 18);
  const torso = new THREE.Mesh(torsoGeo, outfitMat);
  torso.position.y = 0.35;
  torso.castShadow = true;
  torso.receiveShadow = true;
  pelvis.add(torso);

  // Luxury Gold Belt buckle
  const beltGeo = new THREE.CylinderGeometry(0.39, 0.39, 0.09, 18);
  const beltMat = new THREE.MeshStandardMaterial({ color: '#111827', roughness: 0.5 });
  const belt = new THREE.Mesh(beltGeo, beltMat);
  belt.position.y = 0.1;
  pelvis.add(belt);

  const buckle = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.12, 0.08),
    new THREE.MeshStandardMaterial({ color: '#D4AF37', metalness: 0.85, roughness: 0.2 })
  );
  buckle.position.set(0, 0.1, 0.38);
  pelvis.add(buckle);

  // Head Group
  const headGroup = new THREE.Group();
  headGroup.position.y = 0.98;
  pelvis.add(headGroup);

  const headGeo = new THREE.SphereGeometry(0.34, 20, 20);
  const headMesh = new THREE.Mesh(headGeo, bodyMat);
  headMesh.castShadow = true;
  headGroup.add(headMesh);

  // Expressive Eyes
  const eyeMat = new THREE.MeshBasicMaterial({ color: '#0F172A' });
  const eyeGeo = new THREE.SphereGeometry(0.048, 10, 10);
  const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
  leftEye.position.set(-0.11, 0.06, 0.3);
  const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
  rightEye.position.set(0.11, 0.06, 0.3);
  headGroup.add(leftEye, rightEye);

  // Containers for Hats, Accessories, Cigarette in Mouth, and Hand Items
  const hatContainer = new THREE.Group();
  hatContainer.position.y = 0.28;
  headGroup.add(hatContainer);

  const accessoryContainer = new THREE.Group();
  headGroup.add(accessoryContainer);

  const mouthPropContainer = new THREE.Group();
  mouthPropContainer.position.set(0.08, -0.08, 0.32);
  headGroup.add(mouthPropContainer);

  const auraContainer = new THREE.Group();
  auraContainer.position.y = 0.5;
  root.add(auraContainer);

  // Left & Right Pendulum Arms
  const armGeo = new THREE.CapsuleGeometry(0.11, 0.58, 8, 14);

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

  const handItemContainer = new THREE.Group();
  handItemContainer.position.set(0, -0.58, 0.15);
  rightShoulder.add(handItemContainer);

  pelvis.add(rightShoulder);

  // Left & Right Wobbly Legs
  const legGeo = new THREE.CapsuleGeometry(0.13, 0.42, 8, 14);

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
    handItemContainer,
    mouthPropContainer,
    auraContainer,
    bodyMat,
    outfitMat,
    lastCustomizationKey: '',
    lastItemKey: '',
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

export function applyCustomizationToRig(
  rig: RagdollAvatarRig,
  cust: CharacterCustomization,
  equippedItem: ShopItemId | null = null
) {
  const key = `${cust.bodyColor}-${cust.outfitColor}-${cust.hat}-${cust.accessory}-${cust.aura || 'none'}`;
  if (rig.lastCustomizationKey !== key) {
    rig.lastCustomizationKey = key;

    rig.bodyMat.color.set(cust.bodyColor || '#FDBA74');
    rig.outfitMat.color.set(cust.outfitColor || '#3B82F6');

    while (rig.hatContainer.children.length > 0) {
      rig.hatContainer.remove(rig.hatContainer.children[0]);
    }
    while (rig.accessoryContainer.children.length > 0) {
      rig.accessoryContainer.remove(rig.accessoryContainer.children[0]);
    }
    while (rig.auraContainer.children.length > 0) {
      rig.auraContainer.remove(rig.auraContainer.children[0]);
    }

    const goldMat = new THREE.MeshStandardMaterial({
      color: '#D4AF37',
      metalness: 0.85,
      roughness: 0.18,
    });
    const darkMat = new THREE.MeshStandardMaterial({ color: '#111827', roughness: 0.3 });

    // --- HATS ---
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
      const gem = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.08),
        new THREE.MeshBasicMaterial({ color: '#EF4444' })
      );
      gem.position.set(0, 0.14, 0.3);
      rig.hatContainer.add(crownBase, gem);
    } else if (cust.hat === 'cowboy') {
      const leatherMat = new THREE.MeshStandardMaterial({ color: '#78350F', roughness: 0.6 });
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.04, 20), leatherMat);
      const dome = new THREE.Mesh(new THREE.SphereGeometry(0.27, 14, 10), leatherMat);
      dome.position.y = 0.12;
      rig.hatContainer.add(brim, dome);
    } else if (cust.hat === 'cap') {
      const capMat = new THREE.MeshStandardMaterial({ color: '#EF4444', roughness: 0.5 });
      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(0.33, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2),
        capMat
      );
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
    } else if (cust.hat === 'astronaut') {
      const glassMat = new THREE.MeshStandardMaterial({
        color: '#38BDF8',
        transparent: true,
        opacity: 0.55,
        metalness: 0.8,
        roughness: 0.1,
      });
      const bubble = new THREE.Mesh(new THREE.SphereGeometry(0.44, 20, 20), glassMat);
      bubble.position.y = -0.22;
      rig.hatContainer.add(bubble);
    } else if (cust.hat === 'halo') {
      const haloRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.34, 0.04, 12, 32),
        new THREE.MeshBasicMaterial({ color: '#FACC15' })
      );
      haloRing.rotation.x = Math.PI / 2;
      haloRing.position.y = 0.26;
      rig.hatContainer.add(haloRing);
    } else if (cust.hat === 'chef') {
      const whiteMat = new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 0.6 });
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.25, 16), whiteMat);
      base.position.y = 0.1;
      const puff = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 12), whiteMat);
      puff.position.y = 0.28;
      rig.hatContainer.add(base, puff);
    } else if (cust.hat === 'pirate') {
      const tricorn = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.15, 0.22, 3), darkMat);
      tricorn.position.y = 0.1;
      rig.hatContainer.add(tricorn);
    }

    // --- ACCESSORIES ---
    if (cust.accessory === 'sunglasses') {
      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.12, 0.08), darkMat);
      frame.position.set(0, 0.06, 0.31);
      rig.accessoryContainer.add(frame);
    } else if (cust.accessory === 'monocle') {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.016, 8, 20), goldMat);
      ring.position.set(0.12, 0.06, 0.33);
      rig.accessoryContainer.add(ring);
    } else if (cust.accessory === 'bowtie') {
      const tieMat = new THREE.MeshStandardMaterial({ color: '#DC2626', roughness: 0.4 });
      const bow = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.11, 0.08), tieMat);
      bow.position.set(0, -0.32, 0.32);
      rig.accessoryContainer.add(bow);
    } else if (cust.accessory === 'cape') {
      const capeMat = new THREE.MeshStandardMaterial({
        color: '#991B1B',
        side: THREE.DoubleSide,
        roughness: 0.5,
      });
      const cape = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 1.15), capeMat);
      cape.position.set(0, -0.75, -0.38);
      cape.rotation.x = 0.22;
      rig.accessoryContainer.add(cape);
    } else if (cust.accessory === 'wings') {
      const wingMat = new THREE.MeshStandardMaterial({
        color: '#F8FAFC',
        emissive: '#38BDF8',
        emissiveIntensity: 0.25,
        side: THREE.DoubleSide,
      });
      const leftWing = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.45, 0.05), wingMat);
      leftWing.position.set(-0.45, -0.45, -0.35);
      leftWing.rotation.z = 0.3;
      const rightWing = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.45, 0.05), wingMat);
      rightWing.position.set(0.45, -0.45, -0.35);
      rightWing.rotation.z = -0.3;
      rig.accessoryContainer.add(leftWing, rightWing);
    } else if (cust.accessory === 'goldchain') {
      const chain = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.035, 10, 24), goldMat);
      chain.rotation.x = Math.PI / 2 + 0.3;
      chain.position.set(0, -0.38, 0.08);
      rig.accessoryContainer.add(chain);
    } else if (cust.accessory === 'jetpack') {
      const silverMat = new THREE.MeshStandardMaterial({
        color: '#94A3B8',
        metalness: 0.75,
        roughness: 0.25,
      });
      const t1 = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.55, 12), silverMat);
      t1.position.set(-0.16, -0.55, -0.38);
      const t2 = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.55, 12), silverMat);
      t2.position.set(0.16, -0.55, -0.38);
      rig.accessoryContainer.add(t1, t2);
    } else if (cust.accessory === 'beard') {
      const beardMat = new THREE.MeshStandardMaterial({ color: '#451A03', roughness: 0.8 });
      const beard = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 12), beardMat);
      beard.position.set(0, -0.18, 0.22);
      rig.accessoryContainer.add(beard);
    }

    // --- AURAS ---
    if (cust.aura && cust.aura !== 'none') {
      const auraColor =
        cust.aura === 'gold_sparks'
          ? '#D4AF37'
          : cust.aura === 'neon_flame'
          ? '#EC4899'
          : cust.aura === 'emerald_luck'
          ? '#10B981'
          : '#38BDF8';
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.68, 0.025, 8, 32),
        new THREE.MeshBasicMaterial({ color: auraColor })
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = -0.42;
      rig.auraContainer.add(ring);

      for (let i = 0; i < 6; i++) {
        const orb = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.06),
          new THREE.MeshBasicMaterial({ color: auraColor })
        );
        const a = (i / 6) * Math.PI * 2;
        orb.position.set(Math.cos(a) * 0.65, (i % 3) * 0.45, Math.sin(a) * 0.65);
        rig.auraContainer.add(orb);
      }
    }
  }

  // --- EQUIPPED ITEM IN MOUTH OR HAND ---
  const itemKey = equippedItem || 'none';
  if (rig.lastItemKey !== itemKey) {
    rig.lastItemKey = itemKey;
    while (rig.handItemContainer.children.length > 0) {
      rig.handItemContainer.remove(rig.handItemContainer.children[0]);
    }
    while (rig.mouthPropContainer.children.length > 0) {
      rig.mouthPropContainer.remove(rig.mouthPropContainer.children[0]);
    }

    if (equippedItem === 'cigarette') {
      // Smokable Cigarette in mouth with glowing ember tip
      const cigGroup = new THREE.Group();
      const filter = new THREE.Mesh(
        new THREE.CylinderGeometry(0.022, 0.022, 0.08, 8),
        new THREE.MeshStandardMaterial({ color: '#D97706' })
      );
      filter.rotation.x = Math.PI / 2;
      filter.position.z = 0.04;
      const paper = new THREE.Mesh(
        new THREE.CylinderGeometry(0.022, 0.022, 0.18, 8),
        new THREE.MeshStandardMaterial({ color: '#F8FAFC' })
      );
      paper.rotation.x = Math.PI / 2;
      paper.position.z = 0.17;
      const ember = new THREE.Mesh(
        new THREE.SphereGeometry(0.026, 8, 8),
        new THREE.MeshBasicMaterial({ color: '#EF4444' })
      );
      ember.position.z = 0.26;
      cigGroup.add(filter, paper, ember);
      cigGroup.rotation.y = 0.25;
      rig.mouthPropContainer.add(cigGroup);
    } else if (equippedItem === 'water_gun') {
      const gun = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.18, 0.45),
        new THREE.MeshStandardMaterial({ color: '#06B6D4' })
      );
      const tank = new THREE.Mesh(
        new THREE.SphereGeometry(0.14, 12, 12),
        new THREE.MeshStandardMaterial({ color: '#FACC15' })
      );
      tank.position.set(0, 0.14, -0.05);
      gun.add(body, tank);
      rig.handItemContainer.add(gun);
    } else if (equippedItem === 'firework_mortar') {
      const tube = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.14, 0.45, 12),
        new THREE.MeshStandardMaterial({ color: '#DC2626', metalness: 0.4 })
      );
      rig.handItemContainer.add(tube);
    } else if (equippedItem === 'bouncy_ball') {
      const ball = new THREE.Mesh(
        new THREE.SphereGeometry(0.22, 16, 16),
        new THREE.MeshStandardMaterial({ color: '#EC4899', roughness: 0.2 })
      );
      rig.handItemContainer.add(ball);
    } else if (equippedItem === 'money_gun') {
      const mGun = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.18, 0.38),
        new THREE.MeshStandardMaterial({ color: '#D4AF37', metalness: 0.85, roughness: 0.2 })
      );
      rig.handItemContainer.add(mGun);
    } else if (equippedItem === 'champagne') {
      const bottle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.11, 0.46, 12),
        new THREE.MeshStandardMaterial({ color: '#065F46', metalness: 0.5, roughness: 0.2 })
      );
      rig.handItemContainer.add(bottle);
    } else if (equippedItem === 'laser_blaster') {
      const blaster = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.16, 0.48),
        new THREE.MeshStandardMaterial({
          color: '#1E1B4B',
          emissive: '#A855F7',
          emissiveIntensity: 0.6,
        })
      );
      rig.handItemContainer.add(blaster);
    } else if (equippedItem === 'golden_megaphone') {
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(0.22, 0.45, 16),
        new THREE.MeshStandardMaterial({ color: '#D4AF37', metalness: 0.8, roughness: 0.2 })
      );
      cone.rotation.x = -Math.PI / 2;
      rig.handItemContainer.add(cone);
    }
  }
}
