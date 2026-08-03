import { useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  Card,
  Input,
  Screen,
  SectionHeader,
  uiStyles,
} from "@/components/ui";
import { getCatalogueObject, searchCatalogue } from "@/data/catalogue";
import { fieldOfView } from "@/utils/calculations";
import { surveyImageUrl } from "@/utils/surveyImages";
import { colors, radius, spacing } from "@/theme";

export default function FramingScreen() {
  const router = useRouter();
  const [targetId, setTargetId] = useState("m31");
  const [query, setQuery] = useState("");
  const [focal, setFocal] = useState("480");
  const [width, setWidth] = useState("23.5");
  const [height, setHeight] = useState("15.7");
  const [rotation, setRotation] = useState("0");
  const target = useMemo(() => getCatalogueObject(targetId), [targetId]);
  const matches = useMemo(
    () => (query.trim() ? searchCatalogue(query, "All", 8) : []),
    [query],
  );
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);
  const result = useMemo(() => {
    try {
      return {
        h: fieldOfView(Number(width), Number(focal)),
        v: fieldOfView(Number(height), Number(focal)),
      };
    } catch {
      return null;
    }
  }, [focal, height, width]);
  const frameWidth = 300;
  const frameHeight = result
    ? Math.max(120, Math.min(300, (frameWidth * result.v) / result.h))
    : 200;
  const rotationDegrees = Number(rotation) || 0;
  const imageUrl =
    target && result
      ? surveyImageUrl({
          raHours: target.raHours,
          decDegrees: target.decDegrees,
          fovDegrees: result.h,
          width: 900,
          height: Math.round((900 * result.v) / result.h),
          rotationDegrees,
        })
      : null;
  const imageFailed = imageUrl !== null && failedImageUrl === imageUrl;
  return (
    <Screen>
      <Pressable onPress={() => router.back()}>
        <Text style={styles.back}>‹ Calculate</Text>
      </Pressable>
      <SectionHeader
        title="Visual framing planner"
        subtitle="Preview how a target fits your camera sensor"
      />
      <Input
        label="Find any catalogue target or comet"
        value={query}
        onChangeText={setQuery}
        placeholder="Try M31, NGC 7000 or Halley"
        autoCapitalize="none"
      />
      {matches.length ? (
        <View style={styles.matches}>
          {matches.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => {
                setTargetId(item.id);
                setQuery("");
              }}
              style={styles.match}
            >
              <Text style={styles.matchTitle}>{item.name}</Text>
              <Text style={styles.matchMeta}>
                {item.catalogue} · {item.objectKind === "comet" ? "Comet" : item.type}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      <Card style={styles.preview}>
        <Text style={styles.previewLabel}>{target?.name ?? "Target unavailable"}</Text>
        <View
          style={[
            styles.frame,
            {
              width: frameWidth,
              height: frameHeight,
            },
          ]}
        >
          {imageUrl && !imageFailed ? (
            <Image
              source={imageUrl}
              style={styles.frameImage}
              contentFit="cover"
              transition={250}
              cachePolicy="memory-disk"
              accessibilityLabel={`DSS2 framing preview for ${target?.name ?? "target"}`}
              onError={() => setFailedImageUrl(imageUrl)}
            />
          ) : (
            <View style={styles.imageFallback}>
              <Text style={styles.imageFallbackIcon}>✦</Text>
              <Text style={styles.imageFallbackText}>
                {imageFailed ? "Survey image unavailable" : "Enter valid dimensions"}
              </Text>
            </View>
          )}
          <View style={styles.crossH} />
          <View style={styles.crossV} />
          <View style={styles.reticle} />
        </View>
        {result ? (
          <Text style={uiStyles.muted}>
            {result.h.toFixed(2)}° × {result.v.toFixed(2)}° field · {rotationDegrees.toFixed(0)}° rotation
          </Text>
        ) : (
          <Text style={styles.error}>
            Enter valid positive optical dimensions.
          </Text>
        )}
      </Card>
      <Text style={styles.surveyCredit}>
        Real archival sky imagery: CDS Aladin DSS2. Comets use their calculated current position; the archival background may not show the moving comet.
      </Text>
      <Card>
        <Input
          label="Telescope focal length (mm)"
          value={focal}
          onChangeText={setFocal}
          keyboardType="decimal-pad"
        />
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Input
              label="Sensor width (mm)"
              value={width}
              onChangeText={setWidth}
              keyboardType="decimal-pad"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Input
              label="Sensor height (mm)"
              value={height}
              onChangeText={setHeight}
              keyboardType="decimal-pad"
            />
          </View>
        </View>
        <Input
          label="Camera rotation (degrees)"
          value={rotation}
          onChangeText={setRotation}
          keyboardType="decimal-pad"
        />
      </Card>
      <Card>
        <Text style={uiStyles.h3}>Framing guidance</Text>
        <Text style={uiStyles.muted}>
          The survey is scaled to the calculated sensor field, so objects appear at their real relative size. Use the crosshair to judge centring and adjust rotation for composition.
        </Text>
      </Card>
    </Screen>
  );
}
const styles = StyleSheet.create({
  back: { color: colors.blue, fontWeight: "700" },
  matches: { gap: spacing.xs },
  match: {
    padding: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  matchTitle: { color: colors.text, fontWeight: "700" },
  matchMeta: { color: colors.muted, fontSize: 12, marginTop: 2 },
  preview: { alignItems: "center", overflow: "hidden" },
  previewLabel: { color: colors.gold, fontWeight: "700" },
  frame: {
    backgroundColor: "#07101F",
    borderColor: colors.text,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  frameImage: { position: "absolute", inset: 0 },
  imageFallback: { flex: 1, alignItems: "center", justifyContent: "center" },
  imageFallbackIcon: { color: colors.gold, fontSize: 34 },
  imageFallbackText: { color: colors.muted, fontSize: 12, marginTop: 6 },
  crossH: {
    position: "absolute",
    width: "100%",
    height: 1,
    backgroundColor: "#91A0B833",
  },
  crossV: {
    position: "absolute",
    width: 1,
    height: "100%",
    backgroundColor: "#91A0B833",
  },
  reticle: {
    position: "absolute",
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "#F7F8FCAA",
  },
  row: { flexDirection: "row", gap: spacing.sm },
  error: { color: colors.danger },
  surveyCredit: { color: colors.muted, fontSize: 11, lineHeight: 16, textAlign: "center" },
});
