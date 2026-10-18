export const colors = {
  background: "#F5F5F7",
  card: "#FFFFFF",
  text: "#111827",
  muted: "#6B7280",
  border: "#E5E7EB",
  primary: "#2563EB",
  danger: "#DC2626",
  recording: "#EF4444",
};

export const CATEGORY_COLORS = ["#2563EB", "#16A34A", "#EA580C", "#9333EA", "#DB2777", "#0891B2", "#CA8A04", "#4B5563"];

export const CATEGORY_EMOJIS = ["💼", "📚", "💡", "🏠", "❤️", "🛒", "✈️", "🏋️", "🎓", "📝", "🧠", "📞"];

export function formatDate(ms: number): string {
  return new Date(ms).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatDuration(ms: number | null): string {
  if (!ms) return "";
  const total = Math.round(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
