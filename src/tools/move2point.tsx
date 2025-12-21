import { useState, useRef, useCallback, useEffect } from "react";
import { RotateCw } from "lucide-react";

interface Point {
  x: number;
  y: number;
}

export function CosineViz() {
  const [boxPosition, setBoxPosition] = useState<Point>({ x: 300, y: 400 });
  const [boxRotation, setBoxRotation] = useState(0); // in degrees
  const [otherPoint, setOtherPoint] = useState<Point>({ x: 500, y: 200 });
  const [isDraggingBox, setIsDraggingBox] = useState(false);
  const [isDraggingPoint, setIsDraggingPoint] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [dragOffset, setDragOffset] = useState<Point>({ x: 0, y: 0 });

  const svgRef = useRef<SVGSVGElement>(null);

  // Calculate angle between box heading and direction to other point
  const calculateAngle = useCallback(() => {
    const dx = otherPoint.x - boxPosition.x;
    const dy = otherPoint.y - boxPosition.y;
    const angleToPoint = (Math.atan2(dy, dx) * 180) / Math.PI;

    // Normalize angles to 0-360 range
    const normalizeAngle = (angle: number) => {
      while (angle < 0) angle += 360;
      while (angle >= 360) angle -= 360;
      return angle;
    };

    const normalizedBoxRotation = normalizeAngle(boxRotation);
    const normalizedAngleToPoint = normalizeAngle(angleToPoint);

    let angleDifference = normalizedAngleToPoint - normalizedBoxRotation;
    if (angleDifference < 0) angleDifference += 360;
    if (angleDifference > 180) angleDifference = 360 - angleDifference;

    return Math.round(angleDifference * 10) / 10; // Round to 1 decimal place
  }, [boxPosition, otherPoint, boxRotation]);

  const getMousePosition = (e: React.MouseEvent) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handleBoxMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const mousePos = getMousePosition(e);
    setDragOffset({
      x: mousePos.x - boxPosition.x,
      y: mousePos.y - boxPosition.y,
    });
    setIsDraggingBox(true);
  };

  const handlePointMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const mousePos = getMousePosition(e);
    setDragOffset({
      x: mousePos.x - otherPoint.x,
      y: mousePos.y - otherPoint.y,
    });
    setIsDraggingPoint(true);
  };

  const handleRotateMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsRotating(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const mousePos = getMousePosition(e);

    if (isDraggingBox) {
      setBoxPosition({
        x: mousePos.x - dragOffset.x,
        y: mousePos.y - dragOffset.y,
      });
    } else if (isDraggingPoint) {
      setOtherPoint({
        x: mousePos.x - dragOffset.x,
        y: mousePos.y - dragOffset.y,
      });
    } else if (isRotating) {
      const dx = mousePos.x - boxPosition.x;
      const dy = mousePos.y - boxPosition.y;
      const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
      setBoxRotation(angle);
    }
  };

  const handleMouseUp = () => {
    setIsDraggingBox(false);
    setIsDraggingPoint(false);
    setIsRotating(false);
  };

  // Calculate line endpoints for visualization
  const lineLength = 2 * 10 * 1000;
  const boxHeadingEndX =
    boxPosition.x + Math.cos((boxRotation * Math.PI) / 180) * lineLength;
  const boxHeadingEndY =
    boxPosition.y + Math.sin((boxRotation * Math.PI) / 180) * lineLength;
  const boxHeadingStartX =
    boxPosition.x - Math.cos((boxRotation * Math.PI) / 180) * lineLength;
  const boxHeadingStartY =
    boxPosition.y - Math.sin((boxRotation * Math.PI) / 180) * lineLength;

  const distanceToPoint = Math.sqrt(
    Math.pow(otherPoint.x - boxPosition.x, 2) +
      Math.pow(otherPoint.y - boxPosition.y, 2),
  );
  const pointDirX = (otherPoint.x - boxPosition.x) / distanceToPoint;
  const pointDirY = (otherPoint.y - boxPosition.y) / distanceToPoint;
  const pointLineEndX = boxPosition.x + pointDirX * lineLength;
  const pointLineEndY = boxPosition.y + pointDirY * lineLength;
  const pointLineStartX = boxPosition.x - pointDirX * lineLength;
  const pointLineStartY = boxPosition.y - pointDirY * lineLength;

  // Calculate arc for angle visualization
  const arcRadius = 140;
  const startAngle = (boxRotation * Math.PI) / 180;
  const endAngle = Math.atan2(
    otherPoint.y - boxPosition.y,
    otherPoint.x - boxPosition.x,
  );

  const arcStartX = boxPosition.x + Math.cos(startAngle) * arcRadius;
  const arcStartY = boxPosition.y + Math.sin(startAngle) * arcRadius;
  const arcEndX = boxPosition.x + Math.cos(endAngle) * arcRadius;
  const arcEndY = boxPosition.y + Math.sin(endAngle) * arcRadius;

  let angleDiff = endAngle - startAngle;
  if (angleDiff < 0) angleDiff += 2 * Math.PI;

  const arcPath =
    angleDiff > Math.PI
      ? `M ${arcEndX} ${arcEndY} A ${arcRadius} ${arcRadius} 0 ${0} 1 ${arcStartX} ${arcStartY}`
      : `M ${arcStartX} ${arcStartY} A ${arcRadius} ${arcRadius} 0 ${0} 1 ${arcEndX} ${arcEndY}`;

  if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;

  // Calculate right triangle points
  const angleDeg = calculateAngle();
  const distance = distanceToPoint;
  const projectionLength = distance * Math.cos((angleDeg * Math.PI) / 180);
  const headingX = Math.cos((boxRotation * Math.PI) / 180);
  const headingY = Math.sin((boxRotation * Math.PI) / 180);
  const projectionPoint = {
    x: boxPosition.x + projectionLength * headingX,
    y: boxPosition.y + projectionLength * headingY,
  };

  return (
    <div className="w-[800px] mx-auto">
      {/* Angle display */}
      <pre className="border-1 border-black rounded-none h-[18rem] flex flex-col">
        <div className="my-auto">
          <p className="font-mono text-wrap text-[1.5rem]">
            angle error: <b className="text-blue-600">{calculateAngle()}°</b>
          </p>
          <p className="font-mono text-wrap text-[1.5rem]">
            <em>cosine of</em> angle error (lateral error multiplier):{" "}
            <b className="text-blue-600">
              {(Math.cos(angleDiff) * 100).toFixed(0)}%
            </b>
          </p>
          <ul className="text-sm text-muted-foreground mx-auto">
            <li>
              Drag the (green) robot to translate it, or drag its handle to
              rotate it
            </li>
            <li>Drag the target (red) point</li>
            <li>Watch as the angle and its cosine change in real time</li>
          </ul>
        </div>
      </pre>

      {/* SVG Canvas */}
      <svg
        ref={svgRef}
        width="800"
        height="600"
        className="cursor-crosshair border-black border mx-auto my-auto"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Dashed lines */}
        <line
          x1={boxHeadingStartX}
          y1={boxHeadingStartY}
          x2={boxHeadingEndX}
          y2={boxHeadingEndY}
          stroke="#d1d5db"
          strokeWidth="4"
          strokeDasharray="10,10"
        />
        <line
          x1={boxPosition.x}
          y1={boxPosition.y}
          x2={projectionPoint.x}
          y2={projectionPoint.y}
          stroke="#1e40af"
          strokeWidth="4"
        />
        <line
          x1={projectionPoint.x}
          y1={projectionPoint.y}
          x2={otherPoint.x}
          y2={otherPoint.y}
          stroke="#3b82f6"
          strokeWidth="2"
        />
        <line
          x1={boxPosition.x}
          y1={boxPosition.y}
          x2={otherPoint.x}
          y2={otherPoint.y}
          stroke="#3b82f6"
          strokeWidth="2"
        />
        <line
          x1={pointLineStartX}
          y1={pointLineStartY}
          x2={pointLineEndX}
          y2={pointLineEndY}
          stroke="#d1d5db"
          strokeWidth="4"
          strokeDasharray="10,10"
        />
        {/* Angle arc */}{" "}
        <path d={arcPath} fill="none" stroke="#3b82f6" strokeWidth="6" />
        {/* Right triangle */}
        <polygon
          points={`${boxPosition.x},${boxPosition.y} ${projectionPoint.x},${projectionPoint.y} ${otherPoint.x},${otherPoint.y}`}
          fill="transparent"
          stroke="#5591f2"
          strokeWidth="3"
        />
        <line
          x1={boxPosition.x}
          y1={boxPosition.y}
          x2={projectionPoint.x}
          y2={projectionPoint.y}
          stroke="#1e40af"
          strokeWidth="5"
        />
        {/* Box */}
        <g
          transform={`translate(${boxPosition.x}, ${boxPosition.y}) rotate(${boxRotation})`}
          onMouseDown={handleBoxMouseDown}
          className="cursor-move"
        >
          {/* Light green square */}
          <rect
            x="-40"
            y="-40"
            width="80"
            height="80"
            fill="#86efac"
            stroke="#22c55e"
            strokeWidth="4"
            rx="8"
          />
        </g>
        {/* Rotation handle */}
        <g
          transform={`translate(${boxPosition.x + Math.cos((boxRotation * Math.PI) / 180) * 40}, ${boxPosition.y + Math.sin((boxRotation * Math.PI) / 180) * 40})`}
          onMouseDown={handleRotateMouseDown}
          className="cursor-grab active:cursor-grabbing"
        >
          <RotateCw
            size={32}
            x="-16"
            y="-16"
            className="text-blue-500 fill-white"
          />
        </g>
        {/* Other point */}
        <circle
          cx={otherPoint.x}
          cy={otherPoint.y}
          r="16"
          fill="#ef4444"
          stroke="#dc2626"
          strokeWidth="4"
          className="cursor-move"
          onMouseDown={handlePointMouseDown}
        />
      </svg>
    </div>
  );
}

