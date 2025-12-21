import ky from "ky";

export type Song = {
  id: number;
  name: string;
  trackName: string;
  artistName: string;
  albumName: string;
  duration: number;
  instrumental: boolean;
  plainLyrics: string;
  syncedLyrics: string;
};

export const searchSongs = async (query: {
  q?: string;
  track_name?: string;
  artist_name?: string;
  album_name?: string;
}): Promise<Song[]> => {
  const response = await ky.get("https://lrclib.net/api/search", {
    searchParams: {
      ...query,
    },
  });
  if (!response.ok) {
    throw new Error(`Error fetching songs: ${response.statusText}`);
  }
  return response.json();
};

export const getSong = async (id: number): Promise<Song> => {
  const response = await ky.get(`https://lrclib.net/api/get/${id}`);
  if (!response.ok) {
    throw new Error(`Error fetching songs: ${response.statusText}`);
  }
  return response.json();
};
