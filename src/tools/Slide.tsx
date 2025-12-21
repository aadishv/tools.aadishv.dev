import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const GRID_SIZE = 4;
const TILE_COUNT = GRID_SIZE * GRID_SIZE;
const EMPTY_INDEX = TILE_COUNT - 1;
const DEFAULT_IMAGE_URL = "https://i.imgur.com/y2h8wno.png";
const CUSTOM_IMAGE_KEY = "slide-puzzle-custom-image";
const MAX_IMAGE_SIZE = 600; // Maximum width/height for puzzle images

function generateSolvedTiles() {
  return Array.from({ length: TILE_COUNT }, (_, i) =>
    i === EMPTY_INDEX ? null : i + 1,
  );
}

function isSolved(tiles: (number | null)[]) {
  for (let i = 0; i < EMPTY_INDEX; i++) {
    if (tiles[i] !== i + 1) return false;
  }
  return tiles[EMPTY_INDEX] === null;
}

function formatTime(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const hundredths = Math.floor((ms % 1000) / 10);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
    2,
    "0",
  )}.${String(hundredths).padStart(2, "0")}`;
}

function getCoords(index: number) {
  return { row: Math.floor(index / GRID_SIZE), col: index % GRID_SIZE };
}

function getIndex(row: number, col: number) {
  return row * GRID_SIZE + col;
}

function swap(arr: (number | null)[], i: number, j: number) {
  const newArr = [...arr];
  [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  return newArr;
}

export default function Slide() {
  const [tiles, setTiles] = useState<(number | null)[]>(generateSolvedTiles());
  const [moves, setMoves] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [solved, setSolved] = useState(true);
  const [isShuffling, setIsShuffling] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [tileImages, setTileImages] = useState<string[]>([]);
  const [tileRects, setTileRects] = useState<
    { x: number; y: number; width: number; height: number }[]
  >([]);
  const [imgDims, setImgDims] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [useCustomImage, setUseCustomImage] = useState(false);
  const [customImageUrl, setCustomImageUrl] = useState<string | null>(null);

  // Timer effect
  useEffect(() => {
    if (!timerActive) return;
    const interval = setInterval(() => {
      setTimeElapsed((t) => t + 10);
    }, 10);
    return () => clearInterval(interval);
  }, [timerActive]);

  // Shuffle logic
  const shuffleBoard = useCallback(() => {
    setIsShuffling(true);
    setMoves(0);
    setTimeElapsed(0);
    setTimerActive(false);
    setSolved(false);

    let currentTiles = generateSolvedTiles();
    let emptyIdx = EMPTY_INDEX;
    const movesCount = 200;

    for (let i = 0; i < movesCount; i++) {
      const { row, col } = getCoords(emptyIdx);
      const possible: number[] = [];
      if (row > 0) possible.push(getIndex(row - 1, col));
      if (row < GRID_SIZE - 1) possible.push(getIndex(row + 1, col));
      if (col > 0) possible.push(getIndex(row, col - 1));
      if (col < GRID_SIZE - 1) possible.push(getIndex(row, col + 1));
      const swapIdx = possible[Math.floor(Math.random() * possible.length)];
      currentTiles = swap(currentTiles, emptyIdx, swapIdx);
      emptyIdx = swapIdx;
    }
    setTiles(currentTiles);
    setIsShuffling(false);
  }, []);

  // Tile click logic
  function handleTileClick(idx: number) {
    if (isShuffling || solved) return;
    const emptyIdx = tiles.indexOf(null);
    const { row: er, col: ec } = getCoords(emptyIdx);
    const { row: tr, col: tc } = getCoords(idx);

    // Only allow if in same row or column and not already the empty tile
    if ((er === tr || ec === tc) && idx !== emptyIdx) {
      let newTiles = [...tiles];
      if (er === tr) {
        if (ec < tc) {
          // Move left to right
          for (let c = ec; c < tc; c++) {
            newTiles[getIndex(er, c)] = newTiles[getIndex(er, c + 1)];
          }
        } else {
          // Move right to left
          for (let c = ec; c > tc; c--) {
            newTiles[getIndex(er, c)] = newTiles[getIndex(er, c - 1)];
          }
        }
        newTiles[getIndex(er, tc)] = null;
      } else if (ec === tc) {
        // Same column: slide vertically

        if (er < tr) {
          // Move top to bottom
          for (let r = er; r < tr; r++) {
            newTiles[getIndex(r, ec)] = newTiles[getIndex(r + 1, ec)];
          }
        } else {
          // Move bottom to top
          for (let r = er; r > tr; r--) {
            newTiles[getIndex(r, ec)] = newTiles[getIndex(r - 1, ec)];
          }
        }
        newTiles[getIndex(tr, ec)] = null;
      }
      setTiles(newTiles);
      setMoves((m) => m + 1);
      if (!timerActive) setTimerActive(true);
      if (isSolved(newTiles)) {
        setSolved(true);
        setTimerActive(false);
      }
    }
  }

  // Reset/shuffle
  function handleReset() {
    setShowConfirm(false);
    shuffleBoard();
  }

  // File input (image upload)
  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Please select a valid image file.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        // Save to localStorage
        localStorage.setItem(CUSTOM_IMAGE_KEY, result);
        setCustomImageUrl(result);
        setUseCustomImage(true);
        loadImageAndGenerateTiles(result);
      }
    };
    reader.readAsDataURL(file);

    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // Image loading and tile generation
  function loadImageAndGenerateTiles(imageUrl: string) {
    function resizeImage(img: HTMLImageElement): {
      width: number;
      height: number;
    } {
      let { width, height } = img;

      // Calculate scale factor to fit within MAX_IMAGE_SIZE while maintaining aspect ratio
      const scale = Math.min(MAX_IMAGE_SIZE / width, MAX_IMAGE_SIZE / height);

      if (scale < 1) {
        width = Math.floor(width * scale);
        height = Math.floor(height * scale);
      }

      return { width, height };
    }

    function getTileRects(imgWidth: number, imgHeight: number) {
      const rects = [];
      let y = 0;
      for (let row = 0; row < GRID_SIZE; row++) {
        let x = 0;
        const isLastRow = row === GRID_SIZE - 1;
        const remainingRows = GRID_SIZE - row;
        const tileHeight = isLastRow
          ? imgHeight - y
          : Math.round((imgHeight - y) / remainingRows);
        for (let col = 0; col < GRID_SIZE; col++) {
          const isLastCol = col === GRID_SIZE - 1;
          const remainingCols = GRID_SIZE - col;
          const tileWidth = isLastCol
            ? imgWidth - x
            : Math.round((imgWidth - x) / remainingCols);
          rects.push({ x, y, width: tileWidth, height: tileHeight });
          x += tileWidth;
        }
        y += tileHeight;
      }
      return rects;
    }

    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.src = imageUrl;
    img.onload = () => {
      const { width: resizedWidth, height: resizedHeight } = resizeImage(img);

      // Create a canvas to resize the image
      const resizeCanvas = document.createElement("canvas");
      const resizeCtx = resizeCanvas.getContext("2d");
      resizeCanvas.width = resizedWidth;
      resizeCanvas.height = resizedHeight;
      resizeCtx!.drawImage(img, 0, 0, resizedWidth, resizedHeight);

      const rects = getTileRects(resizedWidth, resizedHeight);
      setTileRects(rects);
      setImgDims({ width: resizedWidth, height: resizedHeight });

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const images: string[] = [];

      for (let i = 0; i < TILE_COUNT - 1; i++) {
        const { x, y, width, height } = rects[i];
        canvas.width = width;
        canvas.height = height;
        ctx!.clearRect(0, 0, width, height);
        ctx!.drawImage(resizeCanvas, x, y, width, height, 0, 0, width, height);
        images[i] = canvas.toDataURL();
      }
      setTileImages(images);
      shuffleBoard();
    };
  }

  // Toggle between custom and default image
  function toggleImageSource() {
    const newUseCustomImage = !useCustomImage;
    setUseCustomImage(newUseCustomImage);

    if (newUseCustomImage && customImageUrl) {
      loadImageAndGenerateTiles(customImageUrl);
    } else {
      loadImageAndGenerateTiles(DEFAULT_IMAGE_URL);
    }
  }

  // Remove custom image
  function removeCustomImage() {
    localStorage.removeItem(CUSTOM_IMAGE_KEY);
    setCustomImageUrl(null);
    setUseCustomImage(false);
    loadImageAndGenerateTiles(DEFAULT_IMAGE_URL);
  }

  // On mount: load saved custom image or default, then slice into tiles and shuffle
  useEffect(() => {
    // Check for saved custom image
    const savedCustomImage = localStorage.getItem(CUSTOM_IMAGE_KEY);
    if (savedCustomImage) {
      setCustomImageUrl(savedCustomImage);
      setUseCustomImage(true);
      loadImageAndGenerateTiles(savedCustomImage);
    } else {
      loadImageAndGenerateTiles(DEFAULT_IMAGE_URL);
    }
    // eslint-disable-next-line
  }, []);

  return (
    <div className="flex flex-row items-center justify-center min-h-screen gap-16 bg-background">
      <style>
        {`
          .puzzle-tile-anim {
            transition: left 0.12s cubic-bezier(0.4,0,0.2,1), top 0.12s cubic-bezier(0.4,0,0.2,1);
            will-change: left, top;
          }
          .empty-space {
            background: repeating-linear-gradient(
              45deg,
              #f0f0f0,
              #f0f0f0 8px,
              #e0e0e0 8px,
              #e0e0e0 16px
            );
            border: 2px dashed #d0d0d0;
            border-radius: 4px;
          }
        `}
      </style>
      <div
        className="relative rounded-xl"
        style={{
          width: imgDims?.width,
          height: imgDims?.height,
          minWidth: imgDims?.width,
          minHeight: imgDims?.height,
        }}
      >
        {/* Empty space indicator */}
        {tiles.indexOf(null) !== -1 && imgDims && (
          <div
            className="absolute empty-space"
            style={{
              left: tileRects[tiles.indexOf(null)]?.x || 0,
              top: tileRects[tiles.indexOf(null)]?.y || 0,
              width: tileRects[tiles.indexOf(null)]?.width || 0,
              height: tileRects[tiles.indexOf(null)]?.height || 0,
            }}
          />
        )}
        {Array.from({ length: TILE_COUNT - 1 }).map((_, tileValue) => {
          const idx = tiles.indexOf(tileValue + 1);
          const rect = tileRects[idx];
          if (!rect) return null;
          return (
            <Button
              key={tileValue + 1}
              className="absolute p-0 puzzle-tile-anim"
              style={{
                left: rect.x,
                top: rect.y,
                width: rect.width,
                height: rect.height,
                background: tileImages[tileValue]
                  ? `url(${tileImages[tileValue]})`
                  : "transparent",
                backgroundSize: "cover",
                backgroundPosition: "center",
                opacity: 0.95,
              }}
              onClick={() => handleTileClick(idx)}
              disabled={isShuffling || solved}
              tabIndex={-1}
            />
          );
        })}
      </div>
      <div className="flex flex-col items-stretch">
        <div className="w-full" style={{ minWidth: 340, width: 340 }}>
          <div
            className="rounded-xl border bg-card p-8 flex flex-col gap-8 items-center"
            style={{ minWidth: 300, width: "100%" }}
          >
            <div className="flex flex-col gap-8 w-full">
              <div className="flex flex-col gap-4 w-full">
                <span className="text-3xl font-bold">Moves: {moves}</span>
                <span className="text-3xl font-bold">
                  Time: {formatTime(timeElapsed)}
                </span>
              </div>
              <div className="flex gap-2 w-full">
                <Button
                  variant="outline"
                  size="lg"
                  className="flex-1 text-lg py-4"
                  onClick={() => setShowConfirm(true)}
                  disabled={isShuffling}
                >
                  Reset / Shuffle
                </Button>
              </div>

              <div className="flex flex-col gap-3 w-full">
                <Label htmlFor="image-upload" className="text-lg font-semibold">
                  Custom Image
                </Label>
                <div className="flex gap-2 w-full">
                  <Button
                    variant="outline"
                    size="lg"
                    className="flex-1 text-sm py-3"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isShuffling}
                  >
                    Upload
                  </Button>
                  {customImageUrl && (
                    <Button
                      variant={useCustomImage ? "default" : "outline"}
                      size="lg"
                      className="flex-1 text-sm py-3"
                      onClick={toggleImageSource}
                      disabled={isShuffling}
                    >
                      {useCustomImage ? "Custom" : "Switch"}
                    </Button>
                  )}
                </div>
                {customImageUrl && (
                  <Button
                    variant="destructive"
                    size="sm"
                    className="text-xs py-2"
                    onClick={removeCustomImage}
                    disabled={isShuffling}
                  >
                    Remove Custom
                  </Button>
                )}
                <Input
                  ref={fileInputRef}
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>
              {showConfirm && (
                <div className="flex flex-col gap-2 items-center w-full">
                  <span className="text-base">Are you sure?</span>
                  <div className="flex gap-2 w-full">
                    <Button
                      variant="outline"
                      size="lg"
                      className="flex-1 text-lg py-4"
                      onClick={handleReset}
                      disabled={isShuffling}
                    >
                      Yes
                    </Button>
                    <Button
                      variant="outline"
                      size="lg"
                      className="flex-1 text-lg py-4"
                      onClick={() => setShowConfirm(false)}
                    >
                      No
                    </Button>
                  </div>
                </div>
              )}
            </div>
            {solved && (
              <div className="text-green-600 font-semibold text-2xl text-center mt-4">
                🎉 Puzzle Solved!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
