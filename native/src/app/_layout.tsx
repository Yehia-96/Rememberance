import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { initDb } from "../lib/db";
import { colors } from "../lib/theme";

initDb();

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerTintColor: colors.primary,
          headerTitleStyle: { color: colors.text },
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="index" options={{ title: "Rememberance" }} />
        <Stack.Screen name="category/[id]" options={{ title: "" }} />
        <Stack.Screen name="category-edit" options={{ presentation: "modal", title: "Category" }} />
        <Stack.Screen name="record" options={{ title: "New recording" }} />
        <Stack.Screen name="recording/[id]" options={{ title: "" }} />
        <Stack.Screen name="settings" options={{ presentation: "modal", title: "Settings" }} />
      </Stack>
    </>
  );
}
