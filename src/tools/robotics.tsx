import React, { useState, useEffect, useRef, useCallback } from "react";
import { Play, Pause } from "lucide-react";

const SCALE = 4; // pixels per inch
const FIELD_SIZE_IN = 144;
const DOT_SPACING_IN = 24;
const ROBOT_SIZE_IN = 18;

interface RobotProps {
  x: number;
  y: number;
  heading: number; // radians, CCW positive
}

export function Robot({ x, y, heading }: RobotProps) {
  const pixelX = (x + FIELD_SIZE_IN / 2) * SCALE;
  const pixelY = (-y + FIELD_SIZE_IN / 2) * SCALE;
  const size = ROBOT_SIZE_IN * SCALE;
  const halfSize = size / 2;
  const arrowLength = 60; // pixels

  return (
    <g
      transform={`translate(${pixelX}, ${pixelY}) rotate(${-(heading * 180) / Math.PI})`}
    >
      <rect
        x={-halfSize}
        y={-halfSize}
        width={size}
        height={size}
        fill="#86efac"
        stroke="#22c55e"
        strokeWidth="2"
      />
      <line
        x1={0}
        y1={0}
        x2={arrowLength}
        y2={0}
        stroke="#22c55e"
        strokeWidth="4"
        strokeDasharray="5,5"
      />
      <polygon
        points={`${arrowLength},0 ${arrowLength - 10},-5 ${arrowLength - 10},5`}
        fill="#22c55e"
      />
    </g>
  );
}

interface FieldProps {
  children: React.ReactNode;
}

export function Field({ children }: FieldProps) {
  const width = FIELD_SIZE_IN * SCALE;
  const height = FIELD_SIZE_IN * SCALE;

  const gridElements = [];
  for (
    let ix = -FIELD_SIZE_IN / 2;
    ix <= FIELD_SIZE_IN / 2;
    ix += DOT_SPACING_IN
  ) {
    const px = (ix + FIELD_SIZE_IN / 2) * SCALE;

    // Dot at intersection
    for (
      let iy = -FIELD_SIZE_IN / 2;
      iy <= FIELD_SIZE_IN / 2;
      iy += DOT_SPACING_IN
    ) {
      const py = (iy + FIELD_SIZE_IN / 2) * SCALE;
      gridElements.push(
        <circle
          key={`dot-${ix}-${iy}`}
          cx={px}
          cy={py}
          r={3}
          fill="lightgrey"
        />,
      );
    }
  }

  return (
    <svg
      width={width}
      height={height}
      className="border-[0.5px] border-black"
      style={{ backgroundColor: "white" }}
    >
      {gridElements}
      {children}
    </svg>
  );
}

export interface JoystickProps {
  size?: number; // total SVG size in px
  dotSize?: number; // visual dot diameter in px
  touchPadding?: number; // extra touch radius around the visual dot in px
  className?: string;
  onValueChange?: (value: { x: number; y: number }) => void; // -127 .. 127 for both axes
  onStart?: () => void;
  onEnd?: () => void;
}

