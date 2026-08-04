import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AppDataProvider } from "@/context/AppDataContext";
import { ThemeProvider, useTheme } from "@/theme";

export default function RootLayout() {
  return (
    <ThemeProvider><AppDataProvider><ThemedStack /></AppDataProvider></ThemeProvider>
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
