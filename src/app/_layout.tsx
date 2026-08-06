import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AppDataProvider } from "@/context/AppDataContext";
import { FieldModeProvider, FieldModeQuickControl } from "@/context/FieldModeContext";
import { ThemeProvider, useTheme } from "@/theme";
import { View } from "react-native";

export default function RootLayout() {
  return (
    <ThemeProvider><FieldModeProvider><AppDataProvider><View style={{ flex: 1 }}><ThemedStack /><FieldModeQuickControl /></View></AppDataProvider></FieldModeProvider></ThemeProvider>
  );
}

function ThemedStack() {
  const { colors, mode } = useTheme();
  return <>
      <StatusBar style={mode === "light" ? "dark" : "light"} />
      <Stack
        key={mode}
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="catalogue/[id]" />
        <Stack.Screen name="location" options={{ presentation: "modal" }} />
        <Stack.Screen name="about" options={{ presentation: "modal" }} />
      </Stack>
    </>;
}