function Joystick({
  size = 200,
  dotSize = 28,
  touchPadding = 20,
  className = "",
  onValueChange,
  onStart,
  onEnd,
}: JoystickProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const pointerIdRef = useRef<number | null>(null);
  const draggingRef = useRef(false);

  // position in px relative to center (x/y)
  const [pos, setPos] = useState({ x: 0, y: 0 });

  // Keyboard control state
  const [isListening, setIsListening] = useState(false);
  const pressedKeys = useRef(new Set<string>());
  const keyboardSpringRef = useRef(false);

  // Refs used for animation physics
  const posRef = useRef({ x: 0, y: 0 });
  const velRef = useRef({ x: 0, y: 0 });

  // Derived sizes
  const half = size / 2;
  const dotRadius = dotSize / 2;
  // maximum distance the dot can move from center (keeps dot inside outer circle)
  const maxDistance = half - dotRadius - 6; // small padding from edge

  // Helper to convert px to -127..127 integer for both axes
  const pxToValue = useCallback(
    (px: number) => {
      const norm = Math.max(-1, Math.min(1, px / maxDistance));
      return Math.round(norm * 127);
    },
    [maxDistance],
  );

  // Call callback safely
  const emitValue = useCallback(
    (p: { x: number; y: number }) => {
      if (onValueChange)
        onValueChange({ x: pxToValue(p.x), y: -pxToValue(p.y) });
    },
    [onValueChange, pxToValue],
  );

  // Clean-up animation
  const stopAnim = useCallback(() => {
    if (frameRef.current != null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
  }, []);

  // Pointer position -> local x/y relative to center, clamped by maxDistance
  const clientToLocal = useCallback(
    (clientX: number, clientY: number) => {
      const svg = svgRef.current;
      if (!svg) return { x: 0, y: 0 };
      const rect = svg.getBoundingClientRect();
      const localX = clientX - rect.left - rect.width / 2;
      const localY = clientY - rect.top - rect.height / 2;
      // Clamp to circle
      const dist = Math.sqrt(localX * localX + localY * localY);
      if (dist > maxDistance) {
        const scale = maxDistance / dist;
        return { x: localX * scale, y: localY * scale };
      }
      return { x: localX, y: localY };
    },
    [maxDistance],
  );

  // Update states and refs consistently
  const setPosition = useCallback(
    (p: { x: number; y: number }) => {
      posRef.current = p;
      setPos(p);
      emitValue(p);
    },
    [emitValue],
  );

  // Drag handlers
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const onPointerMove = (ev: PointerEvent) => {
      if (!draggingRef.current) return;
      if (pointerIdRef.current !== ev.pointerId) return;

      const local = clientToLocal(ev.clientX, ev.clientY);
      stopAnim();
      velRef.current = { x: 0, y: 0 };
      setPosition(local);
      ev.preventDefault();
    };

    const onPointerUp = (ev: PointerEvent) => {
      if (!draggingRef.current) return;
      if (pointerIdRef.current !== ev.pointerId) return;

      draggingRef.current = false;
      pointerIdRef.current = null;
      try {
        (ev.target as Element).releasePointerCapture?.(ev.pointerId);
      } catch {}
      if (onEnd) onEnd();
      startSpring();
      ev.preventDefault();
    };

    window.addEventListener("pointermove", onPointerMove, { passive: false });
    window.addEventListener("pointerup", onPointerUp, { passive: false });
    window.addEventListener("pointercancel", onPointerUp, { passive: false });

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };
  }, [clientToLocal, setPosition, stopAnim, onEnd]);

  // Keyboard handlers
  useEffect(() => {
    if (!isListening) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "ArrowUp" ||
        e.key === "ArrowDown" ||
        e.key === "ArrowLeft" ||
        e.key === "ArrowRight"
      ) {
        pressedKeys.current.add(e.key);
        e.preventDefault();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (
        e.key === "ArrowUp" ||
        e.key === "ArrowDown" ||
        e.key === "ArrowLeft" ||
        e.key === "ArrowRight"
      ) {
        pressedKeys.current.delete(e.key);
        e.preventDefault();
      }
    };

    window.addEventListener("keydown", handleKeyDown, { passive: false });
    window.addEventListener("keyup", handleKeyUp, { passive: false });

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      pressedKeys.current.clear();
    };
  }, [isListening]);

  // Keyboard joystick update loop
  // Move keyboard joystick effect below startSpring declaration to avoid usage before assignment

  // Pointer down on the touch zone (now covers dot and touch zone)
  const handlePointerDown = (ev: React.PointerEvent) => {
    if (ev.button && ev.button !== 0) return;
    draggingRef.current = true;
    pointerIdRef.current = ev.pointerId;
    stopAnim();
    velRef.current = { x: 0, y: 0 };
    try {
      (ev.target as Element).setPointerCapture?.(ev.pointerId);
    } catch {}
    if (onStart) onStart();
    const local = clientToLocal(ev.clientX, ev.clientY);
    setPosition(local);
    ev.preventDefault();
  };

  // Spring animation to return to center
  const startSpring = useCallback(() => {
    stopAnim();
    const k = 100; // slowed down by ~3x
    const damping = 9.5; // slowed down by ~3x
    const mass = 1;

    let last = performance.now();

    const step = (now: number) => {
      const dt = Math.min(0.032, (now - last) / 1000);
      last = now;

      const { x, y } = posRef.current;
      const { x: vx, y: vy } = velRef.current;
      const ax = (-k * x - damping * vx) / mass;
      const ay = (-k * y - damping * vy) / mass;

      const vxNext = vx + ax * dt;
      const vyNext = vy + ay * dt;
      const xNext = x + vxNext * dt;
      const yNext = y + vyNext * dt;

      velRef.current = { x: vxNext, y: vyNext };
      posRef.current = { x: xNext, y: yNext };
      setPos({ x: xNext, y: yNext });
      emitValue({ x: xNext, y: yNext });

      if (
        Math.abs(xNext) < 0.5 &&
        Math.abs(yNext) < 0.5 &&
        Math.abs(vxNext) < 0.5 &&
        Math.abs(vyNext) < 0.5
      ) {
        posRef.current = { x: 0, y: 0 };
        velRef.current = { x: 0, y: 0 };
        setPos({ x: 0, y: 0 });
        emitValue({ x: 0, y: 0 });
        stopAnim();
        frameRef.current = null;
        return;
      }

      frameRef.current = requestAnimationFrame(step);
    };

    frameRef.current = requestAnimationFrame(step);
  }, [emitValue, stopAnim]);

  // Keyboard joystick update loop (now after startSpring is declared)
  useEffect(() => {
    if (!isListening) return;
    if (draggingRef.current) return; // ignore keyboard if dragging

    let animFrame: number | null = null;
    // Target position for keyboard movement
    let target = { x: 0, y: 0 };

    const update = () => {
      const keys = pressedKeys.current;
      let dx = 0,
        dy = 0;
      // Use full extent for the target; we'll clamp diagonals to the circular maxDistance
      const axisAmount = maxDistance; // full extent for a pressed key

      if (keys.has("ArrowUp")) dy -= axisAmount;
      if (keys.has("ArrowDown")) dy += axisAmount;
      if (keys.has("ArrowLeft")) dx -= axisAmount;
      if (keys.has("ArrowRight")) dx += axisAmount;

      // Clamp to circle radius so diagonals don't exceed maxDistance
      const mag = Math.sqrt(dx * dx + dy * dy);
      if (mag > maxDistance && mag > 0) {
        const scale = maxDistance / mag;
        dx *= scale;
        dy *= scale;
      }

      // Gradually move joystick toward target position using lerp so it reliably converges
      if (keys.size > 0) {
        target = { x: dx, y: dy };
        keyboardSpringRef.current = false;
        // If a spring animation is running, stop it so keyboard can take control immediately
        stopAnim();
        velRef.current = { x: 0, y: 0 };
        // Lerp current position toward target each frame (alpha controls speed)
        const alpha = 0.16; // lerp factor per frame (0..1). Increase to reach faster.
        const curr = posRef.current;
        const nx = curr.x + (target.x - curr.x) * alpha;
        const ny = curr.y + (target.y - curr.y) * alpha;
        setPosition({ x: nx, y: ny });
        // If we're very close to the exact target, snap to it to avoid tiny asymptotic differences
        const remain = Math.sqrt(
          (target.x - nx) * (target.x - nx) + (target.y - ny) * (target.y - ny),
        );
        if (remain < 0.6) {
          setPosition(target);
        }
      } else {
        // If keys just released, spring back to center
        if (!keyboardSpringRef.current) {
          keyboardSpringRef.current = true;
          startSpring();
        }
      }
      animFrame = requestAnimationFrame(update);
    };

    animFrame = requestAnimationFrame(update);

    return () => {
      if (animFrame != null) cancelAnimationFrame(animFrame);
    };
  }, [isListening, setPosition, maxDistance, startSpring]);

  useEffect(() => {
    return () => {
      stopAnim();
    };
  }, [stopAnim]);

  // Compute SVG positions
  const dotCx = half + pos.x;
  const dotCy = half + pos.y;
  const hitRadius = dotRadius + touchPadding;

  // SVG touch action none (prevent page scrolling on touch)
  // Only border circle, no lines
  return (
    <div className="flex flex-col items-center gap-2">
      <svg
        ref={svgRef}
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className={`inline-block ${className}`}
        style={{ touchAction: "none", WebkitTapHighlightColor: "transparent" }}
      >
        {/* Outer circle */}
        <circle
          cx={half}
          cy={half}
          r={maxDistance + dotRadius + 3}
          fill="none"
          className="stroke-gray-300"
          stroke="rgb(209 213 219)"
          strokeWidth={2}
        />

        {/* Invisible touch zone for easier dragging (covers dot and area) */}
        <circle
          cx={dotCx}
          cy={dotCy}
          r={hitRadius}
          fill="transparent"
          onPointerDown={handlePointerDown}
          className="cursor-grab"
          style={{ touchAction: "none" }}
        />
        {/* Visual dot (also clickable) */}
        <circle
          cx={dotCx}
          cy={dotCy}
          r={dotRadius}
          fill="rgb(59 130 246)"
          className="shadow cursor-grab"
          style={{
            transition: draggingRef.current ? "none" : undefined,
            transformOrigin: `${dotCx}px ${dotCy}px`,
          }}
          onPointerDown={handlePointerDown}
        />
        {/* Optional inner smaller highlight */}
        <circle
          cx={dotCx - Math.min(6, Math.abs(pos.x) / 10)}
          cy={dotCy - 2}
          r={dotRadius / 3}
          fill="rgba(255,255,255,0.55)"
          pointerEvents="none"
        />
      </svg>
      <button
        className="font-mono bg-gray-100 border-none px-4 py-2 mt-2 text-center"
        onClick={() => setIsListening((v) => !v)}
      >
        {isListening ? (
          <div className="flex gap-2">
            <Pause size={16} className="text-red-500 my-auto" />
            <span className="my-auto">Stop listening to keypresses</span>
          </div>
        ) : (
          <div className="flex gap-2">
            <Play size={16} className="text-green-500 my-auto" />
            <span className="my-auto">Start listening to keypresses</span>
          </div>
        )}
      </button>
    </div>
  );
}

