import { useState, Suspense, useMemo, useRef, useEffect, useCallback } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import {
  OrbitControls,
  Grid,
  TransformControls,
  useGLTF,
} from "@react-three/drei";
import * as THREE from "three";
import { motion, AnimatePresence } from "framer-motion";
import api from "../config/api";
import { THEME, ON_PRIMARY } from "./roomPlanner/theme";
import ProductCard from "./roomPlanner/ProductCard";
import CategoryTabs from "./roomPlanner/CategoryTabs";
import SearchBar from "./roomPlanner/SearchBar";

/* ─────────────────── EMOJI MAPPER ─────────────────── */

const getCategoryIcon = (name) => {
  const lowercaseName = (name || "").toLowerCase();
  if (lowercaseName.includes("sofa") || lowercaseName.includes("ghế dài")) return "🛋️";
  if (lowercaseName.includes("bàn") || lowercaseName.includes("table") || lowercaseName.includes("desk")) return "🪑";
  if (lowercaseName.includes("ghế") || lowercaseName.includes("chair")) return "🪑";
  if (lowercaseName.includes("giường") || lowercaseName.includes("bed")) return "🛏️";
  if (lowercaseName.includes("tủ") || lowercaseName.includes("wardrobe") || lowercaseName.includes("cabinet")) return "🚪";
  if (lowercaseName.includes("đèn") || lowercaseName.includes("lamp") || lowercaseName.includes("light")) return "💡";
  if (lowercaseName.includes("kệ") || lowercaseName.includes("shelf") || lowercaseName.includes("bookshelf")) return "📚";
  if (lowercaseName.includes("tranh") || lowercaseName.includes("picture") || lowercaseName.includes("paint")) return "🖼️";
  if (lowercaseName.includes("gương") || lowercaseName.includes("mirror")) return "🪞";
  return "📦";
};

/* ─────────────────── MOCK DATA ─────────────────── */

const MOCK_CATEGORIES = [
  {
    id: "sofa",
    name: "Sofa",
    icon: "🛋️",
    products: [
      {
        id: "sofa1",
        name: "Sofa 3 Chỗ",
        modelUrl:
          "https://nftkjgatwuhodqrtarkb.supabase.co/storage/v1/object/public/uploads/products/models/023d72ae-68af-441e-9f12-08fd98386a7f.glb",
        width: 200,
        height: 80,
        length: 90,
      },
      {
        id: "sofa2",
        name: "Sofa Góc",
        modelUrl:
          "https://nftkjgatwuhodqrtarkb.supabase.co/storage/v1/object/public/uploads/products/models/451794ca-778a-41ef-91d1-2809b3c24251.glb",
        width: 220,
        height: 80,
        length: 160,
      },
    ],
  },
  {
    id: "table",
    name: "Bàn",
    icon: "🪑",
    products: [
      {
        id: "table1",
        name: "Bàn Ăn",
        modelUrl:
          "https://nftkjgatwuhodqrtarkb.supabase.co/storage/v1/object/public/uploads/products/models/85c56a5e-4387-4b29-9691-fbb8f8ac09e7.glb",
        width: 160,
        height: 75,
        length: 90,
      },
    ],
  },
];

/* ─────────────────── ROOM ─────────────────── */

function Room({ width, length, height }) {
  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[width, length]} />
        <meshStandardMaterial color="#c8c4b8" roughness={0.9} />
      </mesh>
      {/* Back wall */}
      <mesh position={[0, height / 2, -length / 2]} receiveShadow>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial color="#e8e0d5" side={THREE.FrontSide} />
      </mesh>
      {/* Front wall – semi-transparent so exterior view isn't blocked */}
      <mesh position={[0, height / 2, length / 2]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial color="#e8e0d5" side={THREE.FrontSide} transparent opacity={0.15} />
      </mesh>
      {/* Left wall */}
      <mesh position={[-width / 2, height / 2, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[length, height]} />
        <meshStandardMaterial color="#ddd6c9" side={THREE.FrontSide} />
      </mesh>
      {/* Right wall */}
      <mesh position={[width / 2, height / 2, 0]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[length, height]} />
        <meshStandardMaterial color="#ddd6c9" side={THREE.FrontSide} />
      </mesh>
      {/* Ceiling */}
      <mesh position={[0, height, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width, length]} />
        <meshStandardMaterial color="#f5f2ee" side={THREE.BackSide} />
      </mesh>
      {/* Baseboard trims */}
      <mesh position={[0, 0.05, -length / 2 + 0.02]}>
        <boxGeometry args={[width, 0.1, 0.04]} />
        <meshStandardMaterial color="#c8bfb2" />
      </mesh>
      <mesh position={[-width / 2 + 0.02, 0.05, 0]}>
        <boxGeometry args={[0.04, 0.1, length]} />
        <meshStandardMaterial color="#c8bfb2" />
      </mesh>
      <mesh position={[width / 2 - 0.02, 0.05, 0]}>
        <boxGeometry args={[0.04, 0.1, length]} />
        <meshStandardMaterial color="#c8bfb2" />
      </mesh>
      {/* Window glass */}
      <mesh position={[0, height * 0.6, -length / 2 + 0.01]}>
        <planeGeometry args={[width * 0.35, height * 0.35]} />
        <meshStandardMaterial color="#a8d4f5" emissive="#b8e0ff" emissiveIntensity={0.3} transparent opacity={0.7} />
      </mesh>
      {/* Window frame */}
      <mesh position={[0, height * 0.6, -length / 2 + 0.015]}>
        <planeGeometry args={[width * 0.37, height * 0.37]} />
        <meshStandardMaterial color="#c8bfb2" />
      </mesh>
    </group>
  );
}

/* ─────────────────── SPATIAL HELPERS (Box3 / AABB math) ───────────────────
 *
 *  All objects are GROUNDED in useGroundedModel(): the inner clone is offset so
 *  that its footprint is centred on the wrapper origin in X/Z and its BOTTOM
 *  sits at the wrapper origin (local y = 0). Therefore:
 *    - item.position is the floor contact point. Keeping position.y = 0 means
 *      the object always rests exactly on the floor (Feature 1).
 *    - The unrotated half-extents (hx, hz) and full height live in dimsMapRef.
 *
 *  computeAABB() rebuilds the world-space Box3 for any (position, rotation,
 *  scale) WITHOUT touching the scene graph, by projecting the oriented box
 *  half-extents onto the world axes. This makes a rotated 2m wardrobe report a
 *  correctly-rotated footprint (Feature 3) and is cheap enough to run every
 *  drag frame.
 */

const _euler = new THREE.Euler();
const _mat = new THREE.Matrix4();

function computeAABB(position, rotation, scale, dims) {
  if (!dims) return null;

  _euler.set(rotation[0] || 0, rotation[1] || 0, rotation[2] || 0);
  _mat.makeRotationFromEuler(_euler);
  const e = _mat.elements; // column-major

  // Scaled local half-extents. dims.height is the FULL height, so half of it.
  const hx = dims.hx * Math.abs(scale[0]);
  const hy = (dims.height / 2) * Math.abs(scale[1]);
  const hz = dims.hz * Math.abs(scale[2]);

  // World half-extents = |R| · localHalfExtents (projection of the OBB).
  const ex = Math.abs(e[0]) * hx + Math.abs(e[4]) * hy + Math.abs(e[8]) * hz;
  const ey = Math.abs(e[1]) * hx + Math.abs(e[5]) * hy + Math.abs(e[9]) * hz;
  const ez = Math.abs(e[2]) * hx + Math.abs(e[6]) * hy + Math.abs(e[10]) * hz;

  // The geometric centre is hy above the (grounded) origin in local space.
  // Rotate that offset so tilted objects are still handled correctly.
  const cx = position[0] + e[4] * hy;
  const cy = position[1] + e[5] * hy;
  const cz = position[2] + e[6] * hy;

  return new THREE.Box3(
    new THREE.Vector3(cx - ex, cy - ey, cz - ez),
    new THREE.Vector3(cx + ex, cy + ey, cz + ez)
  );
}

