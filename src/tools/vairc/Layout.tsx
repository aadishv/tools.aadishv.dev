import { useState, useEffect, useCallback } from "react";
import { useReplayData, useLocalStorageState } from "./hooks";
import {
  Mosaic,
  MosaicWindow,
  MosaicZeroState,
  createBalancedTreeFromLeaves,
  type MosaicNode,
  type MosaicBranch,
} from "react-mosaic-component";

import { Button } from "../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Switch } from "../../components/ui/switch";
import { Input } from "../../components/ui/input";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs";
import { Label } from "../../components/ui/label";
import {
  AlertCircle,
  Settings,
  RotateCw,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Upload,
} from "lucide-react";

import "react-mosaic-component/react-mosaic-component.css";
import "./app.css";

// Default server configuration
export const DEFAULT_SERVER = "192.168.86.98:5000";

// Replay mode types
export interface ReplayFile {
  timestamp: number;
  filename: string;
  file: File;
  url?: string;
}

export interface ReplayData {
  colorImages: ReplayFile[];
  depthImages: ReplayFile[];
  logFiles: ReplayFile[];
  minTimestamp: number;
  maxTimestamp: number;
  allTimestamps: number[];
}

export type AppMode = "server" | "replay";

// Interfaces
type WindowComponentMap = Record<number, React.ComponentType<any>>;
type WindowTitleMap = Record<number, string>;

export interface Detection {
  x: number;
  y: number;
  width: number;
  height: number;
  class: string;
  confidence: number;
  depth?: number;
  fx?: number;
  fy?: number;
  fz?: number;
}

export interface Pose {
  x: number;
  y: number;
  theta: number;
}

export interface JetsonStats {
  cpu_temp: number;
  gpu_temp: number;
  uptime: number;
}

export interface DetectionPayload {
  stuff: Detection[];
  pose?: Pose;
  flag?: string;
  jetson?: JetsonStats;
}

interface WindowProps {
  path: MosaicBranch[];
  component: React.ComponentType<any>;
  title: string;
  latestDetections: DetectionPayload | null;
  serverConfig: string;
  replayData?: {
    colorImageUrl?: string;
    depthImageUrl?: string;
  };
}

interface LayoutProps {
  windowComponents: WindowComponentMap;
  windowTitles?: WindowTitleMap;
}

// SSE Hook for detection data
export function useSSEDetections(
  server: string,
  endpoint: string = "events",
  initialValue: DetectionPayload | null = null,
): { detections: DetectionPayload | null; connectionError: boolean } {
  const [detections, setDetections] = useState<DetectionPayload | null>(
    initialValue,
  );
  const [connectionError, setConnectionError] = useState<boolean>(false);

  useEffect(() => {
    // Skip connection if server is not provided
    if (!server) {
      console.warn("Server address is not provided. Skipping connection.");
      setDetections(initialValue);
      return;
    }

    // Always use HTTP protocol since the Flask server is HTTP-only
    // This will work in HTTP contexts, and we'll handle the error in HTTPS contexts
    const url = `http://${server}/${endpoint}`;
    console.log(`Attempting to connect to SSE endpoint: ${url}`);

    let eventSource: EventSource;

    try {
      eventSource = new EventSource(url);
    } catch (error) {
      console.error("Failed to create EventSource:", error);
      setConnectionError(true);
      setDetections(initialValue);
      return;
    }

    // Handle incoming messages
    eventSource.onmessage = (event: MessageEvent) => {
      try {
        // Parse the JSON data
        const parsedData = JSON.parse(event.data);

        // Validate that the parsed data has the expected structure
        if (!parsedData || typeof parsedData !== "object") {
          console.error("Invalid SSE data format: Not an object", event.data);
          return;
        }

        // Validate that 'stuff' array exists
        if (!Array.isArray(parsedData.stuff)) {
          console.error(
            'Invalid SSE data: Missing or invalid "stuff" array',
            event.data,
          );
          // Continue processing anyway as some features might still work without detections
        }

        // If pose is present, ensure it has the right structure
        if (
          parsedData.pose &&
          (typeof parsedData.pose !== "object" ||
            typeof parsedData.pose.x !== "number" ||
            typeof parsedData.pose.y !== "number" ||
            typeof parsedData.pose.theta !== "number")
        ) {
          console.warn("Invalid pose data in SSE message", parsedData.pose);
          // Don't return, still process the rest of the data
        }

        // Cast to our type and set state
        const data: DetectionPayload = parsedData;
        setDetections(data);
        setConnectionError(false); // Reset connection error state on successful data
      } catch (error) {
        console.error("Failed to parse SSE data:", error);
        // Log the first 200 chars of the data to avoid flooding the console
        const truncatedData =
          typeof event.data === "string"
            ? event.data.length > 200
              ? event.data.substring(0, 200) + "..."
              : event.data
            : "non-string data";
        console.debug("Raw data sample:", truncatedData);
      }
    };

    // Handle connection errors
    eventSource.onerror = (error) => {
      console.error("SSE connection error", error);
      setConnectionError(true);
      setDetections(initialValue);
      eventSource.close();
    };

    // Cleanup function
    return () => {
      console.log(`Closing SSE connection to: ${url}`);
      eventSource.close();
    };
  }, [server, endpoint]);

  return { detections, connectionError };
}

