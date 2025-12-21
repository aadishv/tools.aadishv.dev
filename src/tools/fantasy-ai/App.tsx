import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import teamsData from "./teams.json";

interface Team {
  Team: string;
  "Team Name": string;
  Organization: string;
  Location: string;
}

interface AppProps {
  initialProps?: {
    ranked: string;
    name: string;
  };
}

// DropTarget Component: Renders a distinct area between cards.
const DropTarget = ({
  index,
  onDrop,
  draggedIndex,
  setDragOverIndex,
  isActive,
}: {
  index: number;
  onDrop: (dropIndex: number) => void;
  draggedIndex: number | null;
  setDragOverIndex: (index: number | null) => void;
  isActive: boolean;
}) => {
  const isSelfOrNext =
    draggedIndex !== null &&
    (index === draggedIndex || index === draggedIndex + 1);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isSelfOrNext) {
      e.dataTransfer.dropEffect = "move";
      setDragOverIndex(index);
    } else {
      e.dataTransfer.dropEffect = "none";
      setDragOverIndex(null);
    }
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDropEvent = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isSelfOrNext && draggedIndex !== null) {
      onDrop(index);
    }
    setDragOverIndex(null);
  };

  return (
    <div
      className={`
        h-8 w-full transition-colors duration-100 rounded-md
        ${isActive && !isSelfOrNext ? "bg-blue-100" : ""}
      `}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDropEvent}
    >
      {isActive && !isSelfOrNext && (
        <div className="flex justify-center items-center h-full">
          <div className="h-1.5 bg-blue-500 w-1/2 rounded-full" />
        </div>
      )}
    </div>
  );
};

