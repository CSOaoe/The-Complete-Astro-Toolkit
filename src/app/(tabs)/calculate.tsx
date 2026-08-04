import { useState } from "react";
import { Href, useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  Button,
  Card,
  Header,
  Input,
  Screen,
  SectionHeader,
  uiStyles,
} from "@/components/ui";
import { fieldOfView, pixelScale } from "@/utils/calculations";
import { colors, radius, spacing } from "@/theme";

type Field =
  | "focalLength"
  | "sensorWidth"
  | "sensorHeight"
  | "pixelSize"
  | "resolutionWidth"
  | "resolutionHeight";
const initial: Record<Field, string> = {
  focalLength: "",
  sensorWidth: "",
  sensorHeight: "",
  pixelSize: "",
  resolutionWidth: "",
  resolutionHeight: "",
};
const toolRoutes: {
  title: string;
  subtitle: string;
  icon: string;
  href: Href;
}[] = [
  {
    title: "Astro Flight",
    subtitle: "Fly through your own image layers",
    icon: "🚀",
    href: "/astro-flight" as Href,
  },
  {
    title: "Visual framing",
    subtitle: "Preview target fit and rotation",
    icon: "▣",
    href: "/tools/framing" as Href,
  },
  {
    title: "Moon distance",
    subtitle: "Check angular separation",
    icon: "☾",
    href: "/tools/moon-distance" as Href,
  },
  {
    title: "Mosaic planner",
    subtitle: "Build an overlap-safe panel grid",
    icon: "▦",
    href: "/tools/mosaic" as Href,
  },
  {
    title: "Plate solving",
    subtitle: "Identify an astro image's exact sky centre",
    icon: "⌖",
    href: "/tools/plate-solve" as Href,
  },
  {
    title: "Exposure plan",
    subtitle: "Calculate optimal sub length",
    icon: "◷",
    href: "/tools/exposure" as Href,
  },
  {
    title: "PixInsight",
    subtitle: "Build a processing workflow",
    icon: "✦",
    href: "/tools/pixinsight" as Href,
  },
];
export default function CalculateScreen() {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [result, setResult] = useState<{
    horizontal: number;
    vertical: number;
    scale: number;
  } | null>(null);
  const set = (field: Field, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };
  const calculate = () => {
    const nextErrors: Partial<Record<Field, string>> = {};
    (Object.keys(values) as Field[]).forEach((key) => {
      const value = Number(values[key]);
      if (!values[key].trim()) nextErrors[key] = "Required";
      else if (!Number.isFinite(value) || value <= 0)
        nextErrors[key] = "Enter a number greater than zero";
      else if (
        (key === "resolutionWidth" || key === "resolutionHeight") &&
        !Number.isInteger(value)
      )
        nextErrors[key] = "Use a whole pixel count";
    });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      setResult(null);
      return;
    }
    const focal = Number(values.focalLength);
    setResult({
      horizontal: fieldOfView(Number(values.sensorWidth), focal),
      vertical: fieldOfView(Number(values.sensorHeight), focal),
      scale: pixelScale(Number(values.pixelSize), focal),
    });
  };
  const reset = () => {
    setValues(initial);
    setErrors({});
    setResult(null);
  };
  return (
    <Screen>
      <Header eyebrow="Optical planning" title="Calculate" />
      <SectionHeader
        title="Planning toolkit"
        subtitle="Advanced capture and processing assistants"
      />
      {toolRoutes.map((tool) => (
        <Pressable key={tool.title} onPress={() => router.push(tool.href)}>
          <Card style={styles.tool}>
            <Text style={styles.toolIcon}>{tool.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={uiStyles.h3}>{tool.title}</Text>
              <Text style={uiStyles.muted}>{tool.subtitle}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Card>
        </Pressable>
      ))}
      <SectionHeader
        title="Field of view & pixel scale"
        subtitle="Enter your telescope and camera specifications"
      />
      <Card>
        <Input
          label="Telescope focal length (mm)"
          keyboardType="decimal-pad"
          value={values.focalLength}
          onChangeText={(v) => set("focalLength", v)}
          error={errors.focalLength}
          placeholder="e.g. 480"
        />
        <View style={styles.two}>
          <View style={styles.half}>
            <Input
              label="Sensor width (mm)"
              keyboardType="decimal-pad"
              value={values.sensorWidth}
              onChangeText={(v) => set("sensorWidth", v)}
              error={errors.sensorWidth}
              placeholder="23.5"
            />
          </View>
          <View style={styles.half}>
            <Input
              label="Sensor height (mm)"
              keyboardType="decimal-pad"
              value={values.sensorHeight}
              onChangeText={(v) => set("sensorHeight", v)}
              error={errors.sensorHeight}
              placeholder="15.7"
            />
          </View>
        </View>
        <Input
          label="Pixel size (microns)"
          keyboardType="decimal-pad"
          value={values.pixelSize}
          onChangeText={(v) => set("pixelSize", v)}
          error={errors.pixelSize}
          placeholder="3.76"
        />
        <View style={styles.two}>
          <View style={styles.half}>
            <Input
              label="Resolution width (px)"
              keyboardType="number-pad"
              value={values.resolutionWidth}
              onChangeText={(v) => set("resolutionWidth", v)}
              error={errors.resolutionWidth}
              placeholder="6248"
            />
          </View>
          <View style={styles.half}>
            <Input
              label="Resolution height (px)"
              keyboardType="number-pad"
              value={values.resolutionHeight}
              onChangeText={(v) => set("resolutionHeight", v)}
              error={errors.resolutionHeight}
              placeholder="4176"
            />
          </View>
        </View>
        <Button title="Calculate framing" onPress={calculate} />
        <Button title="Reset" variant="secondary" onPress={reset} />
      </Card>
      {result ? (
        <>
          <SectionHeader title="Your imaging frame" />
          <View style={styles.results}>
            <Result
              label="HORIZONTAL FOV"
              value={`${result.horizontal.toFixed(2)}°`}
              text="The sky width captured across the sensor."
            />
            <Result
              label="VERTICAL FOV"
              value={`${result.vertical.toFixed(2)}°`}
              text="The sky height captured across the sensor."
            />
            <Result
              label="PIXEL SCALE"
              value={`${result.scale.toFixed(2)}″/px`}
              text="Angular sky detail recorded by each pixel."
            />
          </View>
        </>
      ) : null}
    </Screen>
  );
}
function Result({
  label,
  value,
  text,
}: {
  label: string;
  value: string;
  text: string;
}) {
  return (
    <Card style={styles.result}>
      <Text style={styles.resultLabel}>{label}</Text>
      <Text style={styles.resultValue}>{value}</Text>
      <Text style={uiStyles.muted}>{text}</Text>
    </Card>
  );
}
const styles = StyleSheet.create({
  tool: { flexDirection: "row", alignItems: "center" },
  toolIcon: { width: 38, color: colors.gold, fontSize: 24 },
  chevron: { color: colors.muted, fontSize: 28 },
  two: { flexDirection: "row", gap: spacing.sm },
  half: { flex: 1 },
  results: { gap: spacing.sm },
  result: {
    borderLeftColor: colors.gold,
    borderLeftWidth: 3,
    borderRadius: radius.lg,
  },
  resultLabel: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  resultValue: { color: colors.gold, fontSize: 28, fontWeight: "700" },
});
