import React from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { ElementTypeString } from "../../types";

const COLOR_TYPES: ElementTypeString[] = [
  "Alkali Metal",
  "Alkaline Earth Metal",
  "Transition Metal",
  "Post-transition Metal",
  "Metalloid",
  "Reactive Nonmetal",
  "Noble Gas",
  "Lanthanide",
  "Actinide",
  "Unknown Chemical Properties",
];

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  textColors: Record<ElementTypeString, string>;
  bgColors: Record<ElementTypeString, string>;
  onTextColorChange: (type: ElementTypeString, color: string) => void;
  onBgColorChange: (type: ElementTypeString, color: string) => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  isOpen,
  onClose,
  textColors,
  bgColors,
  onTextColorChange,
  onBgColorChange,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-background rounded-lg shadow-lg w-[90vw] max-w-xl p-6 relative">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Periodic Table Settings</h2>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
        <Tabs defaultValue="text" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="text">Text Colors</TabsTrigger>
            <TabsTrigger value="bg">Background Colors</TabsTrigger>
          </TabsList>
          <TabsContent value="text">
            <div className="space-y-3">
              {COLOR_TYPES.map((type) => (
                <div key={type} className="flex items-center gap-4">
                  <span className="w-40 font-mono">{type}</span>
                  <input
                    type="color"
                    value={textColors[type]}
                    onChange={(e) => onTextColorChange(type, e.target.value)}
                    className="w-10 h-10 border rounded"
                    aria-label={`Text color for ${type}`}
                  />
                  <input
                    type="text"
                    value={textColors[type]}
                    onChange={(e) => onTextColorChange(type, e.target.value)}
                    className="ml-2 w-24 px-2 py-1 border rounded font-mono text-xs"
                    aria-label={`Text hex for ${type}`}
                    maxLength={7}
                    pattern="^#([0-9A-Fa-f]{6})$"
                  />
                </div>
              ))}
            </div>
          </TabsContent>
          <TabsContent value="bg">
            <div className="space-y-3">
              {COLOR_TYPES.map((type) => (
                <div key={type} className="flex items-center gap-4">
                  <span className="w-40 font-mono">{type}</span>
                  <input
                    type="color"
                    value={bgColors[type]}
                    onChange={(e) => onBgColorChange(type, e.target.value)}
                    className="w-10 h-10 border rounded"
                    aria-label={`Background color for ${type}`}
                  />
                  <input
                    type="text"
                    value={bgColors[type]}
                    onChange={(e) => onBgColorChange(type, e.target.value)}
                    className="ml-2 w-24 px-2 py-1 border rounded font-mono text-xs"
                    aria-label={`Background hex for ${type}`}
                    maxLength={7}
                    pattern="^#([0-9A-Fa-f]{6})$"
                  />
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default SettingsPanel;
