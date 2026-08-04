import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { Card, Screen, uiStyles } from "@/components/ui";
import { createThemedStyles, spacing, ThemeMode, useTheme } from "@/theme";

export default function AboutScreen() {
  const router = useRouter();
  const { mode, setMode } = useTheme();
  return (
    <Screen>
      <Pressable onPress={() => router.back()}>
        <Text style={styles.close}>Close</Text>
      </Pressable>
      <View style={styles.hero}>
        <Text style={styles.star}>✦</Text>
        <Text style={styles.logo}>AstroToolkit</Text>
        <Text style={uiStyles.muted}>Plan · Capture · Remember</Text>
      </View>
      <Card>
        <Text style={uiStyles.h3}>Screen theme</Text>
        <Text style={uiStyles.muted}>Astro Red keeps the interface dim and avoids bright blue-white UI while you are imaging.</Text>
        <View style={styles.themes}>
          {(["light", "dark", "red"] as ThemeMode[]).map((item) => <Pressable key={item} accessibilityRole="button" onPress={() => void setMode(item)} style={[styles.themeButton, mode === item && styles.themeActive]}><Text style={[styles.themeText, mode === item && styles.themeTextActive]}>{item === "red" ? "Astro Red" : item[0].toUpperCase() + item.slice(1)}</Text></Pressable>)}
        </View>
      </Card>
      <Card>
        <Text style={uiStyles.h3}>About</Text>
        <Text style={uiStyles.body}>
          AstroToolkit is an astrophotography planning and equipment app created
          as part of the Cosmic Sanctuary Observatory project.
        </Text>
      </Card>
      <Card>
        <Text style={uiStyles.h3}>Local by design</Text>
        <Text style={uiStyles.muted}>
          Your journal, equipment and favourites stay on this device.
          AstroToolkit works offline by default. An optional Supabase account can
          back up your data across devices when configured.
        </Text>
      </Card>
      <Text style={styles.version}>Version 1.3.0 · Expo SDK 57</Text>
    </Screen>
  );
}
const styles = createThemedStyles((colors) => ({
  close: {
    color: colors.blue,
    fontSize: 16,
    fontWeight: "600",
    textAlign: "right",
  },
  hero: { alignItems: "center", gap: spacing.sm, paddingVertical: spacing.xl },
  star: { color: colors.gold, fontSize: 48 },
  logo: { color: colors.text, fontSize: 30, fontWeight: "800" },
  themes: { flexDirection: "row", gap: spacing.sm },
  themeButton: { flex: 1, minHeight: 46, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border, borderRadius: 14, backgroundColor: colors.surfaceElevated },
  themeActive: { borderColor: colors.gold, backgroundColor: colors.input },
  themeText: { color: colors.muted, fontWeight: "700", fontSize: 12 },
  themeTextActive: { color: colors.gold },
  version: { color: colors.muted, textAlign: "center", fontSize: 12 },
}));
