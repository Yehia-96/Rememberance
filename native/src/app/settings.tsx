import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput } from "react-native";
import { getApiKey, setApiKey } from "../lib/summarize";
import { colors } from "../lib/theme";

export default function Settings() {
  const [key, setKey] = useState("");
  const [hasKey, setHasKey] = useState(false);

  useEffect(() => {
    getApiKey().then((k) => setHasKey(!!k));
  }, []);

  async function save() {
    if (key.trim()) await setApiKey(key);
    router.back();
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.label}>Anthropic API key</Text>
      <TextInput
        style={styles.input}
        value={key}
        onChangeText={setKey}
        placeholder={hasKey ? "•••••••• (saved — paste a new one to replace)" : "sk-ant-…"}
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry
      />
      <Text style={styles.help}>
        Used only for the “Summarize into bullet points” feature. The key is stored in the iPhone Keychain on this
        device. Get one at console.anthropic.com. Each summary costs a fraction of a cent.
      </Text>
      <Pressable style={styles.saveButton} onPress={save}>
        <Text style={styles.saveText}>Save</Text>
      </Pressable>
      {hasKey ? (
        <Pressable
          onPress={async () => {
            await setApiKey("");
            setHasKey(false);
          }}
        >
          <Text style={styles.remove}>Remove saved key</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  label: { fontSize: 13, fontWeight: "600", color: colors.muted, textTransform: "uppercase", marginBottom: 8 },
  input: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  help: { color: colors.muted, fontSize: 14, lineHeight: 20, marginTop: 10 },
  saveButton: { backgroundColor: colors.primary, borderRadius: 14, padding: 16, alignItems: "center", marginTop: 24 },
  saveText: { color: "#fff", fontSize: 17, fontWeight: "600" },
  remove: { color: colors.danger, textAlign: "center", marginTop: 20, fontSize: 16 },
});