// Window Component
const Window = ({
  path,
  component: WindowComponent,
  title,
  latestDetections,
  serverConfig,
  replayData,
}: WindowProps) => {
  return (
    <MosaicWindow<number> path={path} title={title} additionalControls={[]}>
      <WindowComponent
        latestDetections={latestDetections}
        serverConfig={serverConfig}
        replayData={replayData}
      />
    </MosaicWindow>
  );
};

// Playback Controls Component
const PlaybackControls: React.FC<{
  isPlaying: boolean;
  currentFrame: number;
  totalFrames: number;
  onPlay: () => void;
  onPause: () => void;
  onSeekToFrame: (frame: number) => void;
  onStepBackward: () => void;
  onStepForward: () => void;
}> = ({
  isPlaying,
  currentFrame,
  totalFrames,
  onPlay,
  onPause,
  onSeekToFrame,
  onStepBackward,
  onStepForward,
}) => {
  return (
    <div className="playback-controls">
      <button
        onClick={onStepBackward}
        title="Previous frame"
        disabled={currentFrame <= 0}
      >
        <SkipBack className="h-4 w-4" />
      </button>

      <button
        onClick={isPlaying ? onPause : onPlay}
        title={isPlaying ? "Pause" : "Play"}
      >
        {isPlaying ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4" />
        )}
      </button>

      <button
        onClick={onStepForward}
        title="Next frame"
        disabled={currentFrame >= totalFrames - 1}
      >
        <SkipForward className="h-4 w-4" />
      </button>

      <div className="playback-timeline">
        <span className="playback-time">
          {currentFrame + 1} / {totalFrames}
        </span>
        <input
          type="range"
          min={0}
          max={totalFrames - 1}
          value={currentFrame}
          onChange={(e) => onSeekToFrame(parseInt(e.target.value))}
          className="playback-slider"
        />
      </div>
    </div>
  );
};

