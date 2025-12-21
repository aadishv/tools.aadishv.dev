import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { searchSongs } from "../api";
import type { Song } from "../api";

function getSongParam(): string {
  const params = new URLSearchParams(window.location.search);
  return params.get("song") || "";
}

function LyrixTool() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Song[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const songId = getSongParam();
  const [fullscreenSong, setFullscreenSong] = useState<Song | null>(null);

  // Listen for URL changes to update songId (for back button)
  React.useEffect(() => {
    function onPopState() {
      window.location.reload();
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  // Search handler
  async function handleSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    // Clear song param from URL if present
    const params = new URLSearchParams(window.location.search);
    if (params.has("song")) {
      params.delete("song");
      window.history.replaceState({}, "", "?" + params.toString());
    }

    setLoading(true);
    setError(null);
    try {
      const searchParams: Record<string, string> = {};
      if (query.trim()) {
        searchParams.q = query;
      }
      const songs = await searchSongs(searchParams);
      setResults(songs);
    } catch (err: any) {
      setError(err.message || "Search failed");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  // Fetch fullscreen song if songId is present
  React.useEffect(() => {
    if (!songId) {
      setFullscreenSong(null);
      return;
    }
    setLoading(true);
    setError(null);
    import("../api").then(({ getSong }) => {
      getSong(Number(songId))
        .then((song) => setFullscreenSong(song))
        .catch((err) => setError(err.message || "Failed to load song"))
        .finally(() => setLoading(false));
    });
  }, [songId]);

  return (
    <div className="flex flex-col bg-background">
      {/* Search Bar */}
      <form
        onSubmit={handleSearch}
        className="flex justify-center items-center mt-10 gap-2"
      >
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search all fields..."
          className="max-w-md w-full"
        />
        <Button type="submit" disabled={loading}>
          Search
        </Button>
      </form>

      {/* Results */}
      {!songId && (
        <div className="flex-1 p-8">
          {loading && <div>Loading...</div>}
          {error && <div style={{ color: "red" }}>{error}</div>}
          {!loading && !error && (
            <table className="w-full border border-gray-300 bg-white">
              <thead>
                <tr>
                  <th className="border px-2 py-1 text-left">Track</th>
                  <th className="border px-2 py-1 text-left">Artist</th>
                  <th className="border px-2 py-1 text-left">Album</th>
                </tr>
              </thead>
              <tbody>
                {results.map((song) => {
                  const params = new URLSearchParams();
                  params.set("song", String(song.id));
                  return (
                    <tr key={song.id}>
                      <td className="border px-2 py-1">
                        <a
                          href={"?" + params.toString()}
                          style={{ textDecoration: "underline", color: "blue" }}
                        >
                          {song.trackName}
                        </a>
                      </td>
                      <td className="border px-2 py-1">{song.artistName}</td>
                      <td className="border px-2 py-1">{song.albumName}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Fullscreen Lyrics View */}
      {songId && fullscreenSong && (
        <div className="flex flex-col min-h-screen bg-background">
          <div className="flex justify-between items-center px-8 pt-8 pb-4 w-full">
            <div>
              <div style={{ fontWeight: "bold", fontSize: "2rem" }}>
                {fullscreenSong.trackName}
              </div>
              <div style={{ fontSize: "1.2rem", color: "#555" }}>
                {fullscreenSong.artistName}
              </div>
              <div style={{ fontSize: "1rem", color: "#888" }}>
                {fullscreenSong.albumName}
              </div>
            </div>
            <a href="?" style={{ textDecoration: "none" }}>
              <Button variant="secondary">Back</Button>
            </a>
          </div>
          <div className="flex-1 w-full px-8 pb-8">
            <pre
              style={{
                marginTop: 0,
                whiteSpace: "pre-wrap",
                fontFamily: "monospace",
                background: "#fff",
                border: "1px solid #eee",
                borderRadius: "8px",
                padding: "32px",
                fontSize: "1.15rem",
                width: "100%",
                minHeight: "60vh",
                boxSizing: "border-box",
                overflowX: "auto",
              }}
            >
              {fullscreenSong.plainLyrics || "No lyrics found."}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

export default LyrixTool;
