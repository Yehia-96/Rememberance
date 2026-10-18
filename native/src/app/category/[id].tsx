import { router, Stack, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getCategory, listRecordings } from "../../lib/db";
import { colors, formatDate, formatDuration } from "../../lib/theme";
import type { Recording } from "../../lib/types";

export default function CategoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const categoryId = Number(id);
  const category = getCategory(categoryId);
  const [search, setSearch] = useState("");
  const [recordings, setRecordings] = useState<Recording[]>(() => listRecordings(categoryId));

  useFocusEffect(useCallback(() => setRecordings(listRecordings(categoryId, search)), [categoryId, search]));

  return (
    <SafeAreaView style={styles.flex} edges={["bottom"]}>
      <Stack.Screen options={{ title: category ? `${category.emoji} ${category.name}` : "" }} />
      <FlatList
        data={recordings}
        keyExtractor={(r) => String(r.id)}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <TextInput
            style={styles.search}
            value={search}
            onChangeText={(text) => {
              setSearch(text);
              setRecordings(listRecordings(categoryId, text));
            }}
            placeholder="Search titles and transcripts"
            clearButtonMode="while-editing"
          />
        }
        ListEmptyComponent={
          <Text style={styles.empty}>
            {search ? "No matches." : "No recordings yet.\nTap the record button to start."}
          </Text>
        }
        renderItem={({ item }) => (
          <Pressable style={styles.item} onPress={() => router.push(`/recording/${item.id}`)}>
            <Text style={styles.title} numberOfLines={1}>
              {item.title || formatDate(item.createdAt)}
            </Text>
            {item.transcript ? (
              <Text style={styles.preview} numberOfLines={2}>
                {item.transcript}
              </Text>
            ) : null}
            <View style={styles.metaRow}>
              <Text style={styles.meta}>
                {item.title ? formatDate(item.createdAt) : ""}
                {item.durationMs ? `  ·  ${formatDuration(item.durationMs)}` : ""}
              </Text>
              <Text style={styles.meta}>
                {item.summary ? "✨" : ""}
                {item.locationName ? " 📍" : ""}
                {item.photoFile ? " 🖼️" : ""}
                {item.pdfFile ? " 📄" : ""}
              </Text>
            </View>
          </Pressable>
        )}
      />
      <Pressable
        style={styles.recordButton}
        onPress={() => router.push({ pathname: "/record", params: { categoryId } })}
      >
        <View style={styles.recordDot} />
        <Text style={styles.recordText}>Record</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { padding: 16, paddingBottom: 120, gap: 10 },
  search: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  empty: { textAlign: "center", color: colors.muted, marginTop: 60, fontSize: 16, lineHeight: 24 },
  item: { backgroundColor: colors.card, borderRadius: 14, padding: 14 },
  title: { fontSize: 17, fontWeight: "600", color: colors.text },
  preview: { fontSize: 15, color: colors.muted, marginTop: 4, writingDirection: "rtl", textAlign: "right" },
  metaRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  meta: { fontSize: 12, color: colors.muted },
  recordButton: {
    position: "absolute",
    bottom: 40,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.recording,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 40,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  recordDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: "#fff" },
  recordText: { color: "#fff", fontSize: 18, fontWeight: "700" },
});