// AABB overlap test with a small epsilon so objects may sit flush against each
// other (touching faces) without registering as a collision.
function boxesIntersect(a, b, eps = 0.012) {
  return (
    a.min.x < b.max.x - eps && a.max.x > b.min.x + eps &&
    a.min.y < b.max.y - eps && a.max.y > b.min.y + eps &&
    a.min.z < b.max.z - eps && a.max.z > b.min.z + eps
  );
}

/* ─────────────────── GROUNDED MODEL HOOK ───────────────────
 *
 *  Loads the GLB, normalises it to its DB dimensions, GROUNDS it (bottom on
 *  floor, footprint centred), clones materials so highlight tinting can't bleed
 *  into other instances sharing the cached GLTF, and records the resulting
 *  half-extents into dimsMapRef for the spatial constraints.
 */
function useGroundedModel(item, dimsMapRef) {
  const { scene } = useGLTF(item.modelUrl);

  return useMemo(() => {
    const c = scene.clone(true);

    // Unique materials per instance (clone shares geometry+material refs by
    // default) — required so the red collision tint only affects this object.
    c.traverse((o) => {
      if (o.isMesh && o.material) {
        o.material = Array.isArray(o.material)
          ? o.material.map((m) => m.clone())
          : o.material.clone();
      }
    });

    // ── STEP 1 · MEASURE (raw) — the model's size at scale 1 / rotation 0, in
    //   whatever units the GLB was authored in. Flush world matrices FIRST so
    //   Box3 reads final matrices, not stale ones.
    c.position.set(0, 0, 0);
    c.rotation.set(0, 0, 0);
    c.scale.set(1, 1, 1);
    c.updateMatrixWorld(true);
    let box = new THREE.Box3().setFromObject(c);
    const rawSize = box.getSize(new THREE.Vector3());

    // ── STEP 2 · TARGET — DB stores cm, the scene works in METRES, so ÷100.
    //   Axis convention: X = width (sofa length), Y = height, Z = depth.
    const targetSize = {
      width: (item.width || 80) / 100,   // → X
      height: (item.height || 75) / 100, // → Y
      depth: (item.length || 120) / 100, // → Z
    };

    // ── STEP 3 · ORIENT — if the product is clearly elongated on one horizontal
    //   axis but the GLB's long side sits on the OTHER axis, rotate 90° about Y
    //   so the sofa's length lands on X. Rotation MUST happen before the Box3 we
    //   scale from. Square-ish items (width ≈ depth) never trigger this.
    const targetLongX = targetSize.width > targetSize.depth * 1.15;
    const targetLongZ = targetSize.depth > targetSize.width * 1.15;
    const modelLongX = rawSize.x > rawSize.z * 1.05;
    const modelLongZ = rawSize.z > rawSize.x * 1.05;
    if ((targetLongX && modelLongZ) || (targetLongZ && modelLongX)) {
      c.rotation.y = Math.PI / 2;
    }

    // Re-measure AFTER the orientation fix — Box3 comes after the rotation.
    c.updateMatrixWorld(true);
    box = new THREE.Box3().setFromObject(c);
    const size = box.getSize(new THREE.Vector3());

    // ── STEP 4 · UNIFORM SCALE — ONE factor for all three axes so the model's
    //   real proportions are preserved (cushions / arms / back never stretch).
    //   min(ratios) keeps the whole sofa inside the target box without distorting
    //   it. Switch to (targetSize.width / size.x) if matching length is critical.
    const scaleX = targetSize.width / (size.x || 1);
    const scaleY = targetSize.height / (size.y || 1);
    const scaleZ = targetSize.depth / (size.z || 1);
    const uniformScale = Math.min(scaleX, scaleY, scaleZ);
    c.scale.setScalar(uniformScale); // model ROOT only — child meshes keep their
                                     // relative transforms, so nothing warps.

    // ── STEP 5 · GROUND — re-measure post-scale, centre the footprint on X/Z and
    //   drop the BOTTOM onto the floor (y = 0). Use box.min.y, not the box centre.
    //   All in the wrapper-local frame (the wrapper sits at the origin).
    c.updateMatrixWorld(true);
    box = new THREE.Box3().setFromObject(c);
    const finalSize = box.getSize(new THREE.Vector3());
    const finalCenter = box.getCenter(new THREE.Vector3());
    c.position.x -= finalCenter.x;
    c.position.z -= finalCenter.z;
    c.position.y -= box.min.y;
    c.updateMatrixWorld(true);

    const wrapper = new THREE.Group();
    wrapper.add(c);

    const dims = { hx: finalSize.x / 2, hz: finalSize.z / 2, height: finalSize.y };
    if (dimsMapRef) dimsMapRef.current[item.id] = dims;

    return { object: wrapper, dims };
  }, [scene, item.id, item.width, item.height, item.length, dimsMapRef]);
}

/* ─────────────────── MODEL (non-selected) ─────────────────── */

function Model({ item, onSelect, dimsMapRef }) {
  const { object } = useGroundedModel(item, dimsMapRef);

  return (
    <primitive
      object={object}
      position={item.position}
      rotation={item.rotation}
      scale={item.scale}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(item.id);
      }}
    />
  );
}

/* ─────────────────── TRANSFORM WRAPPER ─────────────────── */
//
// ROOT-CAUSE of the snap-back bug (now fixed):
//
//   drei <TransformControls> renders:
//     <primitive object={controls} />
//     <group ref={group}>{children}</group>
//   and calls  controls.attach(group.current)
//
//   So when the user drags, Three.js TransformControls modifies the GROUP's
//   position/rotation/scale — NOT the <primitive> child's.
//
//   OLD (BROKEN) code set the initial position on meshRef (the primitive)
//   and read meshRef.position in objectChange. Since TransformControls
//   never touches the primitive, meshRef.position always returned the
//   ORIGINAL position → liveTransform always had the old values → lock
//   saved the old position → snap-back.
//
//   FIX: We now read/write the GROUP via  transformRef.current.object
//   (which is the group that TransformControls is attached to).
//   Initial position is set on the GROUP, primitive stays at origin.
//   objectChange reads from the GROUP. Everything is consistent.
//

function copyTransform(source) {
  return {
    position: [...source.position],
    rotation: [...source.rotation],
    scale: [...source.scale],
  };
}

