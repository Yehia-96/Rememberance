import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { deleteRecording, getCategory, getRecording, parseAudioFiles, updateRecordingText } from "../../lib/db";
import { mediaFile, mediaUri } from "../../lib/files";
import { summarizeTranscript } from "../../lib/summarize";
import { colors, formatDate, formatDuration } from "../../lib/theme";

function AudioPlayer({ files }: { files: string[] }) {
  const [index, setIndex] = useState(0);
  const player = useAudioPlayer(mediaUri(files[0]));
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
  }, []);

  // Play the segments back-to-back.
  useEffect(() => {
    if (!status.didJustFinish) return;
    if (index + 1 < files.length) {
      const next = index + 1;
      setIndex(next);
      player.replace(mediaUri(files[next]));
      player.play();
    } else {
      setIndex(0);
      player.replace(mediaUri(files[0]));
    }
  }, [status.didJustFinish]);

  return (
    <Pressable style={styles.player} onPress={() => (status.playing ? player.pause() : player.play())}>
      <Text style={styles.playerIcon}>{status.playing ? "⏸" : "▶️"}</Text>
      <Text style={styles.playerText}>
        {status.playing ? "Playing" : "Play audio"}
        {files.length > 1 ? `  (part ${index + 1}/${files.length})` : ""}
      </Text>
      <Text style={styles.playerTime}>{formatDuration(status.currentTime * 1000) || "0:00"}</Text>
    </Pressable>
  );
}

export default function RecordingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const recordingId = Number(id);
  const [recording, setRecording] = useState(() => getRecording(recordingId));
  const [editingTranscript, setEditingTranscript] = useState(false);
  const [transcriptDraft, setTranscriptDraft] = useState(recording?.transcript ?? "");
  const [summarizing, setSummarizing] = useState(false);

  if (!recording) return <Text style={styles.missing}>Recording not found.</Text>;
  const category = getCategory(recording.categoryId);
  const audioFiles = parseAudioFiles(recording.audioFiles);

  function refresh() {
    setRecording(getRecording(recordingId));
  }

  function rename() {
    Alert.prompt(
      "Title",
      undefined,
      (text) => {
        updateRecordingText(recordingId, { title: text.trim() || null });
        refresh();
      },
      "plain-text",
      recording?.title ?? "",
    );
  }

  function saveTranscript() {
    updateRecordingText(recordingId, { transcript: transcriptDraft.trim() });
    setEditingTranscript(false);
    refresh();
  }

  async function summarize() {
    if (!recording?.transcript.trim()) {
      Alert.alert("Nothing to summarize", "This recording has no transcript.");
      return;
    }
    setSummarizing(true);
    try {
      const summary = await summarizeTranscript(recording.transcript, category?.name ?? "");
      updateRecordingText(recordingId, { summary });
      refresh();
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      Alert.alert("Couldn't summarize", message, [
        { text: "OK" },
        ...(message.includes("Settings") ? [{ text: "Open Settings", onPress: () => router.push("/settings") }] : []),
      ]);
    } finally {
      setSummarizing(false);
    }
  }

  function remove() {
    Alert.alert("Delete this recording?", "The audio, picture and PDF will be deleted too.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          deleteRecording(recordingId);
          router.back();
        },
      },
    ]);
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Stack.Screen
        options={{
          title: category ? `${category.emoji} ${category.name}` : "",
          headerRight: () => (
            <Pressable onPress={remove} hitSlop={10}>
              <Text style={styles.deleteButton}>Delete</Text>
            </Pressable>
          ),
        }}
      />

      <Pressable onPress={rename}>
        <Text style={styles.title}>{recording.title || "Untitled"} ✎</Text>
      </Pressable>
      <Text style={styles.meta}>
        {formatDate(recording.createdAt)}
        {recording.durationMs ? `  ·  ${formatDuration(recording.durationMs)}` : ""}
      </Text>
      {recording.locationName ? <Text style={styles.meta}>📍 {recording.locationName}</Text> : null}

      {audioFiles.length > 0 ? <AudioPlayer files={audioFiles} /> : null}

      {recording.photoFile ? <Image source={{ uri: mediaUri(recording.photoFile) }} style={styles.photo} /> : null}

      {recording.pdfFile ? (
        <Pressable
          style={styles.pdf}
          onPress={() => mediaFile(recording.pdfFile!).preview().catch((e) => Alert.alert("Can't open PDF", String(e)))}
        >
          <Text style={styles.pdfText} numberOfLines={1}>
            📄 {recording.pdfName ?? "Attached PDF"}
          </Text>
          <Text style={styles.pdfOpen}>Open</Text>
        </Pressable>
      ) : null}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>✨ Key points</Text>
        {recording.summary && !summarizing ? (
          <Pressable onPress={summarize}>
            <Text style={styles.link}>Regenerate</Text>
          </Pressable>
        ) : null}
      </View>
      {summarizing ? (
        <View style={styles.card}>
          <ActivityIndicator />
        </View>
      ) : recording.summary ? (
        <View style={styles.card}>
          <Text style={styles.arabic}>{recording.summary}</Text>
        </View>
      ) : (
        <Pressable style={styles.summarizeButton} onPress={summarize}>
          <Text style={styles.summarizeText}>Summarize into bullet points</Text>
        </Pressable>
      )}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Transcript</Text>
        <Pressable onPress={editingTranscript ? saveTranscript : () => setEditingTranscript(true)}>
          <Text style={styles.link}>{editingTranscript ? "Done" : "Edit"}</Text>
        </Pressable>
      </View>
      <View style={styles.card}>
        {editingTranscript ? (
          <TextInput style={[styles.arabic, styles.transcriptInput]} value={transcriptDraft} onChangeText={setTranscriptDraft} multiline autoFocus />
        ) : (
          <Text style={styles.arabic} selectable>
            {recording.transcript || "No transcript."}
          </Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 60 },
  missing: { padding: 20, color: colors.muted },
  deleteButton: { color: colors.danger, fontSize: 17 },
  title: { fontSize: 26, fontWeight: "700", color: colors.text },
  meta: { fontSize: 14, color: colors.muted, marginTop: 4 },
  player: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    marginTop: 20,
  },
  playerIcon: { fontSize: 22 },
  playerText: { flex: 1, fontSize: 16, color: colors.text },
  playerTime: { fontSize: 14, color: colors.muted, fontVariant: ["tabular-nums"] },
  photo: { width: "100%", height: 240, borderRadius: 14, marginTop: 16, backgroundColor: colors.border },
  pdf: { flexDirection: "row", alignItems: "center", backgroundColor: colors.card, borderRadius: 14, padding: 14, marginTop: 16 },
  pdfText: { flex: 1, fontSize: 16, color: colors.text },
  pdfOpen: { color: colors.primary, fontSize: 16 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 28, marginBottom: 8 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: colors.text },
  link: { color: colors.primary, fontSize: 16 },
  card: { backgroundColor: colors.card, borderRadius: 14, padding: 16 },
  arabic: { fontSize: 18, lineHeight: 30, color: colors.text, writingDirection: "rtl", textAlign: "right" },
  transcriptInput: { minHeight: 160, textAlignVertical: "top" },
  summarizeButton: { backgroundColor: colors.primary, borderRadius: 14, padding: 16, alignItems: "center" },
  summarizeText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
