import { useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { Card, Input, Screen, SectionHeader, uiStyles } from "@/components/ui";
import { searchCatalogue } from "@/data/catalogue";
import { useAppData } from "@/context/AppDataContext";
import { moonDistance } from "@/utils/planning";
import { createThemedStyles, radius, spacing } from "@/theme";

export default function MoonDistanceScreen() {
  const router = useRouter();
  const { observer } = useAppData();
  const [query, setQuery] = useState("M31");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const results = useMemo(() => searchCatalogue(query, "All", 8), [query]);
  const [selectedId, setSelectedId] = useState<string>("m31");
  const selected =
    searchCatalogue("", "All", 100).find((item) => item.id === selectedId) ??
    results[0];
  const distance =
    selected && !Number.isNaN(new Date(`${date}T22:00:00`).getTime())
      ? moonDistance(
          selected.raHours,
          selected.decDegrees,
          new Date(`${date}T22:00:00`),
          observer,
        )
      : null;
  return (
    <Screen>
      <Pressable onPress={() => router.back()}>
        <Text style={styles.back}>‹ Calculate</Text>
      </Pressable>
      <SectionHeader
        title="Moon distance"
        subtitle="Measure target-to-Moon angular separation"
      />
      <Card>
        <Input
          label="Target search"
          value={query}
          onChangeText={setQuery}
          placeholder="M31, NGC 7000, galaxy…"
        />
        <View style={styles.results}>
          {results.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => {
                setSelectedId(item.id);
                setQuery(item.catalogue);
              }}
              style={[
                styles.result,
                selected?.id === item.id && styles.selected,
              ]}
            >
              <Text style={styles.resultTitle}>{item.catalogue}</Text>
              <Text style={uiStyles.muted}>{item.name}</Text>
            </Pressable>
          ))}
        </View>
        <Input label="Date (YYYY-MM-DD)" value={date} onChangeText={setDate} />
      </Card>
      {selected && distance !== null ? (
        <Card style={styles.distance}>
          <Text style={styles.label}>ANGULAR SEPARATION</Text>
          <Text style={styles.value}>{distance.toFixed(1)}°</Text>
          <Text style={uiStyles.h3}>
            {distance >= 90
              ? "Excellent separation"
              : distance >= 60
                ? "Good separation"
                : distance >= 30
                  ? "Use selective filters"
                  : "Strong moonlight risk"}
          </Text>
          <Text style={uiStyles.muted}>
            Calculated for {selected.name} at 22:00 from {observer.label}.
            Narrowband imaging is less affected by moonlight than broadband
            work.
          </Text>
        </Card>
      ) : null}
    </Screen>
  );
}
const styles = createThemedStyles((colors) => ({
  back: { color: colors.blue, fontWeight: "700" },
  results: { gap: spacing.xs },
  result: {
    padding: 10,
    borderRadius: radius.md,
    borderColor: colors.border,
    borderWidth: 1,
  },
  selected: { borderColor: colors.gold, backgroundColor: "#282318" },
  resultTitle: { color: colors.text, fontWeight: "700" },
  distance: { alignItems: "center", paddingVertical: spacing.xl },
  label: {
    color: colors.muted,
    fontSize: 10,
    letterSpacing: 1.2,
    fontWeight: "800",
  },
  value: { color: colors.gold, fontSize: 48, fontWeight: "800" },
}));
