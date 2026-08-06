import { useState } from "react";
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
import { exposurePlan, exposureRecommendation } from "@/utils/planning";
import { formatDuration } from "@/utils/calculations";
import { createThemedStyles, spacing } from "@/theme";

export default function ExposureScreen() {
  const router = useRouter();
  const [readNoise, setReadNoise] = useState("1.5");
  const [skyRate, setSkyRate] = useState("0.15");
  const [overhead, setOverhead] = useState("5");
  const [hours, setHours] = useState("6");
  const [result, setResult] = useState<{
    seconds: number;
    count: number;
    total: number;
  } | null>(null);
  const [error, setError] = useState("");
  const calculate = () => {
    try {
      const seconds = exposureRecommendation(
        Number(readNoise),
        Number(skyRate),
        Number(overhead),
      );
      const plan = exposurePlan(seconds, Number(hours));
      setResult({ seconds, count: plan.count, total: plan.totalSeconds });
      setError("");
    } catch (reason) {
      setResult(null);
      setError(reason instanceof Error ? reason.message : "Check all inputs.");
    }
  };
  return (
    <Screen>
      <Pressable onPress={() => router.back()}>
        <Text style={styles.back}>‹ Tools</Text>
      </Pressable>
      <SectionHeader
        title="Exposure calculator"
        subtitle="Balance camera read noise against measured sky background"
      />
      <Card>
        <Input
          label="Camera read noise (electrons)"
          value={readNoise}
          onChangeText={setReadNoise}
          keyboardType="decimal-pad"
        />
        <Input
          label="Sky rate (electrons/pixel/second)"
          value={skyRate}
          onChangeText={setSkyRate}
          keyboardType="decimal-pad"
        />
        <Input
          label="Allowed read-noise overhead (%)"
          value={overhead}
          onChangeText={setOverhead}
          keyboardType="decimal-pad"
        />
        <Input
          label="Desired integration (hours)"
          value={hours}
          onChangeText={setHours}
          keyboardType="decimal-pad"
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button title="Build exposure plan" onPress={calculate} />
      </Card>
      {result ? (
        <View style={styles.grid}>
          <Result
            label="SUB EXPOSURE"
            value={`${Math.round(result.seconds)}s`}
          />
          <Result label="SUBFRAMES" value={`${result.count}`} />
          <Result label="ACTUAL TOTAL" value={formatDuration(result.total)} />
        </View>
      ) : null}
      <Card>
        <Text style={uiStyles.h3}>How to measure sky rate</Text>
        <Text style={uiStyles.muted}>
          Use a calibrated background region from a test exposure: median
          electrons divided by exposure seconds. The result is a physics-based
          starting point; cap exposure to avoid saturated stars, tracking errors
          and clipped highlights.
        </Text>
      </Card>
    </Screen>
  );
}
function Result({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </Card>
  );
}
const styles = createThemedStyles((colors) => ({
  back: { color: colors.blue, fontWeight: "700" },
  grid: { gap: spacing.sm },
  label: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  value: { color: colors.gold, fontSize: 30, fontWeight: "800" },
  error: { color: colors.danger },
}));
