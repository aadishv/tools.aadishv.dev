// Centralized types for VAIRC dashboard

// App mode
export type AppMode = "server" | "replay";

// Detection object
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

// Robot pose
export interface Pose {
  x: number;
  y: number;
  theta: number;
}

// Jetson system stats
export interface JetsonStats {
  cpu_temp: number;
  gpu_temp: number;
  uptime: number;
}

// Detection payload from server or log
export interface DetectionPayload {
  stuff: Detection[];
  pose?: Pose;
  flag?: string;
  jetson?: JetsonStats;
}

// Replay file (image or log)
export interface ReplayFile {
  timestamp: number;
  filename: string;
  file: File;
  url?: string;
}

// Replay session data
export interface ReplayData {
  colorImages: ReplayFile[];
  depthImages: ReplayFile[];
  logFiles: ReplayFile[];
  minTimestamp: number;
  maxTimestamp: number;
  allTimestamps: number[];
}

// Window component mapping
export type WindowComponentMap = Record<number, React.ComponentType<any>>;
export type WindowTitleMap = Record<number, string>;

// Detection context types
export type HighlightSource = "details-panel" | "field-view" | "other" | null;

export interface DetectionContextType {
  highlightedDetection: Detection | null;
  highlightSource: HighlightSource;
  setHighlightedDetection: (
    detection: Detection | null,
    source?: HighlightSource,
  ) => void;
}
