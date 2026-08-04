import { useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";
import {
  Button,
  Card,
  Input,
  Screen,
  SectionHeader,
  uiStyles,
} from "@/components/ui";
import { useAppData } from "@/context/AppDataContext";
import { flatHorizon } from "@/utils/horizon";
import { createThemedStyles, radius, spacing } from "@/theme";

const directions = [
  "N",
  "NNE",
  "ENE",
  "E",
  "ESE",
  "SSE",
  "S",
  "SSW",
  "WSW",
  "W",
  "WNW",
  "NNW",
];

export default function HorizonScreen() {
  const router = useRouter();
  const { horizon, saveHorizon } = useAppData();
  const [label, setLabel] = useState(horizon.label);
  const [enabled, setEnabled] = useState(horizon.enabled);
  const [points, setPoints] = useState(
    horizon.points.length === 12 ? horizon.points : flatHorizon.points,
  );
  const maximum = useMemo(
    () => Math.max(...points.map((point) => point.elevationDegrees)),
    [points],
  );
  const change = (index: number, amount: number) =>
    setPoints((current) =>
      current.map((point, pointIndex) =>
        pointIndex === index
          ? {
              ...point,
              elevationDegrees: Math.max(
                0,
                Math.min(60, point.elevationDegrees + amount),
              ),
            }
          : point,
      ),
    );
  const save = async () => {
    await saveHorizon({
      enabled,
      label: label.trim() || "My observing horizon",
      points,
      updatedAt: new Date().toISOString(),
    });
    router.back();
  };
  return (
    <Screen>
      <Pressable onPress={() => router.back()}>
        <Text style={styles.back}>‹ Tonight</Text>
      </Pressable>
      <SectionHeader
        title="Local horizon"
        subtitle="Teach Smart Best Tonight where trees, roofs and hills block your sky"
      />
      <Card style={styles.summary}>
        <Text style={styles.summaryValue}>
          {enabled
            ? `${Math.round(maximum)}° highest obstruction`
            : "Profile paused"}
        </Text>
        <Text style={uiStyles.muted}>
          The app interpolates between twelve compass sectors and keeps blocked
          targets out of your schedule.
        </Text>
      </Card>
      <Input
        label="Horizon profile name"
        value={label}
        onChangeText={setLabel}
        placeholder="Back garden"
      />
      <Pressable
        onPress={() => setEnabled((value) => !value)}
        style={[styles.toggle, enabled && styles.toggleActive]}
      >
        <Text style={styles.toggleText}>
          {enabled
            ? "✓ Use this horizon in Smart Best Tonight"
            : "Use a flat mathematical horizon"}
        </Text>
      </Pressable>
      <View style={styles.skyline}>
        {points.map((point, index) => (
          <View key={point.azimuthDegrees} style={styles.skyColumn}>
            <View style={styles.sky}>
              <View
                style={[
                  styles.ground,
                  {
                    height: `${Math.max(4, (point.elevationDegrees / 60) * 100)}%`,
                  },
                ]}
              />
            </View>
            <Text style={styles.direction}>{directions[index]}</Text>
          </View>
        ))}
      </View>
      <SectionHeader
        title="Set obstruction height"
        subtitle="Estimate the altitude where clear sky begins in each direction"
      />
      {points.map((point, index) => (
        <Card key={point.azimuthDegrees} style={styles.row}>
          <View style={styles.directionBadge}>
            <Text style={styles.directionLarge}>{directions[index]}</Text>
            <Text style={styles.azimuth}>{point.azimuthDegrees}°</Text>
          </View>
          <Pressable
            accessibilityLabel={`Lower ${directions[index]} horizon`}
            style={styles.step}
            onPress={() => change(index, -5)}
          >
            <Text style={styles.stepText}>−</Text>
          </Pressable>
          <Text style={styles.height}>{point.elevationDegrees}°</Text>
          <Pressable
            accessibilityLabel={`Raise ${directions[index]} horizon`}
            style={styles.step}
            onPress={() => change(index, 5)}
          >
            <Text style={styles.stepText}>+</Text>
          </Pressable>
        </Card>
      ))}
      <Button title="Save horizon profile" onPress={() => void save()} />
      <Button
        title="Reset to flat horizon"
        variant="secondary"
        onPress={() =>
          setPoints(flatHorizon.points.map((point) => ({ ...point })))
        }
      />
      <Text style={styles.note}>
        Tip: use a planetarium altitude readout or a clinometer app while
        standing at the telescope. A rough profile is still much better than
        assuming a perfectly clear horizon.
      </Text>
    </Screen>
  );
}
const styles = createThemedStyles((colors) => ({
  back: { color: colors.blue, fontWeight: "700" },
  summary: { borderColor: colors.gold },
  summaryValue: { color: colors.gold, fontSize: 22, fontWeight: "800" },
  toggle: {
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  toggleActive: { borderColor: colors.success, backgroundColor: "#122A24" },
  toggleText: { color: colors.text, textAlign: "center", fontWeight: "700" },
  skyline: {
    height: 150,
    flexDirection: "row",
    alignItems: "stretch",
    backgroundColor: "#07101F",
    borderRadius: radius.lg,
    overflow: "hidden",
    paddingTop: 12,
  },
  skyColumn: { flex: 1, alignItems: "center" },
  sky: { flex: 1, width: "100%", justifyContent: "flex-end" },
  ground: {
    width: "100%",
    backgroundColor: "#354331",
    borderTopWidth: 1,
    borderTopColor: colors.gold,
  },
  direction: { color: colors.muted, fontSize: 8, paddingVertical: 5 },
  row: { flexDirection: "row", alignItems: "center" },
  directionBadge: { width: 58 },
  directionLarge: { color: colors.gold, fontWeight: "800" },
  azimuth: { color: colors.muted, fontSize: 10 },
  step: {
    width: 46,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    backgroundColor: colors.surfaceElevated,
  },
  stepText: { color: colors.text, fontSize: 24 },
  height: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
    flex: 1,
  },
  note: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 17,
    textAlign: "center",
  },
}));
