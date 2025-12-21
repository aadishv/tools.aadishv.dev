import { useCallback, useEffect, useRef, useState } from "react";
import {
  DEFAULT_SERVER,
  type DetectionPayload,
  type Detection,
} from "../Layout";
import { getDetectionColor } from "../utils/colors";
import { safeGetStuff } from "../utils/validation";
import { Switch } from "../../../components/ui/switch";

interface DetectionCanvasProps {
  /** The object containing detection data, or null if none */
  detections: DetectionPayload | null;
  /** URL for the MJPEG image stream */
  imageUrl?: string | null;
  /** Optional server configuration (host:port) */
  serverConfig?: string;
  /** Optional endpoint for the image stream */
  imageEndpoint?: string;
  /** The native width of the image source used for detections */
  originalImageWidth: number;
  /** The native height of the image source used for detections */
  originalImageHeight: number;
  /** Optional Tailwind classes for the container */
  className?: string;
  /** Optional flag to hide the component if no image URL is provided */
  hideWhenNoUrl?: boolean;
}

const DetectionCanvas: React.FC<DetectionCanvasProps> = ({
  detections,
  imageUrl = null,
  serverConfig = DEFAULT_SERVER,
  imageEndpoint,
  originalImageWidth,
  originalImageHeight,
  className = "",
  hideWhenNoUrl = true,
}) => {
  // Refs for canvas and image elements
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // State for image loading and errors

  // State for bounding box toggle with localStorage persistence
  const [showBoundingBoxes, setShowBoundingBoxes] = useState(() => {
    try {
      const saved = localStorage.getItem("vairc-show-bounding-boxes");
      return saved === null ? true : saved === "true";
    } catch {
      return true; // Default to true if localStorage fails
    }
  });

  // URL construction
  const effectiveImageUrl = imageUrl
    ? imageUrl
    : imageEndpoint
      ? `http://${serverConfig}/${imageEndpoint}`
      : null;

  console.log("DetectionCanvas:", {
    imageUrl,
    imageEndpoint,
    effectiveImageUrl,
    hideWhenNoUrl,
    isReplayMode: !!imageUrl,
    serverConfig,
    urlConstruction: {
      imageUrlUndefined: imageUrl === undefined,
      imageEndpointExists: !!imageEndpoint,
      serverConfigExists: !!serverConfig,
      constructedUrl: imageEndpoint
        ? `http://${serverConfig}/${imageEndpoint}`
        : "no endpoint",
    },
  });

  // Draw bounding boxes or clear canvas based on toggle state
  const updateCanvas = useCallback(() => {
    // First ensure we have a valid canvas
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Get parent container dimensions
    const containerRect = canvas.parentElement?.getBoundingClientRect() || {
      width: canvas.offsetWidth,
      height: canvas.offsetHeight,
    };

    // Set canvas size to match container dimensions
    canvas.width = containerRect.width;
    canvas.height = containerRect.height;

    // Always clear the canvas first
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // If boxes should be hidden or we don't have required data, just return after clearing
    if (!showBoundingBoxes || !imageRef.current || !detections) {
      return;
    }

    // Use safe validation utility to get the stuff array (returns empty array if invalid)
    const validDetections = safeGetStuff(detections);

    // If no valid detections to show, just return after clearing
    if (validDetections.length === 0) {
      return;
    }

    // Calculate the scaling factor from original image to displayed image size
    const imageAspectRatio = originalImageWidth / originalImageHeight;
    const containerAspectRatio = containerRect.width / containerRect.height;

    // Calculate display dimensions accounting for aspect ratio
    let displayWidth, displayHeight, offsetX, offsetY;

    if (imageAspectRatio > containerAspectRatio) {
      // Image is wider than container relative to height
      displayWidth = containerRect.width;
      displayHeight = displayWidth / imageAspectRatio;
      offsetX = 0;
      offsetY = (containerRect.height - displayHeight) / 2;
    } else {
      // Image is taller than container relative to width
      displayHeight = containerRect.height;
      displayWidth = displayHeight * imageAspectRatio;
      offsetX = (containerRect.width - displayWidth) / 2;
      offsetY = 0;
    }

    // Calculate the scaling factors
    const scaleX = displayWidth / originalImageWidth;
    const scaleY = displayHeight / originalImageHeight;

    // Drawing settings
    ctx.lineWidth = 2;
    ctx.font = "16px monospace";
    ctx.textBaseline = "bottom";

    // Draw each detection
    validDetections.forEach((d: Detection) => {
      // Skip invalid detections
      if (
        !d ||
        typeof d !== "object" ||
        typeof d.x !== "number" ||
        typeof d.y !== "number" ||
        typeof d.width !== "number" ||
        typeof d.height !== "number" ||
        !d.class
      ) {
        return;
      }

      // Calculate scaled position and dimensions
      const boxWidth = d.width * scaleX;
      const boxHeight = d.height * scaleY;
      // Convert from center coordinates to top-left coordinates
      const x0 = (d.x - d.width / 2) * scaleX + (offsetX || 0);
      const y0 = (d.y - d.height / 2) * scaleY + (offsetY || 0);

      // Get color for this detection class
      const color = getDetectionColor(d.class);

      // Draw bounding box with white outline
      ctx.strokeStyle = color;
      ctx.strokeRect(x0, y0, boxWidth, boxHeight);
      ctx.strokeStyle = "white";
      ctx.strokeRect(x0 + 1, y0 + 1, boxWidth - 2, boxHeight - 2);

      // Prepare label text
      let label = `${d.class} ${d.confidence.toFixed(2)}`;
      if (d.depth !== undefined && d.depth !== null && d.depth >= 0) {
        label += ` d=${d.depth.toFixed(2)}m`;
      }

      // Calculate text dimensions
      const textMetrics = ctx.measureText(label);
      const textWidth = textMetrics.width;
      const textHeight = 12; // Approx height for 12px font
      const padding = 4;

      // Position text above box, or below if it would go off the top
      let textBgY = y0 - textHeight - padding;
      let textY = y0 - padding / 2;

      // If text goes off the top edge, position below
      if (textBgY < 0) {
        textBgY = y0 + boxHeight + padding / 2;
        textY = textBgY + textHeight + padding / 2;
      }

      const textX = x0 + padding / 2 - 2;
      const textBgX = x0 - 2;

      // Draw label background
      ctx.fillStyle = color;
      ctx.fillRect(textBgX, textBgY, textWidth + padding, textHeight + padding);

      // Draw label text
      ctx.fillStyle = "#FFFFFF"; // White text
      ctx.fillText(label, textX, textY);
    });
  }, [detections, originalImageWidth, originalImageHeight, showBoundingBoxes]);

  // Handle image load and resize
  useEffect(() => {
    if (!imageRef.current || !canvasRef.current) return;

    const image = imageRef.current;
    const container = containerRef.current;

    // When image loads
    const handleImageLoad = () => {
      updateCanvas();
    };

    // When window or container resizes
    const handleResize = () => {
      updateCanvas();
    };

    // Simple debounce for resize events
    const debounce = (fn: Function, ms: number) => {
      let timeoutId: ReturnType<typeof setTimeout>;
      return function (...args: any[]) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn.apply(args), ms);
      };
    };

    const debouncedResize = debounce(handleResize, 200);

    // Add event listeners
    image.addEventListener("load", handleImageLoad);
    window.addEventListener("resize", debouncedResize);

    // Set up ResizeObserver for more reliable size changes
    let resizeObserver: ResizeObserver | null = null;
    if (container && "ResizeObserver" in window) {
      resizeObserver = new ResizeObserver(debouncedResize);
      resizeObserver.observe(container);
    }

    // If image is already loaded
    if (image.complete && image.naturalWidth) {
      handleImageLoad();
    }

    // Cleanup
    return () => {
      image.removeEventListener("load", handleImageLoad);
      window.removeEventListener("resize", debouncedResize);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [updateCanvas]);

  // Update canvas when detections or toggle changes
  useEffect(() => {
    updateCanvas();
  }, [detections, showBoundingBoxes, updateCanvas]);

  // Toggle bounding boxes
  const toggleBoundingBoxes = () => {
    const newValue = !showBoundingBoxes;
    setShowBoundingBoxes(newValue);

    // Save to localStorage
    try {
      localStorage.setItem("vairc-show-bounding-boxes", String(newValue));
    } catch (error) {
      console.warn("Failed to save bounding box setting");
    }

    // Force an immediate canvas update
    // This is a backup to ensure the canvas clears immediately when toggled off
    // even if the effect doesn't trigger fast enough
    setTimeout(() => {
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext("2d");
        if (ctx) {
          ctx.clearRect(
            0,
            0,
            canvasRef.current.width,
            canvasRef.current.height,
          );
          if (newValue) {
            // If turning on, force redraw
            updateCanvas();
          }
        }
      }
    }, 0);
  };

  // Hide component if no image URL and hideWhenNoUrl is true
  if (!effectiveImageUrl && hideWhenNoUrl) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden ${className}`}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative w-full h-full">
          {effectiveImageUrl ? (
            <>
              {/* The image element */}
              <img
                ref={imageRef}
                src={effectiveImageUrl}
                alt="Live stream"
                className="absolute top-0 left-0 w-full h-full object-contain"
              />

              {/* Canvas for bounding boxes */}
              <canvas
                ref={canvasRef}
                className="absolute top-0 left-0 w-full h-full pointer-events-none"
              />
            </>
          ) : (
            // Placeholder when no image URL
            <div className="absolute inset-0 bg-gray-300 flex items-center justify-center">
              <div className="text-center text-gray-700">
                <div>No Image Stream</div>
                <div className="text-xs mt-2 font-mono">
                  URL: {effectiveImageUrl || "null"}
                </div>
                <div className="text-xs mt-1">
                  Server: {serverConfig || "undefined"}
                </div>
                <div className="text-xs mt-1">
                  Endpoint: {imageEndpoint || "undefined"}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bounding box toggle control */}
      <div className="absolute top-2 right-2 z-10 bg-white bg-opacity-75 rounded border border-gray-200 px-2 py-1 flex items-center">
        <div className="flex items-center space-x-2">
          <Switch
            id="bounding-boxes-toggle"
            checked={showBoundingBoxes}
            onCheckedChange={toggleBoundingBoxes}
          />
          <label
            htmlFor="bounding-boxes-toggle"
            className="text-xs font-medium text-gray-800 cursor-pointer"
          >
            {showBoundingBoxes ? "Boxes On" : "Boxes Off"}
          </label>
        </div>
      </div>
    </div>
  );
};

export default DetectionCanvas;
