import React, { useEffect, useMemo, useState } from "react";
import { Button } from "../components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { Card, CardHeader, CardTitle, CardDescription } from "../components/ui/card";

type Song = {
  title: string;
  album: string;
  elo: number;
};

const ALL_SONGS_BY_ALBUM: Record<string, string[]> = {
  Breach: [
    "City Walls",
    "RAWFEAR",
    "Drum Show",
    "Garbage",
    "The Contract",
    "Downstairs",
    "Robot Voices",
    "Center Mass",
    "Cottonwood",
    "One Way",
    "Days Lie Dormant",
    "Tally",
    "Intentions",
  ],
  Vessel: [
    "Ode to Sleep",
    "Holding on to You",
    "Migraine",
    "House of Gold",
    "Car Radio",
    "Semi-Automatic",
    "Screen",
    "The Run and Go",
    "Fake You Out",
    "Guns for Hands",
    "Trees",
    "Truce",
  ],
  Blurryface: [
    "Heavydirtysoul",
    "Stressed Out",
    "Ride",
    "Fairly Local",
    "Tear in My Heart",
    "Lane Boy",
    "The Judge",
    "Doubt",
    "Polarize",
    "We Don't Believe What's on TV",
    "Message Man",
    "Hometown",
    "Not Today",
    "Goner",
  ],
  Trench: [
    "Jumpsuit",
    "Levitate",
    "Morph",
    "My Blood",
    "Chlorine",
    "Smithereens",
    "Neon Gravestones",
    "The Hype",
    "Nico and the Niners",
    "Cut My Lip",
    "Bandito",
    "Pet Cheetah",
    "Legend",
    "Leave the City",
  ],
  "Scaled and Icy": [
    "Good Day",
    "Choker",
    "Shy Away",
    "The Outside",
    "Saturday",
    "Never Take It",
    "Mulberry Street",
    "Formidable",
    "Bounce Man",
    "No Chances",
    "Redecorate",
  ],
  Clancy: [
    "Overcompensate",
    "Next Semester",
    "Backslide",
    "Midwest Indigo",
    "Routines in the Night",
    "Vignette",
    "The Craving (Jenna's Version)",
    "Lavish",
    "Navigating",
    "At the Risk of Feeling Dumb",
    "Oldies Station",
    "Paladin Strait",
  ],
};

const K_FACTOR = 32;
const DEFAULT_ELO = 1000;
const STORAGE_KEYS = {
  SONGS: "tøpRanker_activeSongs",
  ALBUMS: "tøpRanker_selectedAlbums",
};

