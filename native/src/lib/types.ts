export type Category = {
  id: number;
  name: string;
  emoji: string;
  color: string;
  createdAt: number;
};

export type Recording = {
  id: number;
  categoryId: number;
  title: string | null;
  transcript: string;
  summary: string | null;
  // Files are stored as names inside the app's media folder (not absolute paths, which change between app updates on iOS).
  /** JSON array of audio segment file names (recognition may restart during long recordings). */
  audioFiles: string | null;
  photoFile: string | null;
  pdfFile: string | null;
  pdfName: string | null;
  locationName: string | null;
  latitude: number | null;
  longitude: number | null;
  durationMs: number | null;
  createdAt: number;
};