export function App({ initialProps }: AppProps) {
  const [teams, setTeams] = useState<Team[]>(teamsData);
  const [listName, setListName] = useState("My Fantasy AI Rankings");
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [prevPositions, setPrevPositions] = useState<Record<string, DOMRect>>(
    {},
  );
  const listRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    const rankedParam =
      initialProps?.ranked ||
      new URLSearchParams(window.location.search).get("ranked");
    const nameParam =
      initialProps?.name ||
      new URLSearchParams(window.location.search).get("name");

    if (rankedParam) {
      try {
        const rankedIds = rankedParam.split(",");
        const orderedTeams = rankedIds
          .map((id) => teamsData.find((team) => team.Team === id))
          .filter(Boolean) as Team[];
        const remainingTeams = teamsData.filter(
          (team) => !rankedIds.includes(team.Team),
        );
        setTeams([...orderedTeams, ...remainingTeams]);
      } catch (e) {
        console.error("Error parsing URL params:", e);
      }
    }

    // Use nameParam directly (already decoded by Astro or browser)
    if (nameParam) {
      setListName(nameParam);
    }
  }, [initialProps]);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", index.toString());
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDrop = (dropIndex: number) => {
    if (draggedIndex === null) return;

    const newPositions: Record<string, DOMRect> = {};
    teams.forEach((team) => {
      const node = cardRefs.current[team.Team];
      if (node) {
        newPositions[team.Team] = node.getBoundingClientRect();
      }
    });
    setPrevPositions(newPositions);

    let targetIndex = dropIndex;
    if (draggedIndex < targetIndex) {
      targetIndex--;
    }

    if (draggedIndex === targetIndex) {
      setPrevPositions({}); // Clear positions if no change
      return;
    }

    const newTeams = [...teams];
    const [draggedTeam] = newTeams.splice(draggedIndex, 1);
    newTeams.splice(targetIndex, 0, draggedTeam);

    setTeams(newTeams);
  };

  useLayoutEffect(() => {
    const refs = cardRefs.current;
    if (Object.keys(prevPositions).length === 0 || !refs) {
      return;
    }

    teams.forEach((team) => {
      const node = refs[team.Team];
      const oldPos = prevPositions[team.Team];

      if (node && oldPos) {
        const newPos = node.getBoundingClientRect();
        const deltaX = oldPos.left - newPos.left;
        const deltaY = oldPos.top - newPos.top;

        if (deltaX !== 0 || deltaY !== 0) {
          node.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
          node.style.transition = "transform 0s";
          requestAnimationFrame(() => {
            node.style.transform = "";
            node.style.transition = "transform 300ms ease-in-out";
          });
        }
      }
    });

    setPrevPositions({});
  }, [teams]);

  /**
   * Generates a shareable URL with the current rankings and list name,
   * copies it to the clipboard, and updates the browser's URL.
   */
  const generateShareUrl = () => {
    // 1. Get current rankings
    const rankedIds = teams.map((team) => team.Team).join(",");

    // 2. Create URLSearchParams object
    const params = new URLSearchParams();
    params.set("ranked", rankedIds);

    // 3. Add name only if it's custom (URLSearchParams handles encoding)
    if (listName && listName !== "My Fantasy AI Rankings") {
      params.set("name", listName);
    }

    // 4. Build the URL
    const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`;

    // 5. Copy to clipboard (with check)
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard
        .writeText(url)
        .then(() => {
          // Success feedback
          updateShareButton("Copied!");
        })
        .catch((err) => {
          console.error("Failed to copy URL: ", err);
          alert("Failed to copy URL. You can copy it manually:\n" + url);
        });
    } else {
      console.warn("Clipboard API not available. URL:", url);
      alert("Clipboard not available. Copy this URL:\n" + url);
    }

    // 6. Update browser URL
    window.history.replaceState({}, "", url);
  };

  /**
   * Helper function to update the share button text and state.
   */
  const updateShareButton = (text: string, duration: number = 1500) => {
    const button = document.querySelector(
      "[data-share-button]",
    ) as HTMLButtonElement;
    if (button) {
      const originalText = button.textContent;
      button.textContent = text;
      button.disabled = true;
      setTimeout(() => {
        button.textContent = originalText;
        button.disabled = false;
      }, duration);
    }
  };

  const resetOrder = () => {
    setTeams(teamsData);
    setListName("My Fantasy AI Rankings");
    window.history.replaceState({}, "", window.location.pathname);
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Fantasy AI Team Rankings</h1>
        <p className="text-muted-foreground mb-4">
          Drag teams and drop them between others.
        </p>

        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <Label htmlFor="listName">List Name</Label>
            <Input
              id="listName"
              value={listName}
              onChange={(e) => setListName(e.target.value)}
              placeholder="My Fantasy AI Rankings"
            />
          </div>
          {/* Ensure the button has the data attribute */}
          <Button onClick={generateShareUrl} data-share-button>
            Share Rankings
          </Button>
          <Button variant="outline" onClick={resetOrder}>
            Reset Order
          </Button>
        </div>
      </div>

      <div className="space-y-0" ref={listRef} onDragEnd={handleDragEnd}>
        <DropTarget
          index={0}
          onDrop={handleDrop}
          draggedIndex={draggedIndex}
          setDragOverIndex={setDragOverIndex}
          isActive={dragOverIndex === 0}
        />
        {teams.map((team, index) => {
          const isDragging = draggedIndex === index;
          return (
            <div
              key={team.Team}
              // ref={(el) => (cardRefs.current[team.Team] = el)}
            >
              <Card
                className={`
                  cursor-move select-none
                  ${isDragging ? "opacity-30" : ""}
                  ${!isDragging ? "transition-opacity duration-150" : ""}
                `}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl font-bold text-muted-foreground w-8 text-center">
                        {index + 1}
                      </div>
                      <div className="text-muted-foreground cursor-grab active:cursor-grabbing select-none">
                        ⋮⋮
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="font-bold text-lg">{team.Team}</span>
                        <span className="font-medium">{team["Team Name"]}</span>
                      </div>
                      <div className="text-sm text-muted-foreground truncate">
                        {team.Organization} • {team.Location}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <DropTarget
                index={index + 1}
                onDrop={handleDrop}
                draggedIndex={draggedIndex}
                setDragOverIndex={setDragOverIndex}
                isActive={dragOverIndex === index + 1}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
