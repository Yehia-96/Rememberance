import { router, Stack, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { deleteCategory, listCategories } from "../lib/db";
import { colors } from "../lib/theme";

type Item = ReturnType<typeof listCategories>[number] | { id: "add" };

export default function Home() {
  const [categories, setCategories] = useState(listCategories);

  useFocusEffect(useCallback(() => setCategories(listCategories()), []));

  function onLongPress(cat: ReturnType<typeof listCategories>[number]) {
    Alert.alert(cat.name, undefined, [
      { text: "Edit", onPress: () => router.push({ pathname: "/category-edit", params: { id: cat.id } }) },
      {
        text: "Delete",
        style: "destructive",
        onPress: () =>
          Alert.alert(
            `Delete "${cat.name}"?`,
            `This also deletes its ${cat.recordingCount} recording(s).`,
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Delete",
                style: "destructive",
                onPress: () => {
                  deleteCategory(cat.id);
                  setCategories(listCategories());
                },
              },
            ],
          ),
      },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  const data: Item[] = [...categories, { id: "add" }];

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable onPress={() => router.push("/settings")} hitSlop={10}>
              <Text style={styles.headerButton}>Settings</Text>
            </Pressable>
          ),
        }}
      />
      <FlatList
        data={data}
        numColumns={2}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        columnWrapperStyle={styles.row}
        ListFooterComponent={<Text style={styles.hint}>Long-press a category to edit or delete it.</Text>}
        renderItem={({ item }) =>
          item.id === "add" ? (
            <Pressable style={[styles.card, styles.addCard]} onPress={() => router.push("/category-edit")}>
              <Text style={styles.addPlus}>＋</Text>
              <Text style={styles.addText}>New category</Text>
            </Pressable>
          ) : (
            <Pressable
              style={[styles.card, { borderTopColor: item.color }]}
              onPress={() => router.push(`/category/${item.id}`)}
              onLongPress={() => onLongPress(item)}
            >
              <Text style={styles.emoji}>{item.emoji}</Text>
              <Text style={styles.name} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.count}>
                {item.recordingCount} recording{item.recordingCount === 1 ? "" : "s"}
              </Text>
            </Pressable>
          )
        }
      />
    </>
  );
}

const styles = StyleSheet.create({
  headerButton: { color: colors.primary, fontSize: 17 },
  list: { padding: 16, gap: 12 },
  row: { gap: 12 },
  card: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    minHeight: 130,
    borderTopWidth: 5,
    borderTopColor: colors.border,
    justifyContent: "flex-end",
  },
  emoji: { fontSize: 32, marginBottom: 8 },
  name: { fontSize: 18, fontWeight: "600", color: colors.text },
  count: { fontSize: 13, color: colors.muted, marginTop: 2 },
  addCard: {
    borderTopWidth: 0,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: colors.border,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  addPlus: { fontSize: 30, color: colors.muted },
  addText: { fontSize: 15, color: colors.muted, marginTop: 4 },
  hint: { textAlign: "center", color: colors.muted, fontSize: 13, marginTop: 8 },
});
