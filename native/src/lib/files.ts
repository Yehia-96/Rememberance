import { Directory, File, Paths } from "expo-file-system";

const mediaDir = new Directory(Paths.document, "media");

function ensureMediaDir() {
  if (!mediaDir.exists) mediaDir.create({ intermediates: true });
}

/** Copies a picked/recorded file into permanent app storage and returns its stored file name. */
export function storeFile(sourceUri: string, prefix: string): string {
  ensureMediaDir();
  const source = new File(sourceUri);
  const ext = source.extension || "";
  const name = `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
  source.copySync(new File(mediaDir, name));
  return name;
}

export function mediaUri(name: string): string {
  return new File(mediaDir, name).uri;
}

export function mediaFile(name: string): File {
  return new File(mediaDir, name);
}

export function deleteStoredFile(name: string | null) {
  if (!name) return;
  const file = new File(mediaDir, name);
  if (file.exists) file.delete();
}
