import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { addCategory, getCategory, updateCategory } from "../lib/db";
import { CATEGORY_COLORS, CATEGORY_EMOJIS, colors } from "../lib/theme";

export default function CategoryEdit() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const existing = id ? getCategory(Number(id)) : null;

  const [name, setName] = useState(existing?.name ?? "");
  const [emoji, setEmoji] = useState(existing?.emoji ?? CATEGORY_EMOJIS[2]);
  const [color, setColor] = useState(existing?.color ?? CATEGORY_COLORS[2]);

  function save() {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (existing) updateCategory(existing.id, trimmed, emoji, color);
    else addCategory(trimmed, emoji, color);
    router.back();
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.label}>Name</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="e.g. Ideas, Meetings, University"
        autoFocus={!existing}
        returnKeyType="done"
        onSubmitEditing={save}
      />

      <Text style={styles.label}>Icon</Text>
      <View style={styles.wrap}>
        {CATEGORY_EMOJIS.map((e) => (
          <Pressable key={e} onPress={() => setEmoji(e)} style={[styles.emojiBox, emoji === e && styles.selected]}>
            <Text style={styles.emoji}>{e}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Colour</Text>
      <View style={styles.wrap}>
        {CATEGORY_COLORS.map((c) => (
          <Pressable
            key={c}
            onPress={() => setColor(c)}
            style={[styles.swatch, { backgroundColor: c }, color === c && styles.swatchSelected]}
          />
        ))}
      </View>

      <Pressable style={[styles.saveButton, !name.trim() && { opacity: 0.4 }]} onPress={save} disabled={!name.trim()}>
        <Text style={styles.saveText}>{existing ? "Save changes" : "Create category"}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  label: { fontSize: 13, fontWeight: "600", color: colors.muted, textTransform: "uppercase", marginTop: 20, marginBottom: 8 },
  input: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    fontSize: 17,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  emojiBox: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  selected: { borderColor: colors.primary },
  emoji: { fontSize: 26 },
  swatch: { width: 40, height: 40, borderRadius: 20, borderWidth: 3, borderColor: "transparent" },
  swatchSelected: { borderColor: colors.text },
  saveButton: { backgroundColor: colors.primary, borderRadius: 14, padding: 16, alignItems: "center", marginTop: 32 },
  saveText: { color: "#fff", fontSize: 17, fontWeight: "600" },
});
