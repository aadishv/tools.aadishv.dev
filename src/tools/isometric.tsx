import React, { useRef, useEffect, useState, useCallback } from "react";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Label } from "../components/ui/label";

interface GridCell {
  up: { color: string };
  down: { color: string };
}

interface SavedGrid {
  gridData: GridCell[][];
  numRows: number;
  numCols: number;
  xOffset: number;
  yOffset: number;
}

interface ClickedTriangle {
  r: number;
  c: number;
  type: "up" | "down";
}

export default function IsometricGrid() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentColor, setCurrentColor] = useState("#4f46e5");
  const [grid, setGrid] = useState<GridCell[][]>([]);
  const [numRows, setNumRows] = useState(0);
  const [numCols, setNumCols] = useState(0);
  const [xOffset, setXOffset] = useState(0);
  const [yOffset, setYOffset] = useState(0);
  const [savedGrids, setSavedGrids] = useState<Record<string, SavedGrid>>({});
  const [isPickingColor, setIsPickingColor] = useState(false);

  // Constants
  const TRIANGLE_SIDE = 40;
  const TRIANGLE_HEIGHT = (TRIANGLE_SIDE * Math.sqrt(3)) / 2;
  const RHOMBUS_HEIGHT = TRIANGLE_HEIGHT * 2;
  const DEFAULT_COLOR = "#ffffff";

  // Load saved data from localStorage
  useEffect(() => {
    const loadSavedData = () => {
      const grids: Record<string, SavedGrid> = {};

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith("isometricGrid_")) {
          const gridName = key.substring("isometricGrid_".length);
          const gridValue = localStorage.getItem(key);
          if (gridValue) {
            try {
              grids[gridName] = JSON.parse(gridValue);
            } catch (e) {
              console.error("Error parsing saved grid:", e);
            }
          }
        }
      }

      setSavedGrids(grids);
    };

    loadSavedData();
  }, []);

  const calculateGridDimensions = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const cols = Math.floor(canvas.width / TRIANGLE_SIDE);
    const rows = Math.floor(canvas.height / TRIANGLE_HEIGHT) - 1;

    const effectiveGridWidth =
      cols * TRIANGLE_SIDE + (rows % 2 === 1 ? TRIANGLE_SIDE / 2 : 0);
    const effectiveGridHeight = rows * TRIANGLE_HEIGHT + TRIANGLE_HEIGHT;

    const xOff = Math.max(0, (canvas.width - effectiveGridWidth) / 2);
    const yOff = Math.max(0, (canvas.height - effectiveGridHeight) / 2);

    setNumCols(cols);
    setNumRows(rows);
    setXOffset(xOff);
    setYOffset(yOff);
  }, []);

  const initializeGrid = useCallback(() => {
    const newGrid: GridCell[][] = [];
    for (let r = 0; r < numRows; r++) {
      newGrid[r] = [];
      for (let c = 0; c < numCols; c++) {
        newGrid[r][c] = {
          up: { color: DEFAULT_COLOR },
          down: { color: DEFAULT_COLOR },
        };
      }
    }
    setGrid(newGrid);
  }, [numRows, numCols]);

  const drawGrid = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 1;

    for (let r = 0; r < numRows; r++) {
      for (let c = 0; c < numCols; c++) {
        if (!grid[r] || !grid[r][c]) continue;

        let rhombus_base_x =
          c * TRIANGLE_SIDE + (r % 2 === 1 ? TRIANGLE_SIDE / 2 : 0);
        let rhombus_base_y = r * TRIANGLE_HEIGHT;

        rhombus_base_x += xOffset;
        rhombus_base_y += yOffset;

        // Up triangle vertices
        const up_v1 = {
          x: rhombus_base_x + TRIANGLE_SIDE / 2,
          y: rhombus_base_y,
        };
        const up_v2 = {
          x: rhombus_base_x,
          y: rhombus_base_y + TRIANGLE_HEIGHT,
        };
        const up_v3 = {
          x: rhombus_base_x + TRIANGLE_SIDE,
          y: rhombus_base_y + TRIANGLE_HEIGHT,
        };

        // Down triangle vertices
        const down_v1 = {
          x: rhombus_base_x + TRIANGLE_SIDE / 2,
          y: rhombus_base_y + RHOMBUS_HEIGHT,
        };
        const down_v2 = {
          x: rhombus_base_x,
          y: rhombus_base_y + TRIANGLE_HEIGHT,
        };
        const down_v3 = {
          x: rhombus_base_x + TRIANGLE_SIDE,
          y: rhombus_base_y + TRIANGLE_HEIGHT,
        };

        // Draw up triangle
        ctx.beginPath();
        ctx.moveTo(up_v1.x, up_v1.y);
        ctx.lineTo(up_v2.x, up_v2.y);
        ctx.lineTo(up_v3.x, up_v3.y);
        ctx.closePath();
        ctx.fillStyle = grid[r][c].up.color;
        ctx.fill();
        ctx.stroke();

        // Draw down triangle
        ctx.beginPath();
        ctx.moveTo(down_v1.x, down_v1.y);
        ctx.lineTo(down_v2.x, down_v2.y);
        ctx.lineTo(down_v3.x, down_v3.y);
        ctx.closePath();
        ctx.fillStyle = grid[r][c].down.color;
        ctx.fill();
        ctx.stroke();
      }
    }
  }, [grid, numRows, numCols, xOffset, yOffset]);

  const sign = (
    p1x: number,
    p1y: number,
    p2x: number,
    p2y: number,
    p3x: number,
    p3y: number,
  ) => {
    return (p1x - p3x) * (p2y - p3y) - (p2x - p3x) * (p1y - p3y);
  };

  const pointInTriangle = (
    px: number,
    py: number,
    ax: number,
    ay: number,
    bx: number,
    by: number,
    cx: number,
    cy: number,
  ) => {
    const s1 = sign(ax, ay, bx, by, px, py);
    const s2 = sign(bx, by, cx, cy, px, py);
    const s3 = sign(cx, cy, ax, ay, px, py);

    const has_neg = s1 < 0 || s2 < 0 || s3 < 0;
    const has_pos = s1 > 0 || s2 > 0 || s3 > 0;

    return !(has_neg && has_pos);
  };

  const getClickedTriangle = (
    event: React.MouseEvent<HTMLCanvasElement>,
  ): ClickedTriangle | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;

    for (let r = 0; r < numRows; r++) {
      for (let c = 0; c < numCols; c++) {
        let rhombus_base_x =
          c * TRIANGLE_SIDE + (r % 2 === 1 ? TRIANGLE_SIDE / 2 : 0) + xOffset;
        let rhombus_base_y = r * TRIANGLE_HEIGHT + yOffset;

        const up_v1 = {
          x: rhombus_base_x + TRIANGLE_SIDE / 2,
          y: rhombus_base_y,
        };
        const up_v2 = {
          x: rhombus_base_x,
          y: rhombus_base_y + TRIANGLE_HEIGHT,
        };
        const up_v3 = {
          x: rhombus_base_x + TRIANGLE_SIDE,
          y: rhombus_base_y + TRIANGLE_HEIGHT,
        };

        const down_v1 = {
          x: rhombus_base_x + TRIANGLE_SIDE / 2,
          y: rhombus_base_y + RHOMBUS_HEIGHT,
        };
        const down_v2 = {
          x: rhombus_base_x,
          y: rhombus_base_y + TRIANGLE_HEIGHT,
        };
        const down_v3 = {
          x: rhombus_base_x + TRIANGLE_SIDE,
          y: rhombus_base_y + TRIANGLE_HEIGHT,
        };

        if (
          pointInTriangle(
            clickX,
            clickY,
            up_v1.x,
            up_v1.y,
            up_v2.x,
            up_v2.y,
            up_v3.x,
            up_v3.y,
          )
        ) {
          return { r, c, type: "up" };
        }
        if (
          pointInTriangle(
            clickX,
            clickY,
            down_v1.x,
            down_v1.y,
            down_v2.x,
            down_v2.y,
            down_v3.x,
            down_v3.y,
          )
        ) {
          return { r, c, type: "down" };
        }
      }
    }
    return null;
  };

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const clicked = getClickedTriangle(event);
    if (clicked && grid[clicked.r] && grid[clicked.r][clicked.c]) {
      const currentTriangle = grid[clicked.r][clicked.c][clicked.type];

      if (isPickingColor) {
        // Pick color from triangle
        if (currentTriangle.color !== DEFAULT_COLOR) {
          setCurrentColor(currentTriangle.color);
        }
        setIsPickingColor(false);
      } else {
        // Paint triangle
        const newGrid = [...grid];
        const newTriangle = newGrid[clicked.r][clicked.c][clicked.type];

        if (newTriangle.color === currentColor) {
          newTriangle.color = DEFAULT_COLOR;
        } else {
          newTriangle.color = currentColor;
        }

        setGrid(newGrid);
      }
    }
  };

  const handleResize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    calculateGridDimensions();
  }, [calculateGridDimensions]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    calculateGridDimensions();

    const handleResizeEvent = () => handleResize();
    window.addEventListener("resize", handleResizeEvent);
    return () => window.removeEventListener("resize", handleResizeEvent);
  }, [calculateGridDimensions, handleResize]);

  useEffect(() => {
    if (numRows > 0 && numCols > 0) {
      initializeGrid();
    }
  }, [numRows, numCols, initializeGrid]);

  useEffect(() => {
    if (grid.length > 0) {
      drawGrid();
    }
  }, [grid, drawGrid]);

  const clearGrid = () => {
    initializeGrid();
  };

  const saveGrid = () => {
    const gridName =
      prompt("Enter a name for your grid (optional):") ||
      `Grid-${new Date().toLocaleString()}`;

    try {
      const saveData: SavedGrid = {
        gridData: grid,
        numRows,
        numCols,
        xOffset,
        yOffset,
      };
      localStorage.setItem(
        `isometricGrid_${gridName}`,
        JSON.stringify(saveData),
      );
      setSavedGrids((prev) => ({ ...prev, [gridName]: saveData }));
    } catch (e) {
      console.error("Error saving grid:", e);
    }
  };

  const loadGrid = (gridName: string) => {
    const savedGrid = savedGrids[gridName];
    if (savedGrid) {
      setNumRows(savedGrid.numRows);
      setNumCols(savedGrid.numCols);
      setXOffset(savedGrid.xOffset);
      setYOffset(savedGrid.yOffset);
      setGrid(savedGrid.gridData);
    }
  };

  const deleteGrid = (gridName: string) => {
    if (confirm(`Are you sure you want to delete "${gridName}"?`)) {
      localStorage.removeItem(`isometricGrid_${gridName}`);
      setSavedGrids((prev) => {
        const newGrids = { ...prev };
        delete newGrids[gridName];
        return newGrids;
      });
    }
  };

  const toggleColorPicking = () => {
    setIsPickingColor(!isPickingColor);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-5">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">
        Isometric Grid Paper
      </h1>

      <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4 mb-6">
        <Label htmlFor="colorPicker" className="text-lg text-gray-700">
          Choose Color:
        </Label>
        <input
          type="color"
          id="colorPicker"
          value={currentColor}
          onChange={(e) => setCurrentColor(e.target.value)}
          className="w-12 h-12 rounded-lg border-none cursor-pointer shadow-md hover:shadow-lg transition-shadow"
        />
        <Button
          onClick={toggleColorPicking}
          variant={isPickingColor ? "default" : "outline"}
        >
          {isPickingColor ? "Cancel Pick" : "Pick Color"}
        </Button>
        <Button variant="destructive" onClick={clearGrid}>
          Clear Grid
        </Button>
        <Button variant="secondary" onClick={saveGrid}>
          Save Grid
        </Button>
      </div>

      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        className={`w-full max-w-4xl h-[60vh] md:h-[70vh] lg:h-[80vh] bg-white border-2 border-gray-300 rounded-xl shadow-lg touch-manipulation ${
          isPickingColor ? "cursor-copy" : "cursor-crosshair"
        }`}
        style={{ touchAction: "manipulation" }}
      />

      <div className="mt-8 w-full max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Saved Grids Gallery</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.keys(savedGrids).length === 0 ? (
                <p className="text-gray-500 italic">
                  No grids saved yet. Click "Save Grid" to begin!
                </p>
              ) : (
                Object.entries(savedGrids).map(([name]) => (
                  <div
                    key={name}
                    className="p-4 bg-gray-50 rounded-lg shadow-sm border border-gray-200"
                  >
                    <h3 className="font-semibold text-sm mb-2 truncate">
                      {name}
                    </h3>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => loadGrid(name)}>
                        Load
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteGrid(name)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
