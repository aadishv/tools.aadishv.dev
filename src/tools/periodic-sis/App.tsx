import { useRef, useState, useEffect } from "react";
import Table from "./Table";
import SearchBar from "./components/SearchBar";
import { FormulaMassModal } from "./components/FormulaMassCalculator";
import ReferenceModal from "./components/ReferenceModal";
import SettingsPanel from "./components/settings/SettingsPanel";
import type { ElementType } from "./types";
import elements from "./periodic.json";
import { Button } from "@/components/ui/button";
import { TEXT_COLORS, BG_COLORS, type ElementTypeString } from "./types";

const LOCALSTORAGE_TEXT_KEY = "periodic-sis-textColors";
const LOCALSTORAGE_BG_KEY = "periodic-sis-bgColors";

const App: React.FC = () => {
  // Map of refs for each element by atomic number
  const elementRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});

  // Load colors from localStorage on mount
  // Only run once
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    try {
      const storedText = localStorage.getItem(LOCALSTORAGE_TEXT_KEY);
      const storedBg = localStorage.getItem(LOCALSTORAGE_BG_KEY);
      if (storedText) {
        const parsed = JSON.parse(storedText);
        setTextColors((prev) => ({ ...prev, ...parsed }));
      }
      if (storedBg) {
        const parsed = JSON.parse(storedBg);
        setBgColors((prev) => ({ ...prev, ...parsed }));
      }
    } catch (e) {
      // Ignore parse errors
    }
  }, []);
  // Settings state for colors
  const [textColors, setTextColors] = useState<
    Record<ElementTypeString, string>
  >({ ...TEXT_COLORS });
  const [bgColors, setBgColors] = useState<Record<ElementTypeString, string>>({
    ...BG_COLORS,
  });

  // Modal state for formula mass calculator
  const [showMassModal, setShowMassModal] = useState(false);
  // Modal state for reference modal
  const [showReferenceModal, setShowReferenceModal] = useState(false);
  // Modal state for settings panel
  const [showSettings, setShowSettings] = useState(false);

  // Focus an element by atomic number
  const focusElementByNumber = (atomicNumber: number) => {
    const ref = elementRefs.current[atomicNumber];
    if (ref) {
      ref.focus();
    }
  };

  // Persist color changes to localStorage
  const handleTextColorChange = (type: ElementTypeString, color: string) => {
    setTextColors((prev) => {
      const updated = { ...prev, [type]: color };
      try {
        localStorage.setItem(LOCALSTORAGE_TEXT_KEY, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  const handleBgColorChange = (type: ElementTypeString, color: string) => {
    setBgColors((prev) => {
      const updated = { ...prev, [type]: color };
      try {
        localStorage.setItem(LOCALSTORAGE_BG_KEY, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  // Use the periodic data from JSON
  const periodicData = elements as ElementType[];

  return (
    <>
      <Table
        elementRefs={elementRefs}
        textColors={textColors}
        bgColors={bgColors}
      />
      <div
        className="fixed bottom-0 left-0 w-full bg-background border-t flex items-center gap-2 px-4 py-2 z-50"
        style={{ boxShadow: "0 -2px 8px rgba(0,0,0,0.03)" }}
      >
        <div className="flex-1">
          <SearchBar focusElementByNumber={focusElementByNumber} />
        </div>
        <div className="flex-1 flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowMassModal(true)}
          >
            Formula Mass Calculator
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowReferenceModal(true)}
          >
            Reference
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowSettings(true)}
            aria-label="Open settings"
          >
            Settings
          </Button>
        </div>
      </div>
      <FormulaMassModal
        isOpen={showMassModal}
        onClose={() => setShowMassModal(false)}
        periodicData={periodicData}
      />
      <ReferenceModal
        isOpen={showReferenceModal}
        onClose={() => setShowReferenceModal(false)}
      />
      <SettingsPanel
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        textColors={textColors}
        bgColors={bgColors}
        onTextColorChange={handleTextColorChange}
        onBgColorChange={handleBgColorChange}
      />
    </>
  );
};

export default App;
