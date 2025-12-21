import { useState, useEffect, useCallback } from "react";
import type {
  AppMode,
  ReplayData,
  ReplayFile,
  DetectionPayload,
} from "./Layout";

/**
 * useLocalStorageState
 * A generic hook for state synchronized with localStorage.
 */
export function useLocalStorageState<T>(
  key: string,
  initialValue: T,
): [T, (value: T) => void] {
  const [state, setState] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored !== null) {
        return JSON.parse(stored) as T;
      }
    } catch {}
    return initialValue;
  });

  const setAndStore = (value: T) => {
    setState(value);
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  };

  return [state, setAndStore];
}

/**
 * useReplayData
 * Encapsulates all replay logic for Layout.
 */
export function useReplayData(appMode: AppMode) {
  const [replayData, setReplayData] = useState<ReplayData | null>(null);
  const [currentReplayIndex, setCurrentReplayIndex] = useState(0);
  const [isReplayPlaying, setIsReplayPlaying] = useState(false);
  const [replayIntervalId, setReplayIntervalId] =
    useState<NodeJS.Timeout | null>(null);
  const [currentReplayImages, setCurrentReplayImages] = useState<{
    colorImageUrl?: string;
    depthImageUrl?: string;
  }>({});
  const [latestDetections, setLatestDetections] =
    useState<DetectionPayload | null>(null);

  // Find file by timestamp helper
  const findFileAtTimestamp = (
    files: ReplayFile[],
    timestamp: number,
  ): ReplayFile | null =>
    files.find((file) => file.timestamp === timestamp) || null;

  // Update replay state for a given index
  const updateReplayState = useCallback(
    async (index: number) => {
      if (!replayData || index < 0 || index >= replayData.allTimestamps.length)
        return;
      const timestamp = replayData.allTimestamps[index];

      // Detections
      const logFile = findFileAtTimestamp(replayData.logFiles, timestamp);
      if (logFile) {
        try {
          const text = await logFile.file.text();
          setLatestDetections(JSON.parse(text));
        } catch {
          setLatestDetections({ stuff: [] });
        }
      } else {
        setLatestDetections({ stuff: [] });
      }

      // Images
      const colorFile = findFileAtTimestamp(replayData.colorImages, timestamp);
      const depthFile = findFileAtTimestamp(replayData.depthImages, timestamp);
      setCurrentReplayImages({
        colorImageUrl: colorFile?.url,
        depthImageUrl: depthFile?.url,
      });
    },
    [replayData],
  );

  // Update replay state when index changes
  useEffect(() => {
    if (appMode === "replay" && replayData) {
      updateReplayState(currentReplayIndex);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appMode, currentReplayIndex, updateReplayState, replayData]);

  // Play
  const handleReplayPlay = useCallback(() => {
    if (
      !replayData ||
      isReplayPlaying ||
      currentReplayIndex >= replayData.allTimestamps.length - 1
    )
      return;

    setIsReplayPlaying(true);
    const intervalId = setInterval(() => {
      setCurrentReplayIndex((prevIndex) => {
        const newIndex = prevIndex + 1;
        if (newIndex >= replayData.allTimestamps.length) {
          setIsReplayPlaying(false);
          clearInterval(intervalId);
          return replayData.allTimestamps.length - 1;
        }
        return newIndex;
      });
    }, 100); // 10fps
    setReplayIntervalId(intervalId);
  }, [replayData, isReplayPlaying, currentReplayIndex]);

  // Pause
  const handleReplayPause = useCallback(() => {
    setIsReplayPlaying(false);
    if (replayIntervalId) {
      clearInterval(replayIntervalId);
      setReplayIntervalId(null);
    }
  }, [replayIntervalId]);

  // Seek
  const handleReplaySeekToFrame = useCallback(
    (frameIndex: number) => {
      if (
        !replayData ||
        frameIndex < 0 ||
        frameIndex >= replayData.allTimestamps.length
      )
        return;
      setCurrentReplayIndex(frameIndex);
      if (isReplayPlaying) {
        handleReplayPause();
        setTimeout(handleReplayPlay, 100);
      }
    },
    [isReplayPlaying, handleReplayPause, handleReplayPlay, replayData],
  );

  // Step backward
  const handleStepBackward = useCallback(() => {
    if (!replayData || currentReplayIndex <= 0) return;
    setCurrentReplayIndex(currentReplayIndex - 1);
  }, [replayData, currentReplayIndex]);

  // Step forward
  const handleStepForward = useCallback(() => {
    if (
      !replayData ||
      currentReplayIndex >= replayData.allTimestamps.length - 1
    )
      return;
    setCurrentReplayIndex(currentReplayIndex + 1);
  }, [replayData, currentReplayIndex]);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (replayIntervalId) clearInterval(replayIntervalId);
    };
  }, [replayIntervalId]);

  // Reset state on mode switch
  useEffect(() => {
    if (appMode === "server") {
      setReplayData(null);
      setCurrentReplayIndex(0);
      setIsReplayPlaying(false);
      setCurrentReplayImages({});
      setLatestDetections(null);
      if (replayIntervalId) {
        clearInterval(replayIntervalId);
        setReplayIntervalId(null);
      }
    } else if (appMode === "replay") {
      setLatestDetections(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appMode]);

  // Handle replay data upload
  const handleReplayDataUpload = useCallback((data: ReplayData) => {
    setReplayData(data);
    setCurrentReplayIndex(0);
    setIsReplayPlaying(false);

    // Initialize with first timestamp
    const firstTimestamp = data.allTimestamps[0];
    const initialColorFile = data.colorImages.find(
      (f) => f.timestamp === firstTimestamp,
    );
    const initialDepthFile = data.depthImages.find(
      (f) => f.timestamp === firstTimestamp,
    );
    const initialLogFile = data.logFiles.find(
      (f) => f.timestamp === firstTimestamp,
    );

    setCurrentReplayImages({
      colorImageUrl: initialColorFile?.url,
      depthImageUrl: initialDepthFile?.url,
    });

    if (initialLogFile) {
      initialLogFile.file.text().then((text) => {
        try {
          setLatestDetections(JSON.parse(text));
        } catch {
          setLatestDetections({ stuff: [] });
        }
      });
    } else {
      setLatestDetections({ stuff: [] });
    }
  }, []);

  return {
    replayData,
    setReplayData,
    currentReplayIndex,
    setCurrentReplayIndex,
    isReplayPlaying,
    setIsReplayPlaying,
    replayIntervalId,
    setReplayIntervalId,
    updateReplayState,
    handleReplayPlay,
    handleReplayPause,
    handleReplaySeekToFrame,
    handleStepBackward,
    handleStepForward,
    handleReplayDataUpload,
    currentReplayImages,
    latestDetections,
    setLatestDetections,
  };
}
