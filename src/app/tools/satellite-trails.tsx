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
import { getCatalogueObject, searchCatalogue } from "@/data/catalogue";
import { useAppData } from "@/context/AppDataContext";
import { fetchVisualSatellites } from "@/services/satellites";
import { fieldOfView } from "@/utils/calculations";
import {
  predictTrailRisks,
  safestWindows,
  TrailRisk,
} from "@/utils/satelliteTrails";
import { colors, createThemedStyles, radius, spacing } from "@/theme";

export default function SatelliteTrailsScreen() {
  const router = useRouter();
  const { observer, equipment } = useAppData();
  const [targetId, setTargetId] = useState("ngc7000");
  const [query, setQuery] = useState("");
  const [duration, setDuration] = useState("240");
  const [risks, setRisks] = useState<TrailRisk[] | null>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const target = useMemo(() => getCatalogueObject(targetId), [targetId]);
  const matches = useMemo(
    () =>
      query.trim()
        ? searchCatalogue(query, "All", 8).filter(
            (item) => item.objectKind !== "comet",
          )
        : [],
    [query],
  );
  const start = useMemo(() => {
    const date = new Date();
    date.setMinutes(0, 0, 0);
    if (date.getHours() < 18) date.setHours(20);
    else date.setHours(date.getHours() + 1);
    return date;
  }, []);
  const rig = equipment.rigs[0];
  const scope = equipment.telescopes.find(
    (item) => item.id === rig?.telescopeId,
  );
  const camera = equipment.cameras.find((item) => item.id === rig?.cameraId);
  const frame =
    scope && camera
      ? {
          width: fieldOfView(camera.sensorWidth, scope.focalLength),
          height: fieldOfView(camera.sensorHeight, scope.focalLength),
        }
      : null;
  const run = async () => {
    if (
      !target ||
      !frame ||
      !Number.isFinite(Number(duration)) ||
      Number(duration) < 30
    ) {
      setError(
        "Choose a target, configure a rig and enter at least 30 minutes.",
      );
      return;
    }
    setStatus("Downloading current bright-satellite orbits…");
    setError("");
    setRisks(null);
    try {
      const data = await fetchVisualSatellites();
      setStatus(
        `Checking ${data.tles.length} bright satellites${data.cached ? " from cache" : ""}…`,
      );
      const result = predictTrailRisks({
        tles: data.tles,
        observer,
        targetRaHours: target.raHours,
        targetDecDegrees: target.decDegrees,
        start,
        durationMinutes: Number(duration),
        frameWidthDegrees: frame.width,
        frameHeightDegrees: frame.height,
      });
      setRisks(result);
      setStatus(`Orbit data: ${new Date(data.fetchedAt).toLocaleString()}`);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Satellite data could not be loaded.",
      );
      setStatus("");
    }
  };
  const windows = risks ? safestWindows(start, Number(duration), risks) : [];
  return (
    <Screen>
      <Pressable onPress={() => router.back()}>
        <Text style={styles.back}>‹ Calculate</Text>
      </Pressable>
      <SectionHeader
        title="Satellite trail avoidance"
        subtitle="Find the cleanest exposure windows for your real camera frame"
      />
      <Input
        label="Find a deep-sky target"
        value={query}
        onChangeText={setQuery}
        placeholder="Try NGC 7000 or M31"
      />
      {matches.map((item) => (
        <Pressable
          key={item.id}
          style={styles.match}
          onPress={() => {
            setTargetId(item.id);
            setQuery("");
            setRisks(null);
          }}
        >
          <Text style={uiStyles.h3}>{item.name}</Text>
          <Text style={uiStyles.muted}>
            {item.catalogue} · {item.constellation}
          </Text>
        </Pressable>
      ))}
      <Card style={styles.target}>
        <Text style={styles.kicker}>PLANNING FOR</Text>
        <Text style={styles.targetName}>{target?.name}</Text>
        <Text style={uiStyles.muted}>
          {observer.label} · {rig?.name ?? "No rig"}
        </Text>
        {frame ? (
          <Text style={styles.frame}>
            {frame.width.toFixed(2)}° × {frame.height.toFixed(2)}° frame
          </Text>
        ) : null}
      </Card>
      <Input
        label="Session duration (minutes)"
        value={duration}
        onChangeText={setDuration}
        keyboardType="number-pad"
      />
      <Text style={uiStyles.muted}>
        Starts{" "}
        {start.toLocaleString([], {
          weekday: "short",
          hour: "2-digit",
          minute: "2-digit",
        })}
        . The scan checks the CelesTrak visual-satellite group once per minute.
      </Text>
      <Button title="Scan for trail crossings" onPress={() => void run()} />
      {status ? <Text style={styles.status}>{status}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {risks ? (
        <>
          <SectionHeader
            title="Safest capture windows"
            subtitle={`${risks.length} possible frame crossing${risks.length === 1 ? "" : "s"} found`}
          />
          <View style={styles.windowGrid}>
            {windows.map((window) => (
              <Card
                key={window.start.toISOString()}
                style={[
                  styles.window,
                  window.rating === "CLEAR" && styles.clear,
                  window.rating === "BUSY" && styles.busy,
                ]}
              >
                <Text style={styles.windowTime}>
                  {window.start.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
                <Text
                  style={[
                    styles.rating,
                    window.rating === "CLEAR" && { color: colors.success },
                    window.rating === "BUSY" && { color: colors.danger },
                  ]}
                >
                  {window.rating}
                </Text>
                <Text style={styles.count}>
                  {window.count
                    ? `${window.count} crossing${window.count === 1 ? "" : "s"}`
                    : "No predicted trails"}
                </Text>
              </Card>
            ))}
          </View>
          <SectionHeader title="Predicted crossings" />
          {risks.length ? (
            risks.map((risk) => (
              <Card
                key={`${risk.name}-${risk.at.toISOString()}`}
                style={styles.risk}
              >
                <View style={{ flex: 1 }}>
                  <Text style={uiStyles.h3}>{risk.name}</Text>
                  <Text style={uiStyles.muted}>
                    {risk.at.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    · {risk.direction} · {Math.round(risk.altitudeDegrees)}°
                    high
                  </Text>
                </View>
                <Text style={styles.separation}>
                  {risk.separationDegrees.toFixed(2)}°
                </Text>
              </Card>
            ))
          ) : (
            <Card>
              <Text style={styles.clearText}>
                No bright-satellite crossings are predicted through this frame.
              </Text>
            </Card>
          )}
        </>
      ) : null}
      <Text style={styles.note}>
        Predictions use public general-perturbations elements and are planning
        estimates. Fresh launches and manoeuvring spacecraft may differ; leave a
        small safety margin.
      </Text>
    </Screen>
  );
}
const styles = createThemedStyles((colors) => ({
  back: { color: colors.blue, fontWeight: "700" },
  match: {
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  target: { borderColor: colors.gold },
  kicker: {
    color: colors.gold,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  targetName: { color: colors.text, fontSize: 25, fontWeight: "800" },
  frame: { color: colors.blue, fontWeight: "700" },
  status: { color: colors.gold, textAlign: "center" },
  error: { color: colors.danger, textAlign: "center" },
  windowGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  window: { width: "47%", minHeight: 112 },
  clear: { borderColor: colors.success },
  busy: { borderColor: colors.danger },
  windowTime: { color: colors.text, fontWeight: "800", fontSize: 17 },
  rating: {
    color: colors.warning,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
  },
  count: { color: colors.muted, fontSize: 11 },
  risk: { flexDirection: "row", alignItems: "center" },
  separation: { color: colors.gold, fontSize: 20, fontWeight: "800" },
  clearText: { color: colors.success, textAlign: "center", fontWeight: "700" },
  note: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 17,
    textAlign: "center",
  },
}));
