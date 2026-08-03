import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Card, Screen, uiStyles } from "@/components/ui";
import { colors, spacing } from "@/theme";

export default function AboutScreen() {
  const router = useRouter();
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
      <Text style={styles.version}>Version 1.0.0 · Expo SDK 57</Text>
    </Screen>
  );
}
const styles = StyleSheet.create({
  close: {
    color: colors.blue,
    fontSize: 16,
    fontWeight: "600",
    textAlign: "right",
  },
  hero: { alignItems: "center", gap: spacing.sm, paddingVertical: spacing.xl },
  star: { color: colors.gold, fontSize: 48 },
  logo: { color: colors.text, fontSize: 30, fontWeight: "800" },
  version: { color: colors.muted, textAlign: "center", fontSize: 12 },
});
