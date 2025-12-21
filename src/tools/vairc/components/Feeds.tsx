import React from "react";
import DetectionCanvas from "./DetectionCanvas";
import { type DetectionPayload } from "../Layout";
import { ensureValidPayload } from "../utils/validation";

interface FeedProps {
  latestDetections: DetectionPayload;
  serverConfig: string;
  replayData?: {
    colorImageUrl?: string;
    depthImageUrl?: string;
  };
  type: "color" | "depth";
}

export const Feed: React.FC<FeedProps> = ({
  latestDetections,
  serverConfig,
  replayData,
  type,
}) => {
  const imageUrl = replayData
    ? type === "color"
      ? replayData.colorImageUrl
      : replayData.depthImageUrl
    : undefined;
  const imageEndpoint = replayData ? undefined : `${type}.mjpg`;

  return (
    <div className="w-full h-full flex items-center justify-center">
      <DetectionCanvas
        detections={ensureValidPayload(latestDetections)}
        serverConfig={serverConfig}
        imageUrl={imageUrl}
        imageEndpoint={imageEndpoint}
        originalImageWidth={640}
        originalImageHeight={480}
        className="h-full"
        hideWhenNoUrl={false}
      />
    </div>
  );
};
