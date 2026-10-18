import { openDatabaseSync } from "expo-sqlite";
import { deleteStoredFile } from "./files";
import type { Category, Recording } from "./types";

const db = openDatabaseSync("rememberance.db");

export function initDb() {
  db.execSync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      emoji TEXT NOT NULL,
      color TEXT NOT NULL,
      createdAt INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS recordings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      categoryId INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
      title TEXT,
      transcript TEXT NOT NULL DEFAULT '',
      summary TEXT,
      audioFiles TEXT,
      photoFile TEXT,
      pdfFile TEXT,
      pdfName TEXT,
      locationName TEXT,
      latitude REAL,
      longitude REAL,
      durationMs INTEGER,
      createdAt INTEGER NOT NULL
    );
  `);

  const count = db.getFirstSync<{ n: number }>("SELECT COUNT(*) AS n FROM categories");
  if (count?.n === 0) {
    addCategory("Business", "💼", "#2563EB");
    addCategory("Homework", "📚", "#16A34A");
  }
}

// ---- Categories ----

export function listCategories(): (Category & { recordingCount: number })[] {
  return db.getAllSync(
    `SELECT c.*, (SELECT COUNT(*) FROM recordings r WHERE r.categoryId = c.id) AS recordingCount
     FROM categories c ORDER BY c.createdAt`,
  );
}

export function getCategory(id: number): Category | null {
  return db.getFirstSync<Category>("SELECT * FROM categories WHERE id = ?", id);
}

export function addCategory(name: string, emoji: string, color: string): number {
  const res = db.runSync(
    "INSERT INTO categories (name, emoji, color, createdAt) VALUES (?, ?, ?, ?)",
    name,
    emoji,
    color,
    Date.now(),
  );
  return res.lastInsertRowId;
}

export function updateCategory(id: number, name: string, emoji: string, color: string) {
  db.runSync("UPDATE categories SET name = ?, emoji = ?, color = ? WHERE id = ?", name, emoji, color, id);
}

export function deleteCategory(id: number) {
  for (const r of listRecordings(id)) deleteRecordingFiles(r);
  db.runSync("DELETE FROM categories WHERE id = ?", id);
}

// ---- Recordings ----

export function listRecordings(categoryId: number, search = ""): Recording[] {
  if (search.trim()) {
    const q = `%${search.trim()}%`;
    return db.getAllSync<Recording>(
      `SELECT * FROM recordings WHERE categoryId = ? AND (title LIKE ? OR transcript LIKE ? OR summary LIKE ?)
       ORDER BY createdAt DESC`,
      categoryId,
      q,
      q,
      q,
    );
  }
  return db.getAllSync<Recording>(
    "SELECT * FROM recordings WHERE categoryId = ? ORDER BY createdAt DESC",
    categoryId,
  );
}

export function getRecording(id: number): Recording | null {
  return db.getFirstSync<Recording>("SELECT * FROM recordings WHERE id = ?", id);
}

export type NewRecording = Omit<Recording, "id" | "summary">;

export function addRecording(r: NewRecording): number {
  const res = db.runSync(
    `INSERT INTO recordings
      (categoryId, title, transcript, audioFiles, photoFile, pdfFile, pdfName, locationName, latitude, longitude, durationMs, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    r.categoryId,
    r.title,
    r.transcript,
    r.audioFiles,
    r.photoFile,
    r.pdfFile,
    r.pdfName,
    r.locationName,
    r.latitude,
    r.longitude,
    r.durationMs,
    r.createdAt,
  );
  return res.lastInsertRowId;
}

export function updateRecordingText(id: number, fields: { title?: string | null; transcript?: string; summary?: string | null }) {
  const current = getRecording(id);
  if (!current) return;
  db.runSync(
    "UPDATE recordings SET title = ?, transcript = ?, summary = ? WHERE id = ?",
    fields.title !== undefined ? fields.title : current.title,
    fields.transcript !== undefined ? fields.transcript : current.transcript,
    fields.summary !== undefined ? fields.summary : current.summary,
    id,
  );
}

function deleteRecordingFiles(r: Recording) {
  for (const f of parseAudioFiles(r.audioFiles)) deleteStoredFile(f);
  deleteStoredFile(r.photoFile);
  deleteStoredFile(r.pdfFile);
}

export function deleteRecording(id: number) {
  const r = getRecording(id);
  if (r) deleteRecordingFiles(r);
  db.runSync("DELETE FROM recordings WHERE id = ?", id);
}

export function parseAudioFiles(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
