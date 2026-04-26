/**
 * GalaxyBackground — Premium animated background for AttendX landing page.
 *
 * Architecture:
 *  1. Base void layer          – deep near-black, vignette
 *  2. Primary nebula layers    – 3 large blurred radial gradients, slow drift + rotation
 *  3. Secondary light blooms   – smaller glowing spots, opacity pulsing
 *  4. Star-field canvas        – sparse twinkling particles, mouse parallax
 *  5. Parallax overlay         – all layers respond subtly to mouse movement
 *  6. Dark contrast overlay    – ensures UI text remains readable
 *
 * Props:
 *   intensity  – 0-1, scales opacity / particle count  (default 1)
 *   speed      – multiplier for animation durations     (default 1)
 *   colors     – override default palette
 */

import React, {
  useRef,
  useEffect,
  useCallback,
  useMemo,
  useState,
} from 'react';
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from 'framer-motion';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GalaxyBackgroundColors {
  violet: string;
  indigo: string;
  deepPurple: string;
  cyan: string;
  pink: string;
}

export interface GalaxyBackgroundProps {
  /** 0–1: scales opacity and particle density */
  intensity?: number;
  /** Multiplier applied to all animation durations (higher = slower) */
  speed?: number;
  /** Override colour palette */
  colors?: Partial<GalaxyBackgroundColors>;
  /** Disable canvas star field (e.g. low-power mode) */
  disableParticles?: boolean;
  className?: string;
  children?: React.ReactNode;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_COLORS: GalaxyBackgroundColors = {
  violet: '109, 40, 217',     // galaxy-purple
  indigo: '79, 70, 229',      // indigo-600
  deepPurple: '46, 16, 101',  // deeper violet
  cyan: '6, 182, 212',        // cyan-500
  pink: '168, 85, 247',       // purple-500 (warm accent)
};

// ─── Nebula layer config ───────────────────────────────────────────────────────

interface NebulaLayer {
  id: string;
  color: keyof GalaxyBackgroundColors;
  size: string;
  initialX: string;
  initialY: string;
  opacity: [number, number];  // [min, max]
  driftX: number[];            // keyframes px
  driftY: number[];
  scale: number[];
  rotate: number[];
  duration: number;           // seconds
  blur: string;
  zIndex: number;
  blendMode: React.CSSProperties['mixBlendMode'];
}

const NEBULA_LAYERS: NebulaLayer[] = [
  {
    id: 'nebula-a',
    color: 'violet',
    size: '70vw',
    initialX: '-15%',
    initialY: '5%',
    opacity: [0.6, 0.85],
    driftX: [0, 60, -40, 20, 0],
    driftY: [0, -30, 50, -20, 0],
    scale: [1, 1.12, 0.96, 1.08, 1],
    rotate: [0, 1.5, -1, 2, 0],
    duration: 55,
    blur: '160px',
    zIndex: 1,
    blendMode: 'screen',
  },
  {
    id: 'nebula-b',
    color: 'indigo',
    size: '60vw',
    initialX: '35%',
    initialY: '20%',
    opacity: [0.5, 0.75],
    driftX: [0, -50, 30, -15, 0],
    driftY: [0, 40, -60, 25, 0],
    scale: [1, 0.92, 1.1, 0.98, 1],
    rotate: [0, -2, 1, -1.5, 0],
    duration: 70,
    blur: '180px',
    zIndex: 2,
    blendMode: 'screen',
  },
  {
    id: 'nebula-c',
    color: 'deepPurple',
    size: '55vw',
    initialX: '55%',
    initialY: '-10%',
    opacity: [0.55, 0.8],
    driftX: [0, 35, -55, 20, 0],
    driftY: [0, 45, -25, 55, 0],
    scale: [1, 1.08, 0.94, 1.04, 1],
    rotate: [0, 2.5, -1.5, 1, 0],
    duration: 45,
    blur: '140px',
    zIndex: 1,
    blendMode: 'screen',
  },
  {
    id: 'nebula-d',
    color: 'pink',
    size: '45vw',
    initialX: '10%',
    initialY: '60%',
    opacity: [0.35, 0.6],
    driftX: [0, -80, 40, -30, 0],
    driftY: [0, -60, 30, -50, 0],
    scale: [1, 1.15, 0.95, 1.1, 1],
    rotate: [0, -3, 1, -2, 0],
    duration: 60,
    blur: '130px',
    zIndex: 1,
    blendMode: 'screen',
  },
  {
    id: 'nebula-e',
    color: 'cyan',
    size: '50vw',
    initialX: '65%',
    initialY: '50%',
    opacity: [0.3, 0.55],
    driftX: [0, 60, -70, 40, 0],
    driftY: [0, 80, -40, 60, 0],
    scale: [1, 0.9, 1.15, 0.95, 1],
    rotate: [0, 2, -1.5, 2.5, 0],
    duration: 65,
    blur: '150px',
    zIndex: 2,
    blendMode: 'screen',
  },
];

// ─── Bloom config ─────────────────────────────────────────────────────────────

interface BloomLayer {
  id: string;
  color: keyof GalaxyBackgroundColors;
  size: string;
  x: string;
  y: string;
  opacity: [number, number];
  driftX: number[];
  driftY: number[];
  duration: number;
  blur: string;
}

const BLOOM_LAYERS: BloomLayer[] = [
  {
    id: 'bloom-1',
    color: 'cyan',
    size: '28vw',
    x: '10%',
    y: '65%',
    opacity: [0.4, 0.7],
    driftX: [0, 20, -10, 0],
    driftY: [0, -15, 20, 0],
    duration: 30,
    blur: '90px',
  },
  {
    id: 'bloom-2',
    color: 'pink',
    size: '22vw',
    x: '72%',
    y: '55%',
    opacity: [0.4, 0.7],
    driftX: [0, -25, 15, 0],
    driftY: [0, 18, -22, 0],
    duration: 38,
    blur: '80px',
  },
  {
    id: 'bloom-3',
    color: 'violet',
    size: '18vw',
    x: '45%',
    y: '80%',
    opacity: [0.4, 0.7],
    driftX: [0, 12, -8, 0],
    driftY: [0, -20, 10, 0],
    duration: 26,
    blur: '70px',
  },
];

// ─── Star-field canvas ─────────────────────────────────────────────────────────

interface Star {
  x: number;
  y: number;
  r: number;
  baseOpacity: number;
  phase: number;       // for twinkling
  speed: number;       // twinkle speed
  parallaxFactor: number;
  color: string;       // rgb string
}

function buildStars(count: number, w: number, h: number): Star[] {
  return Array.from({ length: count }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    r: Math.random() * 2.0 + 0.8,  // 0.8–2.8px radius
    baseOpacity: Math.random() * 0.5 + 0.5, // 0.5 - 1.0 opacity
    phase: Math.random() * Math.PI * 2,
    speed: Math.random() * 0.4 + 0.1,
    parallaxFactor: Math.random() * 0.9 + 0.1,
    // Add realistic star colors (blue, white, orange/reddish)
    color: Math.random() > 0.85 
      ? '180, 220, 255'   // Hot blue
      : Math.random() > 0.7 
        ? '255, 230, 200' // Warm orange
        : '255, 255, 255' // Standard white
  }));
}