function TransformWrapper({
  item,
  mode,
  onSelect,
  onUpdate,
  liveTransformMapRef,
  orbitControlsRef,
  dimsMapRef,
  otherObjects,
  roomWidth,
  roomLength,
}) {
  const transformRef = useRef();
  const { object: cloned, dims } = useGroundedModel(item, dimsMapRef);

  // Always up-to-date transform — written to on every objectChange frame.
  const liveTransform = useRef(copyTransform(item));
  // Last position that was BOTH inside the room AND collision-free. We revert
  // here if the drag is released on an invalid spot.
  const lastValidRef = useRef(copyTransform(item));
  // AABBs of every OTHER object, snapshotted at drag start (they don't move
  // while we drag this one).
  const otherBoxesRef = useRef([]);
  // Keep the latest otherObjects list reachable inside event handlers without
  // re-binding listeners mid-drag.
  const otherObjectsRef = useRef(otherObjects);
  otherObjectsRef.current = otherObjects;

  /* ── Collision highlight (red emissive), applied imperatively so we don't
        re-render the React tree every drag frame. ── */
  const materialsRef = useRef([]);
  const invalidRef = useRef(false);

  useEffect(() => {
    const mats = [];
    cloned.traverse((o) => {
      if (!o.isMesh) return;
      const list = Array.isArray(o.material) ? o.material : [o.material];
      list.forEach((m) => {
        if (m && m.emissive) {
          mats.push({ mat: m, emissive: m.emissive.clone(), intensity: m.emissiveIntensity ?? 1 });
        }
      });
    });
    materialsRef.current = mats;
    return () => {
      // Restore originals if this instance unmounts mid-highlight.
      mats.forEach(({ mat, emissive, intensity }) => {
        mat.emissive.copy(emissive);
        mat.emissiveIntensity = intensity;
      });
    };
  }, [cloned]);

  const setInvalid = useCallback((on) => {
    if (invalidRef.current === on) return;
    invalidRef.current = on;
    materialsRef.current.forEach(({ mat, emissive, intensity }) => {
      if (on) {
        mat.emissive.setRGB(0.65, 0.04, 0.04);
        mat.emissiveIntensity = 0.55;
      } else {
        mat.emissive.copy(emissive);
        mat.emissiveIntensity = intensity;
      }
    });
  }, []);

  /* ── Runs on every drag frame: clamp to the room walls, test collisions,
        highlight + remember the last valid pose. ── */
  const syncLiveTransform = useCallback(() => {
    const object = transformRef.current?.object;
    if (!object) return liveTransform.current;

    const myDims = dimsMapRef.current[item.id] || dims;
    const rotation = [object.rotation.x, object.rotation.y, object.rotation.z];
    const scale = object.scale.toArray();
    let position = object.position.toArray();

    // FEATURE 2 — Room boundary. Build the world AABB and shove it back inside
    // the walls (floor is centred on the origin: x∈[-W/2,W/2], z∈[-L/2,L/2]).
    let box = computeAABB(position, rotation, scale, myDims);
    if (box) {
      const halfW = roomWidth / 2;
      const halfL = roomLength / 2;
      let dx = 0;
      let dz = 0;
      if (box.min.x < -halfW) dx = -halfW - box.min.x;
      else if (box.max.x > halfW) dx = halfW - box.max.x;
      if (box.min.z < -halfL) dz = -halfL - box.min.z;
      else if (box.max.z > halfL) dz = halfL - box.max.z;

      if (dx !== 0 || dz !== 0) {
        object.position.x += dx;
        object.position.z += dz;
        position = object.position.toArray();
        box = computeAABB(position, rotation, scale, myDims);
      }
    }

    // FEATURE 3 — Collision. Test the clamped AABB against the snapshot of all
    // other objects. We don't hard-block the gizmo (that fights TransformControls
    // and feels janky); instead we tint red and revert on release.
    let collides = false;
    if (box) {
      for (const other of otherBoxesRef.current) {
        if (boxesIntersect(box, other)) {
          collides = true;
          break;
        }
      }
    }
    setInvalid(collides);

    const nextTransform = { position, rotation, scale };
    liveTransform.current = nextTransform;
    liveTransformMapRef.current[item.id] = nextTransform;
    if (!collides) lastValidRef.current = nextTransform;
    return nextTransform;
  }, [item.id, dims, dimsMapRef, liveTransformMapRef, roomWidth, roomLength, setInvalid]);

  // Seed parent map immediately so toggleLock can read even before any drag.
  useEffect(() => {
    const nextTransform = {
      position: [...item.position],
      rotation: [...item.rotation],
      scale: [...item.scale],
    };
    liveTransform.current = nextTransform;
    lastValidRef.current = nextTransform;
    liveTransformMapRef.current[item.id] = nextTransform;
  }, [item.id, item.position, item.rotation, item.scale, liveTransformMapRef]);

  // Listen for dragging-changed (drag start / end).
  useEffect(() => {
    const controls = transformRef.current;
    if (!controls) return;
    const orbitControls = orbitControlsRef.current;

    const handleDraggingChanged = (e) => {
      if (orbitControlsRef.current) {
        orbitControlsRef.current.enabled = !e.value;
      }

      if (e.value) {
        // Drag START — snapshot every other object's AABB once.
        otherBoxesRef.current = otherObjectsRef.current
          .map((o) => computeAABB(o.position, o.rotation, o.scale, dimsMapRef.current[o.id]))
          .filter(Boolean);
        lastValidRef.current = liveTransform.current;
      } else {
        // Drag END — if we're sitting on an invalid (overlapping) spot, snap
        // back to the last valid pose; otherwise commit.
        if (invalidRef.current) {
          const lv = lastValidRef.current;
          const object = transformRef.current?.object;
          if (object) {
            object.position.set(lv.position[0], lv.position[1], lv.position[2]);
            object.rotation.set(lv.rotation[0], lv.rotation[1], lv.rotation[2]);
            object.scale.set(lv.scale[0], lv.scale[1], lv.scale[2]);
          }
          liveTransform.current = lv;
          liveTransformMapRef.current[item.id] = lv;
          setInvalid(false);
          onUpdate(item.id, lv);
        } else {
          onUpdate(item.id, syncLiveTransform());
        }
      }
    };

    controls.addEventListener("dragging-changed", handleDraggingChanged);
    return () => {
      if (orbitControls) {
        orbitControls.enabled = true;
      }
      controls.removeEventListener("dragging-changed", handleDraggingChanged);
    };
  }, [item.id, onUpdate, orbitControlsRef, dimsMapRef, liveTransformMapRef, syncLiveTransform, setInvalid]);

  return (
    <TransformControls
      ref={transformRef}
      mode={mode}
      position={item.position}
      rotation={item.rotation}
      scale={item.scale}
      onObjectChange={syncLiveTransform}
    >
      <primitive
        object={cloned}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(item.id);
        }}
      />
    </TransformControls>
  );
}

/* ─────────────────── CAMERA FIT HELPERS ───────────────────
 *
 *  Both cameras are framed from the ROOM dimensions (never a product's bounding
 *  box) with a moderate FOV (≤50°) so furniture near the lens isn't
 *  perspective-exaggerated. The exterior distance is solved from the room's
 *  bounding sphere so the whole room fits whatever the sliders are set to.
 */
const EXTERIOR_FOV = 48;
const INTERIOR_FOV = 50;

function fitExteriorCamera(W, L, H) {
  const radius = 0.5 * Math.sqrt(W * W + H * H + L * L);
  const dist = (radius / Math.sin((EXTERIOR_FOV * 0.5 * Math.PI) / 180)) * 1.15;
  const dx = 0.66, dy = 0.36, dz = 0.66; // diagonal view, slightly raised
  const dl = Math.sqrt(dx * dx + dy * dy + dz * dz);
  return {
    fov: EXTERIOR_FOV,
    position: [(dx / dl) * dist, H * 0.5 + (dy / dl) * dist, (dz / dl) * dist],
    target: [0, H * 0.45, 0],
  };
}

function fitInteriorCamera(W, L, H) {
  return {
    fov: INTERIOR_FOV,
    position: [0, H * 0.5, L * 0.48], // just inside the front wall
    target: [0, H * 0.42, -L * 0.15],
  };
}

/* ─────────────────── CAMERA CONTROLLER ─────────────────── */

function CameraController({ viewMode, roomWidth, roomLength, roomHeight, controlsRef }) {
  const { camera } = useThree();

  useEffect(() => {
    // Clip planes sized for a metres-scale scene.
    camera.near = 0.1;
    camera.far = 100;

    const cfg =
      viewMode === "exterior"
        ? fitExteriorCamera(roomWidth, roomLength, roomHeight)
        : fitInteriorCamera(roomWidth, roomLength, roomHeight);

    camera.position.set(cfg.position[0], cfg.position[1], cfg.position[2]);
    camera.fov = cfg.fov;
    camera.updateProjectionMatrix();
    camera.lookAt(cfg.target[0], cfg.target[1], cfg.target[2]);
    if (controlsRef.current) {
      controlsRef.current.target.set(cfg.target[0], cfg.target[1], cfg.target[2]);
      controlsRef.current.update();
    }
  }, [viewMode, roomWidth, roomLength, roomHeight, camera, controlsRef]);

  return null;
}