// Header Component
const Header: React.FC<{
  onToggleSettings: () => void;
  connectionError: boolean;
  serverConfig: string;
  appMode: AppMode;
  replayControls?: {
    isPlaying: boolean;
    currentFrame: number;
    totalFrames: number;
    onPlay: () => void;
    onPause: () => void;
    onSeekToFrame: (frame: number) => void;
    onStepBackward: () => void;
    onStepForward: () => void;
  };
  jetsonStats?: {
    cpu_temp: number;
    gpu_temp: number;
    uptime: number;
  } | null;
}> = ({
  onToggleSettings,
  connectionError,
  serverConfig,
  appMode,
  replayControls,
  jetsonStats,
}) => {
  // Function to reload the page
  const handleReload = () => {
    window.location.reload();
  };

  // Format uptime in DD:HH:MM:SS
  const formatUptime = (uptime: number) => {
    const days = Math.floor(uptime / (24 * 3600));
    const hours = Math.floor((uptime % (24 * 3600)) / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);
    const pad = (num: number) => String(num).padStart(2, "0");
    return `${pad(days)}:${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  };

  return (
    <header className="border-b">
      <div className="flex items-center justify-between py-4 px-5 w-[100vw]">
        <div className="flex items-center h-16 ml-0">
          <img
            src="/tools/vairc/paradigm.jpg"
            alt="Paradigm Logo"
            className="h-full border-r pr-4 mr-4"
            style={{ mixBlendMode: "multiply" }}
          />
          <img
            src="/tools/vairc/vairc.png"
            alt="VAIRC Logo"
            className="h-full"
          />
        </div>

        {/* Jetson stats for live mode */}
        {appMode === "server" && jetsonStats && (
          <div className="flex-1 flex justify-center mx-4">
            <div className="flex gap-6 items-center bg-white border border-gray-200 rounded-lg px-4 py-2 shadow-sm">
              <div className="flex flex-col items-center">
                <span className="text-xs text-gray-500">CPU Temp</span>
                <span className="text-lg font-mono font-semibold">
                  {jetsonStats.cpu_temp.toFixed(1)}°C
                </span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-xs text-gray-500">GPU Temp</span>
                <span className="text-lg font-mono font-semibold">
                  {jetsonStats.gpu_temp.toFixed(1)}°C
                </span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-xs text-gray-500">Uptime</span>
                <span className="text-lg font-mono font-semibold">
                  {formatUptime(jetsonStats.uptime)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Playback controls for replay mode */}
        {appMode === "replay" && replayControls && (
          <div className="flex-1 flex justify-center mx-4">
            <PlaybackControls {...replayControls} />
          </div>
        )}

        {/* Connection error warning */}
        {connectionError && appMode === "server" && (
          <div className="flex-1 mx-4">
            <div className="border rounded-md bg-destructive/10 p-3 text-destructive flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                <span>
                  Connection error: Cannot connect to server at{" "}
                  <code className="bg-destructive/20 p-0.5 rounded text-xs font-mono">
                    {serverConfig}
                  </code>
                </span>
              </div>
              <Button variant="outline" size="sm" onClick={handleReload}>
                <RotateCw className="h-3.5 w-3.5 mr-1" />
                Reload
              </Button>
            </div>
          </div>
        )}

        <Button variant="outline" onClick={onToggleSettings} className="gap-2">
          <Settings className="h-4 w-4" />
          Settings
        </Button>
      </div>
    </header>
  );
};

// Settings Modal
interface SettingsModalProps {
  isOpen: boolean;
  windowVisibility: Record<number, boolean>;
  windowTitles?: WindowTitleMap;
  serverConfig: string;
  appMode: AppMode;
  onClose: () => void;
  onToggle: (windowId: number) => void;
  onServerConfigChange: (config: string) => void;
  onAppModeChange: (mode: AppMode) => void;
  onReplayDataUpload: (data: ReplayData) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  windowVisibility,
  windowTitles = {},
  serverConfig,
  appMode,
  onClose,
  onToggle,
  onServerConfigChange,
  onAppModeChange,
  onReplayDataUpload,
}) => {
  if (!isOpen) return null;

  const windowCount = Object.keys(windowVisibility).length;
  const [tempServerConfig, setTempServerConfig] = useState(serverConfig);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Handle server config input change
  const handleServerInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTempServerConfig(e.target.value);
  };

  // Apply server config when user clicks "Apply"
  const handleApplyServerConfig = () => {
    onServerConfigChange(tempServerConfig);
  };

  // Reset to current value
  const handleResetServerConfig = () => {
    setTempServerConfig(serverConfig);
  };

  // Handle folder upload for replay mode
  const handleFolderUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      // Parse uploaded files
      const colorImages: ReplayFile[] = [];
      const depthImages: ReplayFile[] = [];
      const logFiles: ReplayFile[] = [];

      for (const file of Array.from(files)) {
        const pathParts = file.webkitRelativePath.split("/");
        if (pathParts.length < 2) continue;

        const folder = pathParts[pathParts.length - 2];
        const filename = pathParts[pathParts.length - 1];

        // Extract timestamp from filename
        const timestampMatch = filename.match(/^(\d+(?:\.\d+)?)/);
        if (!timestampMatch) continue;

        const timestamp = parseFloat(timestampMatch[1]);

        const replayFile: ReplayFile = {
          timestamp,
          filename,
          file,
          url: URL.createObjectURL(file),
        };

        switch (folder) {
          case "color":
            if (
              file.type.startsWith("image/") ||
              filename.toLowerCase().endsWith(".jpg") ||
              filename.toLowerCase().endsWith(".jpeg")
            ) {
              colorImages.push(replayFile);
            }
            break;
          case "depth":
            if (
              file.type.startsWith("image/") ||
              filename.toLowerCase().endsWith(".jpg") ||
              filename.toLowerCase().endsWith(".jpeg")
            ) {
              depthImages.push(replayFile);
            }
            break;
          case "log":
            if (
              file.type === "application/json" ||
              filename.endsWith(".json")
            ) {
              logFiles.push(replayFile);
            }
            break;
        }
      }

      // Validate we have the required folders
      if (
        colorImages.length === 0 &&
        depthImages.length === 0 &&
        logFiles.length === 0
      ) {
        throw new Error(
          "No valid files found. Please ensure your folder contains color/, depth/, and log/ subfolders with appropriately named files.",
        );
      }

      // Sort by timestamp
      colorImages.sort((a, b) => a.timestamp - b.timestamp);
      depthImages.sort((a, b) => a.timestamp - b.timestamp);
      logFiles.sort((a, b) => a.timestamp - b.timestamp);

      // Find all unique timestamps and sort them
      const allTimestampsSet = new Set([
        ...colorImages.map((f) => f.timestamp),
        ...depthImages.map((f) => f.timestamp),
        ...logFiles.map((f) => f.timestamp),
      ]);
      const allTimestamps = Array.from(allTimestampsSet).sort((a, b) => a - b);

      const replayData: ReplayData = {
        colorImages,
        depthImages,
        logFiles,
        minTimestamp: allTimestamps[0],
        maxTimestamp: allTimestamps[allTimestamps.length - 1],
        allTimestamps,
      };

      onReplayDataUpload(replayData);

      // Clear the input
      e.target.value = "";
    } catch (error) {
      setUploadError(
        error instanceof Error
          ? error.message
          : "Failed to process uploaded files",
      );
    } finally {
      setIsUploading(false);
    }
  };

  // Initialize tempServerConfig when the modal opens or serverConfig changes
  useEffect(() => {
    setTempServerConfig(serverConfig);
  }, [serverConfig, isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Configure your VAIRC dashboard settings
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Window Visibility Section */}
          <div>
            <h3 className="text-lg font-medium mb-3">
              Toggle Window Visibility
            </h3>
            <div className="space-y-4">
              {Array.from({ length: windowCount }).map((_, index) => {
                const windowId = index + 1;
                const title = windowTitles[windowId] ?? `Window ${windowId}`;
                const shouldRender = windowTitles[windowId] !== undefined;

                return shouldRender ? (
                  <div
                    key={windowId}
                    className="flex items-center justify-between"
                  >
                    <label
                      htmlFor={`window-${windowId}`}
                      className="text-sm cursor-pointer"
                    >
                      {title}
                    </label>
                    <Switch
                      id={`window-${windowId}`}
                      checked={windowVisibility[windowId] || false}
                      onCheckedChange={(checked) => {
                        if (checked !== windowVisibility[windowId]) {
                          onToggle(windowId);
                        }
                      }}
                    />
                  </div>
                ) : null;
              })}
            </div>
          </div>

          {/* Data Source Configuration */}
          <div>
            <h3 className="text-lg font-medium mb-3">Data Source</h3>
            <Tabs
              value={appMode}
              onValueChange={(value) => onAppModeChange(value as AppMode)}
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="server">Live Server</TabsTrigger>
                <TabsTrigger value="replay">Replay Mode</TabsTrigger>
              </TabsList>

              <TabsContent value="server" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="server-config">Server Host:Port</Label>
                  <div className="flex gap-2">
                    <Input
                      id="server-config"
                      value={tempServerConfig}
                      onChange={handleServerInputChange}
                      placeholder="host:port"
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleApplyServerConfig}
                    >
                      Apply
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleResetServerConfig}
                    >
                      Reset
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Example: 192.168.86.98:5000
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="replay" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="folder-upload">Upload Session Folder</Label>
                  <div className="upload-area">
                    <input
                      id="folder-upload"
                      type="file"
                      // @ts-ignore - webkitdirectory is supported but not in types
                      webkitdirectory=""
                      multiple
                      onChange={handleFolderUpload}
                      disabled={isUploading}
                      className="hidden"
                    />
                    <Label
                      htmlFor="folder-upload"
                      className="cursor-pointer flex flex-col items-center gap-2"
                    >
                      <Upload className="h-8 w-8 text-gray-400" />
                      <span className="text-sm">
                        {isUploading
                          ? "Processing files..."
                          : "Click to select session folder"}
                      </span>
                    </Label>
                  </div>
                  {uploadError && (
                    <p className="text-sm text-red-600">{uploadError}</p>
                  )}
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>Select a folder containing:</p>
                    <ul className="list-disc list-inside ml-4 space-y-0.5">
                      <li>
                        <code className="bg-gray-100 px-1 rounded">color/</code>{" "}
                        - .jpg image files
                      </li>
                      <li>
                        <code className="bg-gray-100 px-1 rounded">depth/</code>{" "}
                        - .jpg image files
                      </li>
                      <li>
                        <code className="bg-gray-100 px-1 rounded">log/</code> -
                        .json detection files
                      </li>
                    </ul>
                    <p className="text-xs">
                      Files should be named with UNIX timestamps (e.g.,
                      1748668241.7916987.jpg)
                    </p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Constants for localStorage keys
const LAYOUT_STORAGE_KEY = "vairc-mosaic-layout";
const VISIBILITY_STORAGE_KEY = "vairc-window-visibility";
const SERVER_CONFIG_KEY = "vairc-server-config";
const APP_MODE_KEY = "vairc-app-mode";

// Main Layout Component
export const Layout: React.FC<LayoutProps> = ({
  windowComponents,
  windowTitles = {},
}) => {
  const [currentNode, setCurrentNode] = useState<MosaicNode<number> | null>(
    null,
  );
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [serverConfig, setServerConfig] = useLocalStorageState<string>(
    SERVER_CONFIG_KEY,
    DEFAULT_SERVER,
  );

  const [appMode, setAppMode] = useLocalStorageState<AppMode>(
    APP_MODE_KEY,
    "server",
  );

  const {
    replayData,
    currentReplayIndex,
    isReplayPlaying,
    handleReplayPlay,
    handleReplayPause,
    handleReplaySeekToFrame,
    handleStepBackward,
    handleStepForward,
    handleReplayDataUpload,
    currentReplayImages,
    latestDetections,
    setLatestDetections,
  } = useReplayData(appMode);

  // SSE detections (only used in server mode)
  const { detections: sseDetections, connectionError } = useSSEDetections(
    appMode === "server" ? serverConfig : "",
    "events",
    { stuff: [] }, // Provide a default with empty stuff array
  );

  const [windowVisibility, setWindowVisibility] = useLocalStorageState<
    Record<number, boolean>
  >(
    VISIBILITY_STORAGE_KEY,
    (() => {
      const initialVisibility: Record<number, boolean> = {};
      const componentKeys = Object.keys(windowComponents)
        .map(Number)
        .sort((a, b) => a - b);
      for (const id of componentKeys) {
        initialVisibility[id] = false;
      }
      if (componentKeys.length > 0) {
        initialVisibility[componentKeys[0]] = true;
      }
      return initialVisibility;
    })(),
  );

  // Update detections based on app mode
  useEffect(() => {
    if (appMode === "server") {
      setLatestDetections(sseDetections);
    }
  }, [appMode, sseDetections, setLatestDetections]);

  // Try to restore layout from localStorage on component mount
  useEffect(() => {
    try {
      const savedLayout = localStorage.getItem(LAYOUT_STORAGE_KEY);
      if (savedLayout) {
        const layout = JSON.parse(savedLayout);
        if (layout !== null) {
          setCurrentNode(layout);
        } else {
          setCurrentNode(null);
        }
      }
    } catch {}
  }, []);

  // Update the mosaic layout when window visibility changes
  const updateNodeStructure = useCallback(() => {
    const visibleWindows = Object.entries(windowVisibility)
      .filter(([, isVisible]) => isVisible)
      .map(([idStr]) => parseInt(idStr))
      .filter((id) => windowComponents[id]);
    const newNode =
      visibleWindows.length === 0
        ? null
        : createBalancedTreeFromLeaves(visibleWindows);
    setCurrentNode(newNode);
  }, [windowVisibility, windowComponents]);

  useEffect(() => {
    updateNodeStructure();
  }, [windowVisibility, updateNodeStructure]);

  // Toggle window visibility
  const toggleWindowVisibility = useCallback(
    (windowId: number) => {
      if (windowComponents[windowId]) {
        setWindowVisibility({
          ...windowVisibility,
          [windowId]: !windowVisibility[windowId],
        });
      }
    },
    [windowComponents, setWindowVisibility, windowVisibility],
  );

  // Toggle settings modal
  const toggleSettings = useCallback(() => {
    setIsSettingsOpen((open) => !open);
  }, []); // No dependencies

  // Update server configuration
  const handleServerConfigChange = useCallback(
    (newConfig: string) => setServerConfig(newConfig),
    [setServerConfig],
  );

  // Handle app mode change
  const handleAppModeChange = useCallback(
    (newMode: AppMode) => setAppMode(newMode),
    [setAppMode],
  );

  // Create a new window from the zero state
  // This function is called by react-mosaic when the zero state button is clicked.
  // It MUST return a MosaicNode<number> (a number) or a Promise resolving to one.
  // It cannot return null or undefined.
  const createNewWindow = useCallback(() => {
    const availableComponentIds = Object.keys(windowComponents)
      .map(Number)
      .sort((a, b) => a - b);
    // Find the first window ID that is currently hidden
    const firstHiddenId = availableComponentIds.find(
      (id) => !windowVisibility[id],
    );

    let nodeIdToCreate: number;

    if (firstHiddenId !== undefined) {
      // Found a hidden window, use this ID
      nodeIdToCreate = firstHiddenId;
      console.log(
        `MosaicZeroState createNode: Adding first hidden window ${nodeIdToCreate}`,
      );
    } else {
      // This case indicates a potential logic error if windowComponents is non-empty
      // and all windows are already visible. MosaicZeroState shouldn't be visible then.
      // If windowComponents is empty, there's a deeper issue handled below.
      console.error(
        "Logic Error: createNewWindow called but no hidden windows found to add. Falling back to first available ID if possible.",
      );
      // Fallback: find any available ID (the first one).
      const anyAvailableId = availableComponentIds[0];
      if (anyAvailableId === undefined) {
        // If windowComponents is empty, we truly cannot create anything.
        // This indicates a setup error. Throwing is appropriate.
        throw new Error(
          "Cannot create new window: No components defined in windowComponents.",
        );
      }
      // Fallback to the first available ID (which must be visible)
      nodeIdToCreate = anyAvailableId;
      console.warn(
        `Falling back to using first available window ${nodeIdToCreate} for createNode, but it should ideally be hidden.`,
      );
    }

    // Toggle the visibility of the chosen window ID.
    // This state change will trigger the useEffect watching windowVisibility,
    // which calls updateNodeStructure to rebuild the layout.
    // Note: If firstHiddenId was not found and we used an already visible ID,
    // toggleWindowVisibility will actually make it hidden. This is an edge case
    // that indicates createNewWindow was called inappropriately (e.g., zero state
    // shown when all windows are visible). The expected flow is that zero state
    // is only shown when currentNode is null (meaning no windows are visible).
    toggleWindowVisibility(nodeIdToCreate);

    // Return the ID of the window to react-mosaic.
    // This is a MosaicNode<number> (a leaf node), satisfying the type requirement.
    // The ID returned here is the 'preferred' ID to add. Mosaic might add it
    // differently based on context (e.g., replacing the zero state).
    return nodeIdToCreate;
  }, [windowVisibility, toggleWindowVisibility, windowComponents]);

  // Save layout to localStorage when it changes (via drag/resize)
  const handleLayoutChange = useCallback(
    (newNode: MosaicNode<number> | null) => {
      // console.log('Mosaic layout changed:', newNode); // Too noisy
      setCurrentNode(newNode);

      // Save to localStorage
      try {
        if (newNode) {
          localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(newNode));
          // console.log('Saved layout to localStorage'); // Too noisy
        } else {
          // If layout is null, remove from localStorage
          localStorage.removeItem(LAYOUT_STORAGE_KEY);
          console.log("Removed layout from localStorage (became empty)");
        }
      } catch (error) {
        console.warn("Failed to save layout to localStorage:", error);
      }
    },
    [],
  ); // No dependencies needed as it only uses its argument and localStorage API

  // Optional: Log state changes for debugging
  // useEffect(() => {
  //   console.log("Current window visibility state:", windowVisibility);
  // }, [windowVisibility]);

  // useEffect(() => {
  //   console.log("Current Mosaic node state:", currentNode);
  // }, [currentNode]);

  return (
    <div className="vairc-layout">
      <Header
        onToggleSettings={toggleSettings}
        connectionError={connectionError}
        serverConfig={serverConfig}
        appMode={appMode}
        replayControls={
          appMode === "replay" && replayData
            ? {
                isPlaying: isReplayPlaying,
                currentFrame: currentReplayIndex,
                totalFrames: replayData.allTimestamps.length,
                onPlay: handleReplayPlay,
                onPause: handleReplayPause,
                onSeekToFrame: handleReplaySeekToFrame,
                onStepBackward: handleStepBackward,
                onStepForward: handleStepForward,
              }
            : undefined
        }
        jetsonStats={
          appMode === "server" && latestDetections && latestDetections.jetson
            ? latestDetections.jetson
            : undefined
        }
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        windowVisibility={windowVisibility}
        windowTitles={windowTitles}
        serverConfig={serverConfig}
        appMode={appMode}
        onClose={toggleSettings}
        onToggle={toggleWindowVisibility}
        onServerConfigChange={handleServerConfigChange}
        onAppModeChange={handleAppModeChange}
        onReplayDataUpload={handleReplayDataUpload}
      />

      <div className="vairc-mosaic-container">
        <Mosaic<number>
          renderTile={(id, path) => {
            const WindowComponent = windowComponents[id];
            const title = windowTitles[id] ?? `Window ${id}`;
            return WindowComponent ? (
              <Window
                path={path}
                component={WindowComponent}
                title={title}
                latestDetections={latestDetections}
                serverConfig={serverConfig}
                replayData={
                  appMode === "replay" ? currentReplayImages : undefined
                }
              />
            ) : (
              <MosaicWindow path={path} title={`Unknown Window ${id}`}>
                <div>Component not found for ID {id}</div>
              </MosaicWindow>
            );
          }}
          zeroStateView={<MosaicZeroState createNode={createNewWindow} />}
          value={currentNode}
          onChange={handleLayoutChange}
        />
      </div>
    </div>
  );
};
