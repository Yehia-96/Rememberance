import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import { useKeepAwake } from "expo-keep-awake";
import * as Location from "expo-location";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from "expo-speech-recognition";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { addRecording, listCategories } from "../lib/db";
import { storeFile } from "../lib/files";
import { colors, formatDuration } from "../lib/theme";

const LANG = "ar-EG";

type Phase = "ready" | "recording" | "stopping" | "details";

function joinText(a: string, b: string) {
  return [a.trim(), b.trim()].filter(Boolean).join(" ");
}

export default function RecordScreen() {
  useKeepAwake();
  const params = useLocalSearchParams<{ categoryId: string }>();

  const [phase, setPhase] = useState<Phase>("ready");
  const phaseRef = useRef<Phase>("ready");
  const setPhaseBoth = (p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  };

  // Transcript = finalised segments + the segment currently being recognised.
  const committed = useRef("");
  const [committedText, setCommittedText] = useState("");
  const [interim, setInterim] = useState("");
  const interimRef = useRef("");
  const audioSegments = useRef<string[]>([]);
  const stopRequested = useRef(false);
  const onDevice = useRef(false);
  const startedAt = useRef(0);
  const [elapsed, setElapsed] = useState(0);

  // Details form
  const [transcript, setTranscript] = useState("");
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState(Number(params.categoryId));
  const [locationName, setLocationName] = useState("");
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [pdf, setPdf] = useState<{ uri: string; name: string } | null>(null);
  const categories = listCategories();

  // On-device recognition has no time limit and works offline, but only if the Egyptian Arabic model is installed.
  useEffect(() => {
    ExpoSpeechRecognitionModule.getSupportedLocales({})
      .then(({ installedLocales }) => {
        const installed = installedLocales.some((l) => l.replace("_", "-").toLowerCase() === LANG.toLowerCase());
        onDevice.current = installed && ExpoSpeechRecognitionModule.supportsOnDeviceRecognition();
      })
      .catch(() => {});
    return () => {
      if (phaseRef.current === "recording") {
        stopRequested.current = true;
        ExpoSpeechRecognitionModule.abort();
      }
    };
  }, []);

  useEffect(() => {
    if (phase !== "recording") return;
    const t = setInterval(() => setElapsed(Date.now() - startedAt.current), 500);
    return () => clearInterval(t);
  }, [phase]);

  function startSession() {
    ExpoSpeechRecognitionModule.start({
      lang: LANG,
      interimResults: true,
      continuous: true,
      addsPunctuation: true,
      requiresOnDeviceRecognition: onDevice.current,
      recordingOptions: { persist: true },
    });
  }

  async function begin() {
    const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Allow microphone and speech recognition in Settings to record.");
      return;
    }
    committed.current = "";
    setCommittedText("");
    setInterim("");
    interimRef.current = "";
    audioSegments.current = [];
    stopRequested.current = false;
    startedAt.current = Date.now();
    setElapsed(0);
    setPhaseBoth("recording");
    startSession();
  }

  function stop() {
    stopRequested.current = true;
    setElapsed(Date.now() - startedAt.current);
    setPhaseBoth("stopping");
    ExpoSpeechRecognitionModule.stop();
  }

  function commitInterim() {
    if (interimRef.current) {
      committed.current = joinText(committed.current, interimRef.current);
      interimRef.current = "";
      setInterim("");
      setCommittedText(committed.current);
    }
  }

  useSpeechRecognitionEvent("result", (event) => {
    const text = event.results[0]?.transcript ?? "";
    if (event.isFinal) {
      interimRef.current = text;
      commitInterim();
    } else {
      interimRef.current = text;
      setInterim(text);
    }
  });

  useSpeechRecognitionEvent("audioend", (event) => {
    if (event.uri) audioSegments.current.push(event.uri);
  });

  useSpeechRecognitionEvent("error", (event) => {
    // Silence timeouts just end the session; the "end" handler restarts it.
    if (event.error === "no-speech" || event.error === "speech-timeout" || event.error === "aborted") return;
    stopRequested.current = true;
    Alert.alert("Speech recognition error", `${event.error}: ${event.message}`);
  });

  useSpeechRecognitionEvent("end", () => {
    commitInterim();
    if (phaseRef.current === "recording" && !stopRequested.current) {
      // Recognition ended on its own (time limit / silence) — keep going with a new segment.
      startSession();
      return;
    }
    if (phaseRef.current === "recording" || phaseRef.current === "stopping") {
      setTranscript(committed.current);
      setPhaseBoth("details");
    }
  });

  async function fillCurrentLocation() {
    setLocating(true);
    try {
      const { granted } = await Location.requestForegroundPermissionsAsync();
      if (!granted) return;
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      const [place] = await Location.reverseGeocodeAsync(pos.coords);
      if (place) {
        setLocationName([place.name, place.district ?? place.subregion, place.city].filter(Boolean).join(", "));
      } else {
        setLocationName(`${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
      }
    } catch (e) {
      Alert.alert("Couldn't get location", String(e));
    } finally {
      setLocating(false);
    }
  }

  async function takePhoto() {
    const { granted } = await ImagePicker.requestCameraPermissionsAsync();
    if (!granted) return;
    const res = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.8 });
    if (!res.canceled) setPhotoUri(res.assets[0].uri);
  }

  async function pickPhoto() {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 });
    if (!res.canceled) setPhotoUri(res.assets[0].uri);
  }

  async function pickPdf() {
    const res = await DocumentPicker.getDocumentAsync({ type: "application/pdf", copyToCacheDirectory: true });
    if (!res.canceled) setPdf({ uri: res.assets[0].uri, name: res.assets[0].name });
  }

  function cleanupTempAudio() {
    for (const uri of audioSegments.current) {
      try {
        const f = new File(uri);
        if (f.exists) f.delete();
      } catch {}
    }
  }

  function save() {
    try {
      const audioNames = audioSegments.current.map((uri) => storeFile(uri, "audio"));
      cleanupTempAudio();
      const id = addRecording({
        categoryId,
        title: title.trim() || null,
        transcript: transcript.trim(),
        audioFiles: audioNames.length ? JSON.stringify(audioNames) : null,
        photoFile: photoUri ? storeFile(photoUri, "photo") : null,
        pdfFile: pdf ? storeFile(pdf.uri, "doc") : null,
        pdfName: pdf?.name ?? null,
        locationName: locationName.trim() || null,
        latitude: coords?.latitude ?? null,
        longitude: coords?.longitude ?? null,
        durationMs: elapsed,
        createdAt: startedAt.current,
      });
      router.replace(`/recording/${id}`);
    } catch (e) {
      Alert.alert("Couldn't save", String(e));
    }
  }

  function discard() {
    Alert.alert("Discard this recording?", undefined, [
      { text: "Keep editing", style: "cancel" },
      {
        text: "Discard",
        style: "destructive",
        onPress: () => {
          cleanupTempAudio();
          router.back();
        },
      },
    ]);
  }

  const busy = phase === "recording" || phase === "stopping";

  if (phase !== "details") {
    const live = joinText(committedText, interim);
    return (
      <View style={styles.flex}>
        <Stack.Screen options={{ gestureEnabled: !busy, headerBackVisible: !busy }} />
        <ScrollView style={styles.flex} contentContainerStyle={styles.liveContainer}>
          {live ? (
            <Text style={styles.liveText}>
              {committedText}
              {interim ? <Text style={styles.interim}> {interim}</Text> : null}
            </Text>
          ) : (
            <Text style={styles.placeholder}>
              {phase === "ready" ? "Tap the button and start speaking in Arabic." : "Listening… ابدأ الكلام"}
            </Text>
          )}
        </ScrollView>
        <View style={styles.controls}>
          <Text style={styles.timer}>{formatDuration(elapsed) || "0:00"}</Text>
          {phase === "stopping" ? (
            <ActivityIndicator size="large" style={styles.bigButton} />
          ) : (
            <Pressable
              style={[styles.bigButton, phase === "recording" && styles.bigButtonActive]}
              onPress={phase === "recording" ? stop : begin}
            >
              <View style={phase === "recording" ? styles.stopSquare : styles.recordCircle} />
            </Pressable>
          )}
          <Text style={styles.controlHint}>{phase === "recording" ? "Tap to finish" : phase === "ready" ? "Tap to record" : ""}</Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior="padding" keyboardVerticalOffset={100}>
      <Stack.Screen
        options={{
          title: "Save recording",
          gestureEnabled: false,
          headerBackVisible: false,
          headerLeft: () => (
            <Pressable onPress={discard} hitSlop={10}>
              <Text style={[styles.headerButton, { color: colors.danger }]}>Discard</Text>
            </Pressable>
          ),
          headerRight: () => (
            <Pressable onPress={save} hitSlop={10}>
              <Text style={[styles.headerButton, { fontWeight: "700" }]}>Save</Text>
            </Pressable>
          ),
        }}
      />
      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Title (optional)</Text>
        <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Untitled — date will be used" />

        <Text style={styles.label}>Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {categories.map((c) => (
            <Pressable
              key={c.id}
              onPress={() => setCategoryId(c.id)}
              style={[styles.chip, categoryId === c.id && { backgroundColor: c.color, borderColor: c.color }]}
            >
              <Text style={[styles.chipText, categoryId === c.id && { color: "#fff" }]}>
                {c.emoji} {c.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <Text style={styles.label}>Location (optional)</Text>
        <View style={styles.row}>
          <TextInput
            style={[styles.input, styles.flex]}
            value={locationName}
            onChangeText={setLocationName}
            placeholder="Type a place"
          />
          <Pressable style={styles.smallButton} onPress={fillCurrentLocation} disabled={locating}>
            {locating ? <ActivityIndicator /> : <Text style={styles.smallButtonText}>📍 Current</Text>}
          </Pressable>
        </View>

        <Text style={styles.label}>Picture (optional)</Text>
        {photoUri ? (
          <View>
            <Image source={{ uri: photoUri }} style={styles.photo} />
            <Pressable onPress={() => setPhotoUri(null)}>
              <Text style={styles.remove}>Remove picture</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.row}>
            <Pressable style={[styles.smallButton, styles.flex]} onPress={takePhoto}>
              <Text style={styles.smallButtonText}>📷 Camera</Text>
            </Pressable>
            <Pressable style={[styles.smallButton, styles.flex]} onPress={pickPhoto}>
              <Text style={styles.smallButtonText}>🖼️ Photos</Text>
            </Pressable>
          </View>
        )}

        <Text style={styles.label}>PDF (optional)</Text>
        {pdf ? (
          <View style={styles.row}>
            <Text style={[styles.pdfName, styles.flex]} numberOfLines={1}>
              📄 {pdf.name}
            </Text>
            <Pressable onPress={() => setPdf(null)}>
              <Text style={styles.remove}>Remove</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable style={styles.smallButton} onPress={pickPdf}>
            <Text style={styles.smallButtonText}>📎 Attach PDF</Text>
          </Pressable>
        )}

        <Text style={styles.label}>Transcript</Text>
        <TextInput
          style={[styles.input, styles.transcriptInput]}
          value={transcript}
          onChangeText={setTranscript}
          multiline
          placeholder="Nothing was recognised — you can type here."
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  liveContainer: { padding: 20, flexGrow: 1 },
  liveText: { fontSize: 22, lineHeight: 36, color: colors.text, writingDirection: "rtl", textAlign: "right" },
  interim: { color: colors.muted },
  placeholder: { fontSize: 18, color: colors.muted, textAlign: "center", marginTop: 80 },
  controls: { alignItems: "center", paddingBottom: 50, paddingTop: 16, gap: 10 },
  timer: { fontSize: 20, fontVariant: ["tabular-nums"], color: colors.text },
  bigButton: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 4,
    borderColor: colors.recording,
    alignItems: "center",
    justifyContent: "center",
  },
  bigButtonActive: { borderColor: colors.text },
  recordCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.recording },
  stopSquare: { width: 32, height: 32, borderRadius: 6, backgroundColor: colors.recording },
  controlHint: { color: colors.muted, fontSize: 14, minHeight: 18 },
  headerButton: { color: colors.primary, fontSize: 17 },
  form: { padding: 20, paddingBottom: 60 },
  label: { fontSize: 13, fontWeight: "600", color: colors.muted, textTransform: "uppercase", marginTop: 20, marginBottom: 8 },
  input: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  transcriptInput: { minHeight: 160, textAlignVertical: "top", writingDirection: "rtl", textAlign: "right", lineHeight: 26 },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  chips: { gap: 8 },
  chip: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14 },
  chipText: { fontSize: 15, color: colors.text },
  smallButton: {
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  smallButtonText: { fontSize: 15, color: colors.primary, fontWeight: "500" },
  photo: { width: "100%", height: 220, borderRadius: 12, backgroundColor: colors.border },
  remove: { color: colors.danger, fontSize: 15, marginTop: 8 },
  pdfName: { fontSize: 16, color: colors.text },
});