/* ─────────────────── SLIDER ─────────────────── */

function Slider({ label, value, min, max, step, onChange, unit = "m" }) {
  const percent = ((value - min) / (max - min)) * 100;
  return (
    <div className="mb-4">
      <div className="flex justify-between text-[13px] mb-1.5 text-amber-200/80">
        <span>{label}</span>
        <span className="font-semibold text-amber-100">{value}{unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="r3d-range w-full cursor-pointer accent-amber-400"
        style={{
          background: `linear-gradient(to right, #f59e0b ${percent}%, #44403c ${percent}%)`,
        }}
      />
    </div>
  );
}

/* ─────────────────── RESPONSIVE HOOK ───────────────────
 *
 *  Single source of truth for the layout. Three tiers:
 *    mobile  < 768px   → topbar + full-bleed canvas + bottom nav; panels are
 *                        a left drawer (controls) and a bottom sheet (catalog).
 *    tablet  768–1024  → 280px sidebar + canvas + compact catalog bar.
 *    desktop > 1024px  → 320px sidebar + canvas + catalog bar.
 *
 *  Resize is debounced through requestAnimationFrame so dragging the window
 *  edge doesn't thrash React state.
 */
const MOBILE_MAX = 768;
const TABLET_MAX = 1024;

function readBreakpoint() {
  const w = typeof window !== "undefined" ? window.innerWidth : 1280;
  if (w < MOBILE_MAX) return "mobile";
  if (w < TABLET_MAX) return "tablet";
  return "desktop";
}

function useBreakpoint() {
  const [bp, setBp] = useState(readBreakpoint);
  useEffect(() => {
    let raf = 0;
    const onResize = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setBp(readBreakpoint()));
    };
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, []);
  return {
    bp,
    isMobile: bp === "mobile",
    isTablet: bp === "tablet",
    isDesktop: bp === "desktop",
  };
}

/* ─────────────────── OVERLAY SHELLS (mobile) ───────────────────
 *
 *  Drawer (left) and BottomSheet, both transform-animated (GPU friendly) and
 *  swipe-to-dismiss via framer-motion drag. They mount only while open so the
 *  heavy panel content isn't rendered behind the scenes (lazy).
 */
const SHEET_EASE = [0.22, 1, 0.36, 1];

// Shared overlay close button.
function SheetClose({ onClose }) {
  return (
    <button
      onClick={onClose}
      aria-label="Đóng"
      className="w-11 h-11 -mr-2 flex items-center justify-center rounded-lg text-stone-400 hover:text-white text-xl leading-none"
    >
      ✕
    </button>
  );
}