const calcState = {
  version: 11,
  randomSeed: "920ef7bdec58cc407472d29d5ed1d1db",
  graph: {
    viewport: {
      xmin: -9.725400457665888,
      ymin: -48.55331807780324,
      xmax: 10.274599542334112,
      ymax: 50.24668192219677,
    },
    __v12ViewportLatexStash: {
      xmin: "-9.725400457665888",
      xmax: "10.274599542334112",
      ymin: "-48.55331807780324",
      ymax: "50.24668192219677",
    },
  },
  expressions: {
    list: [
      {
        type: "text",
        id: "9",
        text: "(pose.y - target.y) * -sin(initialAngle) <=\n                              (pose.x - target.x) * cos(initialAngle) + params.earlyExitRange",
      },
      {
        type: "expression",
        id: "1",
        color: "#c74440",
        latex: "p=\\left(0,0\\right)",
        showLabel: true,
        label: "Robot",
        dragMode: "NONE",
      },
      {
        type: "expression",
        id: "2",
        color: "#2d70b3",
        latex: "t=\\left(-1.6,4.28\\right)",
        showLabel: true,
        label: "Target point",
      },
      {
        type: "expression",
        id: "4",
        color: "#6042a6",
        latex:
          "a_{1}=\\operatorname{mod}\\left(\\arctan\\left(\\frac{t.y-p.y}{t.x-p.x}\\right)+\\pi,\\pi\\right)",
      },
      {
        type: "expression",
        id: "6",
        color: "#c74440",
        latex: "a=a_{1}\\cdot\\left\\{t.y<p.y:-1,1\\right\\}",
      },
      {
        type: "expression",
        id: "3",
        color: "#388c46",
        latex: "r=\\left\\{0<\\theta<a\\right\\}",
        polarDomain: {
          min: "",
          max: "\\left\\{a\\le0:0,a\\right\\}",
        },
      },
      {
        type: "expression",
        id: "7",
        color: "#388c46",
        latex: "r=1\\left\\{a<0\\right\\}",
        polarDomain: {
          min: "-\\pi-a",
          max: "0",
        },
      },
      {
        type: "expression",
        id: "8",
        color: "#2d70b3",
        latex:
          "y=\\tan\\left(a_{1}\\right)x\\left\\{y>\\left\\{t.y<p.y:-\\infty,0\\right\\}\\right\\}\\left\\{y<\\left\\{t.y<p.y:0,\\infty\\right\\}\\right\\}",
        lineStyle: "DASHED",
      },
      {
        type: "expression",
        id: "10",
        color: "#6042a6",
        latex:
          "\\left\\{t.y<p.y:1,-1\\right\\}\\left(y-t.y\\right)\\sin\\left(a_{1}\\right)\\le\\left\\{t.y<p.y:-1,1\\right\\}\\left(x-t.x\\right)\\cos\\left(a_{1}\\right)+1",
      },
    ],
  },
  includeFunctionParametersInRandomSeed: true,
  doNotMigrateMovablePointStyle: true,
};

export function DesmosSide() {
  if (typeof window === "undefined") {
    return null;
  }
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    let calculator: any;
    (async () => {
      // @ts-ignore - @types/desmos declares globals instead of a module; silence module-type error and treat import as any
      const DesmosModule: any = await import("desmos");
      calculator = DesmosModule.default
        ? DesmosModule.default.GraphingCalculator(ref.current, {
            expressions: false,
            lockViewport: true,
          })
        : DesmosModule.GraphingCalculator(ref.current, {
            expressions: false,
            lockViewport: true,
          });
      calculator.setState(calcState);
    })();
    return () => {
      if (calculator && calculator.destroy) calculator.destroy();
    };
  }, []);

  return (
    <div
      ref={ref}
      style={{
        width: "600px",
        height: "400px",
        marginLeft: "auto",
        marginRight: "auto",
      }}
    />
  );
}