export function useInterval(callback: () => void, delay: number | null) {
  const savedCallback = useRef<() => void>(() => {});

  // Remember the latest callback.
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Set up the interval.
  useEffect(() => {
    function tick() {
      if (savedCallback.current) {
        savedCallback.current();
      }
    }
    if (delay !== null) {
      const id = setInterval(tick, delay);
      return () => clearInterval(id);
    }
  }, [delay]);
}

// l and r between -127 and 127
const useTankDriveSim = (power: { l: number; r: number }) => {
  // basically entirely stolen from Nasir | 934Z. TYSM Nasir!
  const [state, setState] = useState({ theta: 0, x: 0, y: 0 });
  const FPS = 60;
  const TIME_CONSTANT = 80;
  const LIMIT = 127;
  useInterval(() => {
    const { l, r } = power;
    const theta = -(Math.PI * (r - l)) / (LIMIT * TIME_CONSTANT) + state.theta;
    const linear = (40 * (l + r)) / (LIMIT * TIME_CONSTANT);
    const x = Math.max(-70, Math.min(70, linear * Math.cos(theta) + state.x));
    const y = Math.max(-70, Math.min(70, linear * Math.sin(theta) + state.y));
    setState({ theta, x, y });
  }, 1000 / FPS);

  return state;
};