function Drawer({ open, onClose, title, children }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div key="drawer" className="fixed inset-0 z-40">
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/60"
            style={{ backdropFilter: "blur(2px)", WebkitBackdropFilter: "blur(2px)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          {/* Panel */}
          <motion.aside
            className="absolute inset-y-0 left-0 flex flex-col bg-stone-950 border-r border-amber-900/30 shadow-2xl"
            style={{
              width: "min(80vw, 320px)",
              paddingTop: "env(safe-area-inset-top)",
              paddingBottom: "env(safe-area-inset-bottom)",
            }}
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "tween", ease: SHEET_EASE, duration: 0.3 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={{ left: 0.4, right: 0 }}
            onDragEnd={(_, info) => info.offset.x < -60 && onClose()}
          >
            <div className="flex items-center justify-between px-4 h-14 border-b border-amber-900/30 shrink-0">
              <span className="text-sm font-bold tracking-widest uppercase text-amber-400">{title}</span>
              <SheetClose onClose={onClose} />
            </div>
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">{children}</div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function BottomSheet({ open, onClose, title, children }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div key="sheet" className="fixed inset-0 z-40">
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/60"
            style={{ backdropFilter: "blur(2px)", WebkitBackdropFilter: "blur(2px)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          {/* Sheet */}
          <motion.div
            className="absolute inset-x-0 bottom-0 flex flex-col bg-stone-950 border-t border-amber-900/30 rounded-t-2xl shadow-2xl"
            style={{ maxHeight: "min(78vh, 600px)", paddingBottom: "env(safe-area-inset-bottom)" }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "tween", ease: SHEET_EASE, duration: 0.3 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={(_, info) => info.offset.y > 90 && onClose()}
          >
            <div className="flex justify-center pt-2.5 pb-1 shrink-0 cursor-grab active:cursor-grabbing">
              <span className="w-10 h-1.5 rounded-full bg-stone-700" />
            </div>
            <div className="flex items-center justify-between px-5 pb-2.5 shrink-0">
              <span className="text-sm font-bold tracking-widest uppercase text-amber-400">{title}</span>
              <SheetClose onClose={onClose} />
            </div>
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ─────────────────── MAIN ─────────────────── */

export default function RoomPlanner() {
  const { isMobile, isTablet } = useBreakpoint();
  const [drawerOpen, setDrawerOpen] = useState(false);   // mobile: control-panel drawer
  const [catalogOpen, setCatalogOpen] = useState(false); // mobile: catalog bottom sheet
  // Room size in METRES (1 Three.js unit = 1 m). Defaults to the reference
  // room: Rộng (X) 2.5 · Dài (Z) 3 · Cao (Y) 3.
  const [width, setWidth] = useState(2.5);
  const [length, setLength] = useState(3);
  const [height, setHeight] = useState(3);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedObject, setSelectedObject] = useState(null);
  const [transformMode, setTransformMode] = useState("translate");
  const [objects, setObjects] = useState([]);
  const [viewMode, setViewMode] = useState("exterior");
  const [sidebarTab, setSidebarTab] = useState("room");
  // UX: collapsible left sidebar + bottom catalog panel, and product search.
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [bottomCollapsed, setBottomCollapsed] = useState(false);
  const [search, setSearch] = useState("");
  const controlsRef = useRef();

  // Load catalog on mount
  useEffect(() => {
    api.get("/api/room-planner/catalog")
      .then((res) => {
        if (res.data && res.data.length > 0) {
          const fetchedCategories = res.data.map((cat) => ({
            id: cat.id || cat.categoryId,
            name: cat.name || cat.categoryName,
            icon: getCategoryIcon(cat.name || cat.categoryName || ""),
            products: (cat.products || []).map((prod) => ({
              id: prod.id || prod.productId,
              name: prod.name || prod.productName,
              modelUrl: prod.modelUrl || prod.arLink,
              image:
                (prod.imageUrls && prod.imageUrls[0]) ||
                prod.image ||
                prod.imageUrl ||
                prod.thumbnail ||
                null,
              price: prod.price != null ? Number(prod.price) : null,
              discount: prod.discount != null ? Number(prod.discount) : null,
              size: prod.size || null,
              width: Number(prod.width) || 80,
              height: Number(prod.height) || 75,
              length: Number(prod.length) || 120,
            })),
          }));
          setCategories(fetchedCategories);
          setSelectedCategory(fetchedCategories[0]);
        } else {
          setCategories(MOCK_CATEGORIES);
          setSelectedCategory(MOCK_CATEGORIES[0]);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load catalog from backend, using mock data:", err);
        setCategories(MOCK_CATEGORIES);
        setSelectedCategory(MOCK_CATEGORIES[0]);
        setLoading(false);
      });
  }, []);

  // Collapse mobile overlays the moment we grow into the tablet/desktop layout
  // (where the sidebar + catalog bar are always visible).
  useEffect(() => {
    if (!isMobile) {
      setDrawerOpen(false);
      setCatalogOpen(false);
    }
  }, [isMobile]);

  // ★ Shared ref map: TransformWrapper writes here on every objectChange
  //   so that toggleLock can read the latest Three.js transform at any time.
  const liveTransformMapRef = useRef({});

  // ★ Footprint dimensions per object { hx, hz, height } in meters, written by
  //   useGroundedModel once each GLB has loaded. Used for boundary + collision.
  const dimsMapRef = useRef({});

  const updateObject = useCallback((id, transform) => {
    setObjects((prev) =>
      prev.map((obj) => (obj.id === id ? { ...obj, ...transform } : obj))
    );
  }, []);

  const addProduct = (product) => {
    // Stagger new items in a small grid AROUND the room centre (the floor is
    // centred on the origin). y stays 0 — useGroundedModel rests the object's
    // bottom exactly on the floor. Drag constraints handle the rest.
    const i = objects.length;
    const gx = ((i % 3) - 1) * 0.8;
    const gz = (((Math.floor(i / 3)) % 3) - 1) * 0.8;
    setObjects((prev) => [
      ...prev,
      {
        id: Date.now(),
        name: product.name,
        modelUrl: product.modelUrl,
        position: [gx, 0, gz],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        locked: false,
        width: product.width,
        height: product.height,
        length: product.length,
      },
    ]);
  };

  // ★ FIX: toggleLock reads the live transform from liveTransformMapRef
  //   and saves BOTH the transform AND the locked flag in ONE setObjects call.
  const toggleLock = () => {
    if (!selectedObject) return;

    setObjects((prev) =>
      prev.map((obj) => {
        if (obj.id !== selectedObject) return obj;

        const newLocked = !obj.locked;

        if (newLocked) {
          const liveT = liveTransformMapRef.current[obj.id] ?? copyTransform(obj);
          return {
            ...obj,
            position: [...liveT.position],
            rotation: [...liveT.rotation],
            scale: [...liveT.scale],
            locked: true,
          };
        }

        return { ...obj, locked: newLocked };
      })
    );
  };

  const deleteSelected = () => {
    if (!selectedObject) return;
    delete liveTransformMapRef.current[selectedObject];
    delete dimsMapRef.current[selectedObject];
    setObjects((prev) => prev.filter((x) => x.id !== selectedObject));
    setSelectedObject(null);
  };

  const duplicateSelected = () => {
    if (!selectedObject) return;
    const obj = objects.find((x) => x.id === selectedObject);
    if (!obj) return;
    setObjects((prev) => [
      ...prev,
      {
        ...obj,
        id: Date.now(),
        position: [obj.position[0] + 0.5, obj.position[1], obj.position[2] + 0.5],
      },
    ]);
  };

  const tools = [
    { mode: "translate", icon: "✋", label: "Di chuyển" },
    { mode: "rotate",    icon: "🔄", label: "Xoay" },
    { mode: "scale",     icon: "⤢",  label: "Kích cỡ" },
  ];

  /* ── Layout metrics per breakpoint — single source of truth for the CSS grid.
        Mobile rows fold the iOS safe-area insets into the track sizes so the
        topbar/bottom-nav clear the notch & home indicator without overflowing. ── */
  const SIDEBAR_W = isTablet ? 280 : 320;
  const SIDEBAR_COLLAPSED_W = 60;
  const TOPBAR_H = isMobile ? 52 : 56;
  // Bottom catalog bar is tall (shows a grid of vertical product cards) →
  // collapsible. Height fits one full row (card 340 + grid & header padding).
  const BOTTOM_H = isTablet ? 452 : 476;
  const BOTTOM_COLLAPSED_H = 56;
  const sidebarW = leftCollapsed ? SIDEBAR_COLLAPSED_W : SIDEBAR_W;
  const bottomH = bottomCollapsed ? BOTTOM_COLLAPSED_H : BOTTOM_H;
  const layoutStyle = isMobile
    ? {
        gridTemplateRows: `calc(${TOPBAR_H}px + env(safe-area-inset-top)) 1fr calc(64px + env(safe-area-inset-bottom))`,
        gridTemplateColumns: "1fr",
        gridTemplateAreas: '"topbar" "canvas" "bottom"',
      }
    : {
        gridTemplateRows: `${TOPBAR_H}px 1fr ${bottomH}px`,
        gridTemplateColumns: `${sidebarW}px 1fr`,
        gridTemplateAreas: '"topbar topbar" "sidebar canvas" "bottom bottom"',
        // Smoothly animate both collapses via the grid tracks (300ms).
        transition:
          "grid-template-rows 300ms ease, grid-template-columns 300ms ease",
      };

  // Tab icons kept visible in the collapsed sidebar rail.
  const railTabs = [
    { id: "room", icon: "📐", label: "Phòng" },
    { id: "tools", icon: "🎮", label: "Công cụ" },
    { id: "objects", icon: "📦", label: "Vật thể", badge: objects.length },
  ];

  // Open the control panel (mobile drawer) focused on a given tab.
  const openPanel = (tab) => {
    setSidebarTab(tab);
    setDrawerOpen(true);
  };

  /* ── Control panel (Room / Tools / Objects). Shared verbatim by the desktop
        sidebar and the mobile drawer. `dense` = compact desktop type scale;
        mobile bumps body copy to ≥14px and pads tap targets to 44px. ── */
  const controlPanel = (dense) => {
    const secLabel = dense ? "text-[9px]" : "text-[11px]";
    const body = dense ? "text-xs" : "text-sm";
    const micro = dense ? "text-[11px]" : "text-[13px]";
    const tap = dense ? "" : "min-h-[44px]";
    return (
      <>
        {/* Tabs */}
        <div className="flex border-b border-amber-900/30 bg-stone-900/40 shrink-0">
          {[
            { id: "room",    icon: "📐", label: "PHÒNG" },
            { id: "tools",   icon: "🎮", label: "CÔNG CỤ" },
            { id: "objects", icon: "📦", label: `DS (${objects.length})` },
          ].map((tb) => (
            <button
              key={tb.id}
              onClick={() => setSidebarTab(tb.id)}
              className={`flex-1 flex flex-col items-center gap-0.5 ${dense ? "py-2.5 text-[10px]" : "py-3 text-xs"} font-semibold tracking-widest border-b-2 transition-all ${
                sidebarTab === tb.id
                  ? "text-amber-400 border-amber-400"
                  : "text-stone-500 border-transparent hover:text-stone-300"
              }`}
            >
              <span className="text-base">{tb.icon}</span>
              {tb.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden r3d-scroll">
          {/* ── ROOM TAB ── */}
          {sidebarTab === "room" && (
            <div className={dense ? "p-4" : "p-5"}>
              <p className={`${secLabel} font-bold tracking-[.14em] uppercase text-stone-500 mb-3 flex items-center gap-2`}>
                Kích Thước Phòng <span className="flex-1 h-px bg-amber-900/30" />
              </p>
              <Slider label="Chiều rộng" value={width}  min={2} max={15} step={0.5} onChange={setWidth} />
              <Slider label="Chiều dài"  value={length} min={2} max={20} step={0.5} onChange={setLength} />
              <Slider label="Chiều cao"  value={height} min={2} max={6}  step={0.1} onChange={setHeight} />

              <div className="mt-3 rounded-lg border border-amber-900/30 p-3" style={{ background: "linear-gradient(135deg,rgba(74,62,48,.3),rgba(26,20,16,.5))" }}>
                <div className="grid grid-cols-3 gap-1.5 mb-2.5">
                  {[
                    { val: width,  lbl: "Rộng (m)" },
                    { val: length, lbl: "Dài (m)" },
                    { val: height, lbl: "Cao (m)" },
                  ].map((d) => (
                    <div key={d.lbl} className="text-center rounded bg-white/[.03] border border-amber-900/20 py-1.5">
                      <div className="text-base font-bold text-white leading-none">{d.val}</div>
                      <div className={`${micro} text-stone-500 mt-1`}>{d.lbl}</div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-around pt-2 border-t border-amber-900/20">
                  <div className="text-center">
                    <div className="text-sm font-bold text-amber-400">{(width * length).toFixed(1)}</div>
                    <div className={`${micro} text-stone-500`}>m² sàn</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-bold text-amber-400">{(width * length * height).toFixed(1)}</div>
                    <div className={`${micro} text-stone-500`}>m³ thể tích</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── TOOLS TAB ── */}
          {sidebarTab === "tools" && (() => {
            const selObj = objects.find((o) => o.id === selectedObject);
            const isLocked = selObj?.locked ?? false;
            return (
              <div className={dense ? "p-4" : "p-5"}>
                <p className={`${secLabel} font-bold tracking-[.14em] uppercase text-stone-500 mb-3 flex items-center gap-2`}>
                  Chỉnh Sửa Đối Tượng <span className="flex-1 h-px bg-amber-900/30" />
                </p>

                {selObj && (
                  <div className={`mb-3 p-3 rounded-lg border border-amber-900/30 bg-stone-900/40 ${body} text-stone-300`}>
                    <div className="font-semibold text-amber-400 mb-1.5 truncate">{selObj.name}</div>
                    <div className={`grid grid-cols-3 gap-1 ${micro} text-stone-400`}>
                      <div>Rộng: <strong className="text-white">{selObj.width || 80}cm</strong></div>
                      <div>Cao: <strong className="text-white">{selObj.height || 75}cm</strong></div>
                      <div>Dài: <strong className="text-white">{selObj.length || 120}cm</strong></div>
                    </div>
                  </div>
                )}

                <button
                  onClick={toggleLock}
                  disabled={!selectedObject}
                  className={`w-full flex items-center justify-center gap-2 py-2.5 ${tap} rounded-lg border ${body} font-semibold mb-3 transition-all disabled:opacity-30 disabled:cursor-not-allowed`}
                  style={
                    isLocked
                      ? { background: "rgba(212,168,83,.18)", borderColor: "rgba(212,168,83,.55)", color: "#f5c842", boxShadow: "0 0 10px rgba(212,168,83,.15)" }
                      : { background: "rgba(255,255,255,.03)", borderColor: "rgba(255,255,255,.12)", color: "#a8a29e" }
                  }
                >
                  <span className="text-base">{isLocked ? "🔒" : "🔓"}</span>
                  {isLocked ? "Đã khoá vị trí · mở khoá" : "Khoá vị trí"}
                </button>

                {isLocked && (
                  <div className={`mb-3 p-2.5 rounded-lg border border-amber-400/25 ${micro} text-amber-300/70 text-center leading-relaxed`}
                       style={{ background: "rgba(212,168,83,.07)" }}>
                    🔒 Đối tượng đang bị khoá<br />
                    <span className="text-stone-500">Mở khoá để di chuyển / xoay / scale</span>
                  </div>
                )}

                <div className={"grid grid-cols-3 gap-1.5 mb-3 transition-opacity" + (isLocked ? " opacity-30 pointer-events-none" : "")}>
                  {tools.map((t) => (
                    <button
                      key={t.mode}
                      onClick={() => setTransformMode(t.mode)}
                      className={`flex flex-col items-center gap-1 py-2.5 ${tap} rounded-lg border ${dense ? "text-[10px]" : "text-xs"} font-medium transition-all ` + (
                        transformMode === t.mode
                          ? "border-amber-400 text-amber-400"
                          : "border-amber-900/25 text-stone-400 hover:border-amber-700/50 hover:text-stone-200"
                      )}
                      style={
                        transformMode === t.mode
                          ? { background: "linear-gradient(135deg,rgba(212,168,83,.22),rgba(201,107,58,.14))", boxShadow: "0 0 10px rgba(212,168,83,.15)" }
                          : { background: "rgba(255,255,255,.02)" }
                      }
                    >
                      <span className="text-lg">{t.icon}</span>
                      {t.label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={duplicateSelected}
                    disabled={!selectedObject}
                    className={`flex items-center justify-center gap-1.5 py-2.5 ${tap} rounded-lg border ${body} font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed`}
                    style={{ background: "rgba(122,158,126,.1)", borderColor: "rgba(122,158,126,.3)", color: "#9dc5a0" }}
                  >
                    ⧉ Nhân đôi
                  </button>
                  <button
                    onClick={deleteSelected}
                    disabled={!selectedObject}
                    className={`flex items-center justify-center gap-1.5 py-2.5 ${tap} rounded-lg border ${body} font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed`}
                    style={{ background: "rgba(201,107,58,.1)", borderColor: "rgba(201,107,58,.3)", color: "#e09070" }}
                  >
                    🗑️ Xóa
                  </button>
                </div>

                {!selectedObject && (
                  <div className={`mt-3 p-2.5 rounded-lg border border-amber-900/20 bg-white/[.02] ${micro} text-stone-500 text-center leading-relaxed`}>
                    Chạm vào đối tượng 3D<br />để chọn và chỉnh sửa
                  </div>
                )}
              </div>
            );
          })()}

          {/* ── OBJECTS TAB ── */}
          {sidebarTab === "objects" && (
            <div className={dense ? "p-3" : "p-4"}>
              {objects.length === 0 ? (
                <div className={`text-center py-7 text-stone-500 ${body} leading-loose`}>
                  <div className="text-3xl mb-2 opacity-40">🪑</div>
                  <div>Chưa có nội thất nào</div>
                  <div className={`${micro} mt-1`}>Thêm sản phẩm từ mục Nội thất</div>
                </div>
              ) : (
                objects.map((obj, index) => (
                  <div
                    key={obj.id}
                    onClick={() => setSelectedObject(selectedObject === obj.id ? null : obj.id)}
                    className={`flex items-center gap-2.5 px-2.5 ${dense ? "py-2" : "py-3"} rounded-lg border mb-1 cursor-pointer transition-all ${
                      selectedObject === obj.id
                        ? "border-amber-400/40 bg-amber-400/10"
                        : "border-transparent hover:border-amber-900/30 hover:bg-white/[.02]"
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded flex items-center justify-center text-[11px] font-bold shrink-0 ${
                        selectedObject === obj.id ? "text-stone-950" : "text-stone-500"
                      }`}
                      style={selectedObject === obj.id ? { background: "#d4a853" } : { background: "#292524" }}
                    >
                      {index + 1}
                    </div>
                    <span className={`${body} flex-1 truncate ` + (selectedObject === obj.id ? "text-white" : "text-stone-400")}>
                      {obj.name}
                    </span>
                    {obj.locked && <span className="text-[13px] shrink-0" title="Đã khoá">🔒</span>}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </>
    );
  };

  /* ── Product catalog ──────────────────────────────────────────────────────
        Products of the selected category, filtered by the search query. Cards
        are vertical (asset-browser style); the grid auto-fills as many 220px
        columns as fit, with a 20px gutter. ── */
  const filteredProducts = useMemo(() => {
    const list = selectedCategory?.products || [];
    const q = search.trim().toLowerCase();
    return q ? list.filter((p) => (p.name || "").toLowerCase().includes(q)) : list;
  }, [selectedCategory, search]);

  const handleAddProduct = (product) => {
    addProduct(product);
    if (isMobile) setCatalogOpen(false);
  };

  // Responsive auto-fill product grid — shared by the bottom bar and mobile sheet.
  const renderProductGrid = () => (
    <div
      className="flex-1 min-h-0 overflow-y-auto r3d-scroll"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
        gap: 20,
        padding: 20,
        alignContent: "start",
      }}
    >
      {loading ? (
        Array.from({ length: 8 }).map((_, n) => (
          <div
            key={n}
            className="rounded-2xl border animate-pulse"
            style={{ height: 340, background: THEME.panel, borderColor: THEME.border }}
          />
        ))
      ) : filteredProducts.length > 0 ? (
        filteredProducts.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            categoryName={selectedCategory?.name}
            onAdd={handleAddProduct}
          />
        ))
      ) : (
        <div
          className="col-span-full text-center py-8 text-sm"
          style={{ color: THEME.secondary }}
        >
          {search ? "Không tìm thấy sản phẩm phù hợp" : "Không có sản phẩm nào"}
        </div>
      )}
    </div>
  );

  // Mobile catalog (inside the bottom sheet): categories + search + grid.
  const catalogSheet = (
    <div className="flex flex-col min-h-0 h-full">
      <div
        className="px-4 pt-1 pb-2.5 shrink-0 flex flex-col gap-2.5 border-b"
        style={{ borderColor: THEME.border }}
      >
        <CategoryTabs
          categories={categories}
          selectedId={selectedCategory?.id}
          onSelect={setSelectedCategory}
          loading={loading}
        />
        <SearchBar value={search} onChange={setSearch} />
      </div>
      {renderProductGrid()}
    </div>
  );

  // Mobile bottom navigation → opens the control drawer (per tab) or catalog sheet.
  const bottomNav = (
    <nav
      style={{ gridArea: "bottom", paddingBottom: "env(safe-area-inset-bottom)" }}
      className="flex items-stretch border-t border-amber-900/30 bg-stone-950/98 z-30"
    >
      {[
        { id: "room",    icon: "📐", label: "Phòng",   onClick: () => openPanel("room") },
        { id: "tools",   icon: "🎮", label: "Công cụ", onClick: () => openPanel("tools") },
        { id: "objects", icon: "📦", label: "Vật thể", onClick: () => openPanel("objects"), badge: objects.length },
        { id: "catalog", icon: "🛋️", label: "Nội thất", onClick: () => setCatalogOpen(true), primary: true },
      ].map((item) => (
        <button
          key={item.id}
          onClick={item.onClick}
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[44px] text-[11px] font-medium transition-colors ${
            item.primary ? "text-amber-400" : "text-stone-400 active:text-amber-300"
          }`}
        >
          <span className="relative text-xl leading-none">
            {item.icon}
            {item.badge ? (
              <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-amber-500 text-stone-950 text-[9px] font-bold flex items-center justify-center">
                {item.badge}
              </span>
            ) : null}
          </span>
          {item.label}
        </button>
      ))}
    </nav>
  );

  // Initial camera frame — r3f reads the `camera` prop once on mount; the
  // CameraController then refines it on every viewMode / room-size change.
  const initialCam =
    viewMode === "interior"
      ? fitInteriorCamera(width, length, height)
      : fitExteriorCamera(width, length, height);

  return (
    <div
      className="h-screen overflow-hidden text-white"
      style={{
        height: "100dvh",
        display: "grid",
        ...layoutStyle,
        background: THEME.bg,
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      {/* ── TOPBAR (sticky — never scrolls; lives in its own grid row) ── */}
      <header
        style={{ gridArea: "topbar", paddingTop: isMobile ? "env(safe-area-inset-top)" : undefined }}
        className="flex items-center justify-between gap-2 px-3 sm:px-5 border-b border-amber-900/30 bg-stone-950/95 z-30"
      >
        {/* Brand + hamburger */}
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          {isMobile && (
            <button
              onClick={() => openPanel(sidebarTab)}
              className="w-11 h-11 -ml-2 flex items-center justify-center rounded-lg text-amber-300 text-xl leading-none shrink-0"
              aria-label="Mở bảng điều khiển"
            >
              ☰
            </button>
          )}
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm shrink-0"
               style={{ background: "linear-gradient(135deg,#d4a853,#c96b3a)", boxShadow: "0 0 14px rgba(212,168,83,.35)" }}>
            🏠
          </div>
          <span className="font-bold text-base tracking-tight truncate">
            Room<span className="text-amber-400 italic">3D</span>
          </span>
        </div>

        {/* View toggle */}
        <div className="flex bg-stone-900/80 border border-amber-900/30 rounded-lg p-1 gap-1 shrink-0">
          {[
            { id: "exterior", icon: "🌐", label: "Tổng quan" },
            { id: "interior", icon: "🏠", label: "Bên trong" },
          ].map((v) => (
            <button
              key={v.id}
              onClick={() => setViewMode(v.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                viewMode === v.id
                  ? "text-stone-950 font-semibold shadow"
                  : "text-stone-400 hover:text-stone-200"
              }`}
              style={
                viewMode === v.id
                  ? { background: "linear-gradient(135deg,#d4a853,#c96b3a)", boxShadow: "0 2px 8px rgba(212,168,83,.3)" }
                  : {}
              }
            >
              <span>{v.icon}</span>
              <span className="hidden sm:inline">{v.label}</span>
            </button>
          ))}
        </div>

        {/* Stats — desktop only (tablet/mobile hide to give the toggle room) */}
        <div className="hidden lg:flex items-center gap-2">
          {[
            { label: "Diện tích", value: `${(width * length).toFixed(1)} m²` },
            { label: "Thể tích",  value: `${(width * length * height).toFixed(1)} m³` },
            { label: "Nội thất",  value: `${objects.length} vật` },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-amber-900/30 bg-stone-900/60 text-xs text-stone-400">
              {s.label} <strong className="text-amber-400 font-semibold">{s.value}</strong>
            </div>
          ))}
        </div>
      </header>

      {/* ── SIDEBAR (tablet / desktop) — collapsible. The full control panel
             stays MOUNTED at all times (fades/slides out on collapse) so no
             component ever remounts; a compact icon rail cross-fades in. ── */}
      {!isMobile && (
        <aside
          style={{ gridArea: "sidebar", background: THEME.panel, borderColor: THEME.border }}
          className="relative flex flex-col border-r overflow-hidden"
        >
          {/* Full control panel (always mounted) */}
          <div
            className="absolute inset-y-0 left-0 flex flex-col"
            style={{
              width: SIDEBAR_W,
              opacity: leftCollapsed ? 0 : 1,
              transform: leftCollapsed ? "translateX(-12px)" : "translateX(0)",
              pointerEvents: leftCollapsed ? "none" : "auto",
              transition: "opacity 300ms ease, transform 300ms ease",
            }}
          >
            {controlPanel(true)}
          </div>

          {/* Collapsed rail — keeps only the tab icons */}
          <div
            className="absolute inset-y-0 left-0 flex flex-col items-center pt-3 gap-2"
            style={{
              width: SIDEBAR_COLLAPSED_W,
              opacity: leftCollapsed ? 1 : 0,
              pointerEvents: leftCollapsed ? "auto" : "none",
              transition: "opacity 300ms ease",
            }}
          >
            {railTabs.map((tb) => {
              const active = sidebarTab === tb.id;
              return (
                <button
                  key={tb.id}
                  onClick={() => {
                    setSidebarTab(tb.id);
                    setLeftCollapsed(false);
                  }}
                  title={tb.label}
                  className="relative w-10 h-10 flex items-center justify-center rounded-lg text-lg transition-all hover:brightness-110"
                  style={
                    active
                      ? { background: THEME.primary, color: ON_PRIMARY }
                      : { background: THEME.card, color: THEME.secondary }
                  }
                >
                  {tb.icon}
                  {tb.badge ? (
                    <span
                      className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold flex items-center justify-center"
                      style={{ background: THEME.primary, color: ON_PRIMARY }}
                    >
                      {tb.badge}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          {/* Toggle — sits on the sidebar's right edge */}
          <button
            onClick={() => setLeftCollapsed((v) => !v)}
            aria-label={leftCollapsed ? "Mở rộng bảng điều khiển" : "Thu gọn bảng điều khiển"}
            title={leftCollapsed ? "Mở rộng" : "Thu gọn"}
            className="absolute top-1/2 right-0 -translate-y-1/2 z-20 w-6 h-14 flex items-center justify-center rounded-r-lg text-sm font-bold transition-all hover:brightness-125"
            style={{
              background: THEME.card,
              border: `1px solid ${THEME.border}`,
              borderLeft: "none",
              color: THEME.primary,
            }}
          >
            {leftCollapsed ? "›" : "‹"}
          </button>
        </aside>
      )}

      {/* ── CANVAS ── */}
      <div style={{ gridArea: "canvas" }} className="relative overflow-hidden">
        {/* View label */}
        <div className="absolute top-3 left-3 z-10 flex items-center gap-2 px-3 py-1.5 rounded-full border border-amber-900/30 bg-stone-950/90 text-[10.5px] font-semibold tracking-widest uppercase text-amber-400 pointer-events-none"
             style={{ backdropFilter: "blur(8px)" }}>
          {viewMode === "exterior" ? "🌐 Góc nhìn tổng quan" : "🏠 Góc nhìn bên trong"}
        </div>

        {/* Hints — hidden on mobile (they describe mouse-only interactions) */}
        <div className={"absolute top-3 right-3 z-10 flex-col gap-1.5 pointer-events-none " + (isMobile ? "hidden" : "flex")}>
          {["Chuột phải: xoay góc nhìn", "Scroll: thu phóng", "Giữa chuột: di chuyển"].map((hint) => (
            <div key={hint} className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-amber-900/25 bg-stone-950/85 text-[10.5px] text-stone-400"
                 style={{ backdropFilter: "blur(8px)" }}>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_5px_#d4a853] shrink-0" />
              {hint}
            </div>
          ))}
        </div>

        {/* Selected indicator — on mobile it's a shortcut into the Tools panel */}
        {selectedObject && (() => {
          const selObj = objects.find((o) => o.id === selectedObject);
          const cls =
            "absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 px-4 py-2 rounded-full border bg-stone-950/90 text-[12px] font-medium whitespace-nowrap " +
            (selObj?.locked ? "border-amber-400/60 text-amber-300 " : "border-amber-400/35 text-amber-400 ") +
            (isMobile ? "pointer-events-auto active:scale-95 transition-transform" : "pointer-events-none");
          const style = { backdropFilter: "blur(8px)", boxShadow: "0 0 16px rgba(212,168,83,.12)" };
          const label = isMobile
            ? (selObj?.locked ? "🔒 Đã khoá · chạm để mở khoá" : "✦ Đã chọn · chạm để chỉnh sửa")
            : (selObj?.locked ? "🔒 Đã khoá · vào tab Công Cụ để mở khoá" : "✦ Đã chọn · dùng tab Công Cụ để chỉnh sửa");
          return isMobile ? (
            <button className={cls} style={style} onClick={() => openPanel("tools")}>{label}</button>
          ) : (
            <div className={cls} style={style}>{label}</div>
          );
        })()}

        <Canvas
          shadows
          camera={{
            position: initialCam.position,
            fov: initialCam.fov,
            near: 0.1,
            far: 100,
          }}
          onPointerMissed={() => setSelectedObject(null)}
          style={{ width: "100%", height: "100%", background: "radial-gradient(ellipse at 40% 30%,#1a1208 0%,#0a0806 100%)" }}
        >
          <CameraController
            viewMode={viewMode}
            roomWidth={width}
            roomLength={length}
            roomHeight={height}
            controlsRef={controlsRef}
          />

          <ambientLight intensity={viewMode === "interior" ? 1.2 : 0.7} />
          <directionalLight position={[10, 12, 6]} intensity={viewMode === "interior" ? 1.0 : 2.0} castShadow shadow-mapSize={[2048, 2048]} />
          <pointLight position={[0, height - 0.3, 0]} intensity={viewMode === "interior" ? 3.0 : 1.5} color="#fff5e0" distance={Math.max(width, length) * 2} />
          <pointLight position={[0, height * 0.6, -length / 2 + 0.5]} intensity={2.0} color="#c8e8ff" distance={length * 1.5} />
          <pointLight position={[width * 0.4, height * 0.3, length * 0.3]} intensity={0.5} color="#ffe8c0" />
          <pointLight position={[-width * 0.4, height * 0.3, -length * 0.3]} intensity={0.4} color="#ffeedd" />

          {viewMode === "exterior" && (
            <Grid args={[50, 50]} cellSize={1} sectionSize={5} cellColor="#2a2218" sectionColor="#3d3020" fadeDistance={30} infiniteGrid />
          )}

          <Room width={width} length={length} height={height} />

          <Suspense fallback={null}>
            {objects.map((item) =>
              item.id === selectedObject && !item.locked ? (
                <TransformWrapper
                  key={item.id}
                  item={item}
                  mode={transformMode}
                  onSelect={setSelectedObject}
                  onUpdate={updateObject}
                  liveTransformMapRef={liveTransformMapRef}
                  orbitControlsRef={controlsRef}
                  dimsMapRef={dimsMapRef}
                  otherObjects={objects.filter((o) => o.id !== item.id)}
                  roomWidth={width}
                  roomLength={length}
                />
              ) : (
                <Model
                  key={item.id}
                  item={item}
                  onSelect={setSelectedObject}
                  dimsMapRef={dimsMapRef}
                />
              )
            )}
          </Suspense>

          <OrbitControls
            ref={controlsRef}
            makeDefault
            enableDamping
            dampingFactor={0.05}
            minDistance={0.5}
            maxDistance={50}
            target={initialCam.target}
          />
        </Canvas>
      </div>

      {/* ── BOTTOM: catalog bar (tablet/desktop) · bottom-nav (mobile) ──
             The category row + collapse toggle stay pinned at the top; the
             search + product grid below are clipped away when collapsed
             (row height animates via the grid, 300ms). ── */}
      {isMobile ? (
        bottomNav
      ) : (
        <div
          style={{ gridArea: "bottom", background: THEME.panel, borderColor: THEME.border }}
          className="flex flex-col overflow-hidden border-t"
        >
          {/* Header — categories (always visible) + collapse toggle */}
          <div
            className="flex items-center gap-2 px-3 shrink-0 border-b"
            style={{ height: 50, borderColor: THEME.border }}
          >
            <div className="flex-1 min-w-0">
              <CategoryTabs
                categories={categories}
                selectedId={selectedCategory?.id}
                onSelect={setSelectedCategory}
                loading={loading}
              />
            </div>
            <button
              onClick={() => setBottomCollapsed((v) => !v)}
              aria-label={bottomCollapsed ? "Mở rộng danh sách" : "Thu gọn danh sách"}
              title={bottomCollapsed ? "Mở rộng" : "Thu gọn"}
              className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-sm transition-all hover:brightness-125"
              style={{ background: THEME.card, border: `1px solid ${THEME.border}`, color: THEME.primary }}
            >
              {bottomCollapsed ? "▲" : "▼"}
            </button>
          </div>

          {/* Body — search + responsive product grid (clipped when collapsed) */}
          <div className="flex flex-col min-h-0 flex-1 overflow-hidden">
            <div className="px-5 pt-3 pb-1 shrink-0" style={{ maxWidth: 400 }}>
              <SearchBar value={search} onChange={setSearch} />
            </div>
            {renderProductGrid()}
          </div>
        </div>
      )}

      {/* ── MOBILE OVERLAYS: control drawer + catalog sheet ── */}
      {isMobile && (
        <>
          <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Bảng điều khiển">
            {controlPanel(false)}
          </Drawer>
          <BottomSheet open={catalogOpen} onClose={() => setCatalogOpen(false)} title="Thêm nội thất">
            {catalogSheet}
          </BottomSheet>
        </>
      )}
    </div>
  );
}