export default function Toppp(): React.ReactElement {
  const albumNames = useMemo(() => Object.keys(ALL_SONGS_BY_ALBUM), []);

  const [selectedAlbums, setSelectedAlbums] = useState<Set<string>>(
    () => new Set(albumNames),
  );

  const [activeSongs, setActiveSongs] = useState<Song[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SONGS);
      if (raw) {
        const parsed = JSON.parse(raw) as Song[];
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      /* ignore malformed storage */
    }
    return [];
  });

  const [currentComparison, setCurrentComparison] = useState<[number, number] | null>(null);
  const [tabValue, setTabValue] = useState<"comparisons" | "leaderboard" | "settings">(
    "comparisons",
  );

  // leaderboard derived
  const leaderboard = useMemo(() => {
    return [...activeSongs].sort((a, b) => b.elo - a.elo);
  }, [activeSongs]);

  // Persist selected albums
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.ALBUMS, JSON.stringify(Array.from(selectedAlbums)));
    } catch {
      /* ignore */
    }
  }, [selectedAlbums]);

  // Restore selected albums if present
  useEffect(() => {
    try {
      const rawAlbums = localStorage.getItem(STORAGE_KEYS.ALBUMS);
      if (rawAlbums) {
        const parsed = JSON.parse(rawAlbums) as string[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSelectedAlbums(new Set(parsed.filter((a) => albumNames.includes(a))));
        }
      }
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ensure comparisons exist when songs change
  useEffect(() => {
    if (activeSongs.length < 2) {
      applySettings(false);
      return;
    }
    if (!currentComparison) {
      pickNewComparison();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSongs.length]);

  // Persist songs
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SONGS, JSON.stringify(activeSongs));
    } catch {
      /* ignore */
    }
  }, [activeSongs]);

  function pickNewComparison() {
    if (activeSongs.length < 2) {
      setCurrentComparison(null);
      return;
    }
    let i = Math.floor(Math.random() * activeSongs.length);
    let j = i;
    while (j === i) {
      j = Math.floor(Math.random() * activeSongs.length);
    }
    setCurrentComparison([i, j]);
  }

  function applySettings(switchToComparisons = true) {
    const albums = Array.from(selectedAlbums);
    const newSongs: Song[] = [];
    albums.forEach((albumName) => {
      const songs = ALL_SONGS_BY_ALBUM[albumName] ?? [];
      songs.forEach((title) => {
        newSongs.push({ title, album: albumName, elo: DEFAULT_ELO });
      });
    });
    setActiveSongs(newSongs);
    if (switchToComparisons) setTabValue("comparisons");
    setCurrentComparison(null);
    if (newSongs.length >= 2) {
      setTimeout(() => pickNewComparison(), 0);
    }
  }

  function toggleAlbum(album: string) {
    setSelectedAlbums((prev) => {
      const copy = new Set(prev);
      if (copy.has(album)) copy.delete(album);
      else copy.add(album);
      return copy;
    });
  }

  function updateElo(winner: Song, loser: Song) {
    const expectedWinner = 1 / (1 + Math.pow(10, (loser.elo - winner.elo) / 400));
    const expectedLoser = 1 / (1 + Math.pow(10, (winner.elo - loser.elo) / 400));
    const newWinnerElo = winner.elo + K_FACTOR * (1 - expectedWinner);
    const newLoserElo = loser.elo + K_FACTOR * (0 - expectedLoser);

    setActiveSongs((prev) =>
      prev.map((s) => {
        if (s.title === winner.title && s.album === winner.album) return { ...s, elo: newWinnerElo };
        if (s.title === loser.title && s.album === loser.album) return { ...s, elo: newLoserElo };
        return s;
      }),
    );
  }

  function handleSongChoice(index: number) {
    if (!currentComparison) return;
    const [a, b] = currentComparison;
    const winnerIndex = index;
    const loserIndex = a === winnerIndex ? b : a;
    const winner = activeSongs[winnerIndex];
    const loser = activeSongs[loserIndex];
    if (!winner || !loser) return;
    updateElo(winner, loser);
    pickNewComparison();
  }

  const ComparisonView = () => {
    if (!currentComparison || activeSongs.length < 2) {
      return (
        <div className="md:col-span-2 text-center p-8">
          <p className="text-muted-foreground">Not enough songs to compare. Change your selection in settings.</p>
        </div>
      );
    }
    const [i, j] = currentComparison;
    const s1 = activeSongs[i];
    const s2 = activeSongs[j];

    if (!s1 || !s2) {
      return (
        <div className="md:col-span-2 text-center p-8">
          <p className="text-muted-foreground">Preparing songs...</p>
        </div>
      );
    }

    return (
      <>
        <Card onClick={() => handleSongChoice(i)} className="cursor-pointer transition-transform hover:-translate-y-1">
          <CardHeader>
            <CardTitle>{s1.title}</CardTitle>
            <CardDescription>{s1.album}</CardDescription>
          </CardHeader>
        </Card>

        <Card onClick={() => handleSongChoice(j)} className="cursor-pointer transition-transform hover:-translate-y-1">
          <CardHeader>
            <CardTitle>{s2.title}</CardTitle>
            <CardDescription>{s2.album}</CardDescription>
          </CardHeader>
        </Card>
      </>
    );
  };

  const LeaderboardView = () => {
    if (activeSongs.length === 0) {
      return (
        <div className="p-6 bg-gray-800 rounded-lg">
          <p className="text-gray-400">No songs available. Configure Settings first.</p>
        </div>
      );
    }
    return (
      <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-700">
            <tr>
              <th className="py-3 px-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Rank</th>
              <th className="py-3 px-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Song</th>
              <th className="py-3 px-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Album</th>
              <th className="py-3 px-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Elo Score</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {leaderboard.map((song, index) => (
              <tr key={`${song.album}-${song.title}`} className="hover:bg-gray-700/50">
                <td className="py-3 px-4 text-gray-300">{index + 1}</td>
                <td className="py-3 px-4 font-medium text-white">{song.title}</td>
                <td className="py-3 px-4 text-gray-400">{song.album}</td>
                <td className="py-3 px-4 text-gray-300">{Math.round(song.elo)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const SettingsView = () => {
    return (
      <div className="bg-gray-800 p-6 rounded-lg shadow-lg space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">Select Albums</h2>
          <p className="text-gray-400">Choose which albums to include in the ranking. Applying settings will reset the leaderboard.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {albumNames.map((album) => {
            const checked = selectedAlbums.has(album);
            return (
              <label
                key={album}
                className="flex items-center p-4 bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-600 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleAlbum(album)}
                  className="h-5 w-5 rounded bg-gray-800 border-gray-600 text-red-500 focus:ring-red-500"
                />
                <span className="ml-4 text-lg font-medium text-gray-200">{album}</span>
              </label>
            );
          })}
        </div>

        <div className="mt-2 flex justify-center">
          <Button onClick={() => applySettings(true)} variant="destructive" size="lg">
            Apply & Reset
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-4xl">
      <header className="text-center mb-8">
        <h1 className="text-4xl md:text-5xl font-bold text-red-500">Twenty One Pilots</h1>
        <p className="text-lg md:text-xl text-gray-300">Song Ranker</p>
      </header>

      <Tabs value={tabValue} onValueChange={(v) => setTabValue(v as any)}>
        <TabsList className="justify-center mb-6">
          <TabsTrigger value="comparisons">Comparisons</TabsTrigger>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="comparisons" className="mt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 mb-6">
            <ComparisonView />
          </div>

          <div className="flex justify-center">
            <Button variant="outline" onClick={pickNewComparison}>
              Skip
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="leaderboard" className="mt-2">
          <LeaderboardView />
        </TabsContent>

        <TabsContent value="settings" className="mt-2">
          <SettingsView />
        </TabsContent>
      </Tabs>
    </div>
  );
}