export default function TestApp() {
  // const [robotX, setRobotX] = useState(24);
  // const [robotY, setRobotY] = useState(24);
  // const [robotHeading, setRobotHeading] = useState(Math.PI / 2);
  // const [isListening, setIsListening] = useState(false);
  // const pressedKeys = useRef(new Set<string>());
  // const headingRef = useRef(robotHeading);

  // useEffect(() => {
  //   headingRef.current = robotHeading;
  // }, [robotHeading]);

  // useEffect(() => {
  //   if (!isListening) return;

  //   const handleKeyDown = (e: KeyboardEvent) => {
  //     pressedKeys.current.add(e.key);
  //   };

  //   const handleKeyUp = (e: KeyboardEvent) => {
  //     pressedKeys.current.delete(e.key);
  //   };

  //   window.addEventListener("keydown", handleKeyDown);
  //   window.addEventListener("keyup", handleKeyUp);

  //   const interval = setInterval(() => {
  //     const keys = pressedKeys.current;
  //     let dx = 0,
  //       dy = 0,
  //       dHeading = 0;
  //     const moveSpeed = 1; // inches per frame
  //     const turnSpeed = (3 * Math.PI) / 180; // 1 degree per frame

  //     if (keys.has("ArrowUp")) {
  //       dx += Math.cos(headingRef.current) * moveSpeed;
  //       dy += Math.sin(headingRef.current) * moveSpeed;
  //     }
  //     if (keys.has("ArrowDown")) {
  //       dx -= 2 * Math.cos(headingRef.current) * moveSpeed;
  //       dy -= 2 * Math.sin(headingRef.current) * moveSpeed;
  //     }
  //     if (keys.has("ArrowLeft")) {
  //       dHeading += turnSpeed;
  //     }
  //     if (keys.has("ArrowRight")) {
  //       dHeading -= turnSpeed;
  //     }

  //     if (dx || dy) {
  //       setRobotX((x) => Math.max(-70, Math.min(70, x + dx)));
  //       setRobotY((y) => Math.max(-70, Math.min(70, y + dy)));
  //     }
  //     if (dHeading) {
  //       setRobotHeading((h) => h + dHeading);
  //     }
  //   }, 16); // ~60fps

  //   return () => {
  //     clearInterval(interval);
  //     window.removeEventListener("keydown", handleKeyDown);
  //     window.removeEventListener("keyup", handleKeyUp);
  //     pressedKeys.current.clear();
  //   };
  // }, [isListening]);
  const [{ x: ja, y: jl }, setJoyValue] = useState({ x: 0, y: 0 });
  const { x, y, theta } = useTankDriveSim({ l: jl - ja, r: jl + ja });
  return (
    <div
      className="mt-40 flex flex-col mx-auto gap-2"
      style={{ width: `${FIELD_SIZE_IN * SCALE}px` }}
    >
      {/*<span className="flex mx-auto text-sm">
        <b>
          Disclaimer: most of the code for these visualization was AI-generated,
          using a mixture of Grok Code Fast 1 and gpt-5-mini. I of course added
          a human touch for the aesthetic.
        </b>
      </span>*/}
      <Field>
        <Robot x={x} y={y} heading={theta} />
      </Field>
      <Joystick
        // size={100}
        // dotSize={20}
        // touchPadding={10}
        // className="mx-auto"
        onValueChange={setJoyValue}
      />
      {/*<button
        className="font-mono bg-gray-100 border-none px-4 py-2 mt-2 text-center"
        onClick={() => setIsListening(!isListening)}
      >
        {isListening ? (
          <div className="flex gap-2">
            <Pause size={16} className="text-red-500 my-auto" />
            <span className="my-auto">Stop listening to
            keypresses</span>
          </div>
        ) : (
          <div className="flex gap-2">
            <Play size={16} className="text-green-500 my-auto" />
            <span className="my-auto">Start listening to
            keypresses</span>
          </div>
        )}
      </button>*/}
    </div>
  );
}