interface StarCanvasProps {
  mouseX: number; // –1 to 1
  mouseY: number;
  intensity: number;
  speedMul: number;
}

const StarCanvas: React.FC<StarCanvasProps> = React.memo(
  ({ mouseX, mouseY, intensity, speedMul }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const starsRef = useRef<Star[]>([]);
    const frameRef = useRef<number>(0);
    const startRef = useRef<number | null>(null);

    // Build stars on mount / resize
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const setup = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        // ~400 stars scaled by intensity
        const count = Math.round(400 * intensity);
        starsRef.current = buildStars(count, canvas.width, canvas.height);
      };

      setup();
      const ro = new ResizeObserver(setup);
      ro.observe(document.documentElement);
      return () => ro.disconnect();
    }, [intensity]);

    // Animation loop
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d')!;

      const draw = (ts: number) => {
        if (!startRef.current) startRef.current = ts;
        const t = ((ts - startRef.current) / 1000) * speedMul;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Massively increased mouse parallax depth for stars
        const mx = mouseX * 90;
        const my = mouseY * 90;

        for (const s of starsRef.current) {
          const twinkle = Math.sin(t * s.speed + s.phase) * 0.4 + 0.6;
          // Scale opacity up significantly to ensure bright stars
          const opacity = Math.min(1, s.baseOpacity * twinkle * intensity * 1.5);

          // parallax offset (layered by factor)
          const ox = mx * s.parallaxFactor;
          const oy = my * s.parallaxFactor;

          ctx.beginPath();
          ctx.arc(s.x + ox, s.y + oy, s.r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${s.color}, ${opacity})`;
          ctx.fill();
        }

        frameRef.current = requestAnimationFrame(draw);
      };

      frameRef.current = requestAnimationFrame(draw);
      return () => cancelAnimationFrame(frameRef.current);
    }, [mouseX, mouseY, intensity, speedMul]);

    return (
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 3,
        }}
      />
    );
  },
);
StarCanvas.displayName = 'StarCanvas';

// ─── Main Component ───────────────────────────────────────────────────────────

const GalaxyBackground: React.FC<GalaxyBackgroundProps> = ({
  intensity = 1,
  speed = 1,
  colors: colorOverrides,
  disableParticles = false,
  className = '',
  children,
}) => {
  const palette = useMemo<GalaxyBackgroundColors>(
    () => ({ ...DEFAULT_COLORS, ...colorOverrides }),
    [colorOverrides],
  );

  // ── Mouse tracking ──────────────────────────────────────────────────────────
  const rawMX = useMotionValue(0);
  const rawMY = useMotionValue(0);

  // Smooth spring — very low stiffness for natural feel
  const springMX = useSpring(rawMX, { stiffness: 18, damping: 30, mass: 1.5 });
  const springMY = useSpring(rawMY, { stiffness: 18, damping: 30, mass: 1.5 });

  const [canvasMouse, setCanvasMouse] = useState({ x: 0, y: 0 });

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      const nx = (e.clientX / window.innerWidth - 0.5) * 2;   // –1 to 1
      const ny = (e.clientY / window.innerHeight - 0.5) * 2;
      rawMX.set(nx);
      rawMY.set(ny);
      setCanvasMouse({ x: nx, y: ny });
    },
    [rawMX, rawMY],
  );

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [handleMouseMove]);

  // ── Parallax transforms per "depth level" ──────────────────────────────────
  // depth 0 = closest (moves most), depth 2 = furthest (moves least)
  // Drastically increased values for a more dynamic 3D universe feel
  const p0x = useTransform(springMX, [-1, 1], [-80, 80]);
  const p0y = useTransform(springMY, [-1, 1], [-80, 80]);
  
  const p1x = useTransform(springMX, [-1, 1], [-50, 50]);
  const p1y = useTransform(springMY, [-1, 1], [-50, 50]);
  
  const p2x = useTransform(springMX, [-1, 1], [-25, 25]);
  const p2y = useTransform(springMY, [-1, 1], [-25, 25]);

  const parallax = useMemo(() => [
    { x: p0x, y: p0y },
    { x: p1x, y: p1y },
    { x: p2x, y: p2y },
  ], [p0x, p0y, p1x, p1y, p2x, p2y]);

  // ── Reduced-motion detection ────────────────────────────────────────────────
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div
      className={className}
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        isolation: 'isolate',
        pointerEvents: 'none',
        // Base void colour
        background: '#020617',
      }}
      aria-hidden="true"
    >
      {/* ── 1. Radial vignette overlay (edges darker) ─────────────────────── */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse at 50% 50%, transparent 30%, rgba(2,6,23,0.85) 100%)',
          zIndex: 10,
          pointerEvents: 'none',
        }}
      />

      {/* ── 2. Primary nebula layers ──────────────────────────────────────── */}
      {NEBULA_LAYERS.map((layer, i) => {
        const { x, y } = parallax[Math.min(i, parallax.length - 1)];
        const scaledDuration = layer.duration * speed;

        return (
          <motion.div
            key={layer.id}
            style={{
              position: 'absolute',
              top: layer.initialY,
              left: layer.initialX,
              width: layer.size,
              height: layer.size,
              borderRadius: '50%',
              background: `radial-gradient(circle, rgba(${palette[layer.color]}, ${layer.opacity[1]}) 0%, transparent 60%)`,
              mixBlendMode: layer.blendMode,
              zIndex: layer.zIndex,
              x,
              y,
              willChange: 'transform, opacity',
            }}
            animate={
              prefersReducedMotion
                ? {}
                : {
                    x: layer.driftX,
                    y: layer.driftY,
                    scale: layer.scale,
                    rotate: layer.rotate,
                    opacity: [
                      layer.opacity[0],
                      layer.opacity[1],
                      layer.opacity[0] + 0.04,
                      layer.opacity[1] - 0.02,
                      layer.opacity[0],
                    ],
                  }
            }
            transition={{
              duration: scaledDuration,
              ease: 'easeInOut',
              repeat: Infinity,
              repeatType: 'mirror',
              times: [0, 0.25, 0.5, 0.75, 1],
            }}
          />
        );
      })}

      {/* ── 3. Secondary light blooms ─────────────────────────────────────── */}
      {BLOOM_LAYERS.map((bloom, i) => {
        const { x, y } = parallax[0]; // closest layer = most movement
        const scaledDuration = bloom.duration * speed;

        return (
          <motion.div
            key={bloom.id}
            style={{
              position: 'absolute',
              top: bloom.y,
              left: bloom.x,
              width: bloom.size,
              height: bloom.size,
              borderRadius: '50%',
              background: `radial-gradient(circle, rgba(${palette[bloom.color]}, ${bloom.opacity[1]}) 0%, transparent 55%)`,
              mixBlendMode: 'screen',
              zIndex: 4,
              x: i % 2 === 0 ? x : y, // vary response axis per bloom
              willChange: 'transform, opacity',
            }}
            animate={
              prefersReducedMotion
                ? {}
                : {
                    x: bloom.driftX,
                    y: bloom.driftY,
                    opacity: [
                      bloom.opacity[0],
                      bloom.opacity[1],
                      bloom.opacity[0],
                    ],
                  }
            }
            transition={{
              duration: scaledDuration,
              ease: 'easeInOut',
              repeat: Infinity,
              repeatType: 'mirror',
              delay: i * 3,
            }}
          />
        );
      })}

      {/* ── 4. Canvas star-field ──────────────────────────────────────────── */}
      {!disableParticles && !prefersReducedMotion && (
        <StarCanvas
          mouseX={canvasMouse.x}
          mouseY={canvasMouse.y}
          intensity={intensity}
          speedMul={1 / speed}
        />
      )}

      {/* ── 5. Very subtle grid texture overlay ──────────────────────────── */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.012) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.012) 1px, transparent 1px)
          `,
          backgroundSize: '80px 80px',
          zIndex: 5,
          pointerEvents: 'none',
        }}
      />

      {/* ── 6. Dark contrast overlay (ensures text readability) ───────────── */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `rgba(2, 6, 23, ${0.15 * (2 - intensity)})`,
          zIndex: 6,
          pointerEvents: 'none',
        }}
      />

      {/* ── Children rendered above background ──────────────────────────── */}
      {children && (
        <div style={{ position: 'relative', zIndex: 20 }}>{children}</div>
      )}
    </div>
  );
};

export default GalaxyBackground;
