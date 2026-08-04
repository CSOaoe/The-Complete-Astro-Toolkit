import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as WebBrowser from "expo-web-browser";
import {
  Alert,
  Animated,
  Easing,
  Image,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";
import { Button, Card, Screen, SectionHeader, uiStyles } from "@/components/ui";
import { createThemedStyles, radius, spacing } from "@/theme";

type Layer = ImagePicker.ImagePickerAsset | null;
type FramePreset = {
  label: string;
  detail: string;
  width: number;
  height: number;
};

const framePresets: FramePreset[] = [
  { label: "16:9", detail: "1920 × 1080", width: 1920, height: 1080 },
  { label: "4:5", detail: "1440 × 1800", width: 1440, height: 1800 },
  { label: "9:16", detail: "1080 × 1920", width: 1080, height: 1920 },
  { label: "1:1", detail: "1080 × 1080", width: 1080, height: 1080 },
];

export default function AstroFlightScreen() {
  const router = useRouter();
  const [progress] = useState(() => new Animated.Value(0));
  const [stars, setStars] = useState<Layer>(null);
  const [nebula, setNebula] = useState<Layer>(null);
  const [duration, setDuration] = useState(20);
  const [speed, setSpeed] = useState(2.2);
  const [rotation, setRotation] = useState(0);
  const [cameraMovement, setCameraMovement] = useState(0);
  const [frame, setFrame] = useState(framePresets[0]);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    progress.stopAnimation();
    progress.setValue(0);
    if (!playing) return;

    const animation = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: duration * 1000,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }),
    );
    animation.start();
    return () => animation.stop();
  }, [duration, playing, progress]);

  const pickLayer = async (kind: "stars" | "nebula") => {
    if (Platform.OS !== "web") {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Photo access needed",
          "Choose photo access so Astro Flight can load your image layer.",
        );
        return;
      }
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      quality: 1,
      selectionLimit: 1,
    });
    if (result.canceled) return;
    if (kind === "stars") setStars(result.assets[0]);
    else setNebula(result.assets[0]);
    progress.setValue(0);
    setPlaying(true);
  };

  const restart = () => {
    progress.setValue(0);
    setPlaying(true);
  };

  const frameRatio = frame.width / frame.height;
  const previewHeight = frameRatio < 0.8 ? 390 : frameRatio < 1.1 ? 310 : 220;
  const previewWidth = frameRatio < 1 ? previewHeight * frameRatio : "100%";
  const backgroundSource = nebula?.uri
    ? { uri: nebula.uri }
    : stars?.uri
      ? { uri: stars.uri }
      : require("../../assets/images/ftyad-poster.png");
  const starSource = stars?.uri ? { uri: stars.uri } : null;

  const backgroundScale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [1.02, 1.04 + speed * 0.025],
  });
  const starScale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.16 + speed * 0.12],
  });
  const rotate = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", `${rotation}deg`],
  });
  const pan = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, cameraMovement * 2.4],
  });

  return (
    <Screen>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back to Calculate"
        onPress={() => router.back()}
      >
        <Text style={styles.back}>‹ Calculate</Text>
      </Pressable>

      <View style={styles.hero}>
        <Image
          source={require("../../assets/images/ftyad-poster.png")}
          resizeMode="cover"
          style={styles.heroImage}
        />
        <View style={styles.heroShade} />
        <View style={styles.heroCopy}>
          <Text style={styles.eyebrow}>FLIGHT LAB · FTYAD</Text>
          <Text style={styles.heroTitle}>Fly through your AstroData</Text>
          <Text style={styles.heroText}>
            Turn your stars and starless nebula layers into a cinematic
            deep-space run.
          </Text>
        </View>
      </View>

      <SectionHeader
        title="Mission inputs"
        subtitle="Load a stars image and an optional starless backplate"
      />
      <View style={styles.layerGrid}>
        <LayerCard
          title="Star signal"
          label="Stars layer"
          layer={stars}
          onPick={() => void pickLayer("stars")}
          onClear={() => setStars(null)}
        />
        <LayerCard
          title="Nebula plate"
          label="Starless layer"
          layer={nebula}
          onPick={() => void pickLayer("nebula")}
          onClear={() => setNebula(null)}
        />
      </View>

      <SectionHeader
        title="Live flight deck"
        subtitle="A native preview that responds instantly to every control"
      />
      <Card style={styles.flightDeck}>
        <View style={styles.previewShell}>
          <View
            style={[
              styles.preview,
              { height: previewHeight, width: previewWidth },
            ]}
          >
            <Animated.Image
              source={backgroundSource}
              resizeMode="cover"
              style={[
                styles.previewLayer,
                {
                  opacity: nebula || !stars ? 1 : 0.38,
                  transform: [
                    { scale: backgroundScale },
                    { rotate },
                    { translateX: pan },
                  ],
                },
              ]}
            />
            {starSource ? (
              <Animated.Image
                source={starSource}
                resizeMode="cover"
                style={[
                  styles.previewLayer,
                  styles.starLayer,
                  {
                    transform: [{ scale: starScale }, { translateX: pan }],
                  },
                ]}
              />
            ) : null}
            <View style={styles.vignette} />
            <View style={styles.hudTop}>
              <Text style={styles.hudText}>ASTRO FLIGHT // LIVE</Text>
              <View style={styles.liveDot} />
            </View>
            {!stars ? (
              <View style={styles.emptyPreview}>
                <Text style={styles.emptyIcon}>✦</Text>
                <Text style={styles.emptyTitle}>Load your stars layer</Text>
                <Text style={styles.emptyText}>
                  The mission poster is standing in until your data arrives.
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.stats}>
          <Stat label="FLIGHT TIME" value={`${duration}s`} />
          <Stat label="FRAME LOCK" value={frame.label} />
          <Stat label="WARP" value={`${speed.toFixed(1)}×`} />
        </View>

        <Control
          label="Flight duration"
          value={`${duration}s`}
          onDecrease={() => setDuration((value) => Math.max(5, value - 5))}
          onIncrease={() => setDuration((value) => Math.min(30, value + 5))}
        />
        <Control
          label="Warp speed"
          value={`${speed.toFixed(1)}×`}
          onDecrease={() =>
            setSpeed((value) => Math.max(0.5, Number((value - 0.5).toFixed(1))))
          }
          onIncrease={() =>
            setSpeed((value) => Math.min(6, Number((value + 0.5).toFixed(1))))
          }
        />
        <Control
          label="Nebula rotation"
          value={`${rotation}°`}
          onDecrease={() => setRotation((value) => Math.max(-180, value - 15))}
          onIncrease={() => setRotation((value) => Math.min(180, value + 15))}
        />
        <Control
          label="Camera drift"
          value={`${cameraMovement > 0 ? "+" : ""}${cameraMovement}`}
          onDecrease={() =>
            setCameraMovement((value) => Math.max(-45, value - 5))
          }
          onIncrease={() =>
            setCameraMovement((value) => Math.min(45, value + 5))
          }
        />

        <Text style={styles.controlLabel}>Frame format</Text>
        <View style={styles.frameChips}>
          {framePresets.map((preset) => {
            const active = preset.label === frame.label;
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                key={preset.label}
                onPress={() => setFrame(preset)}
                style={[styles.frameChip, active && styles.frameChipActive]}
              >
                <Text
                  style={[styles.frameLabel, active && styles.frameLabelActive]}
                >
                  {preset.label}
                </Text>
                <Text style={styles.frameDetail}>{preset.detail}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.actions}>
          <View style={styles.actionHalf}>
            <Button
              title={playing ? "Pause preview" : "Play preview"}
              onPress={() => setPlaying((value) => !value)}
            />
          </View>
          <View style={styles.actionHalf}>
            <Button title="Restart" variant="secondary" onPress={restart} />
          </View>
        </View>
      </Card>

      <Card style={styles.renderCard}>
        <Text style={styles.renderEyebrow}>WEBM RENDER STUDIO</Text>
        <Text style={uiStyles.h3}>Export the finished flight</Text>
        <Text style={uiStyles.muted}>
          The native lab is designed for fast composition on your phone. Open
          the full renderer when you are ready to process stars and record a
          downloadable film.
        </Text>
        <Button
          title="Open film renderer"
          onPress={() =>
            void WebBrowser.openBrowserAsync(
              "https://cso-v1.vercel.app/ftyad.html",
            )
          }
        />
      </Card>
    </Screen>
  );
}

function LayerCard({
  title,
  label,
  layer,
  onPick,
  onClear,
}: {
  title: string;
  label: string;
  layer: Layer;
  onPick: () => void;
  onClear: () => void;
}) {
  return (
    <Card style={styles.layerCard}>
      <Text style={styles.layerLabel}>{label}</Text>
      <Text style={uiStyles.h3}>{title}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Choose ${label}`}
        onPress={onPick}
        style={styles.dropZone}
      >
        {layer ? (
          <Image
            source={{ uri: layer.uri }}
            resizeMode="cover"
            style={styles.thumb}
          />
        ) : (
          <Text style={styles.uploadIcon}>＋</Text>
        )}
        <View style={styles.dropCopy}>
          <Text style={styles.dropTitle}>
            {layer ? "Replace image" : "Choose image"}
          </Text>
          <Text numberOfLines={1} style={styles.fileName}>
            {layer?.fileName ?? "JPG, PNG, TIFF preview or processed export"}
          </Text>
        </View>
      </Pressable>
      {layer ? (
        <Pressable accessibilityRole="button" onPress={onClear}>
          <Text style={styles.remove}>Remove layer</Text>
        </Pressable>
      ) : null}
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function Control({
  label,
  value,
  onDecrease,
  onIncrease,
}: {
  label: string;
  value: string;
  onDecrease: () => void;
  onIncrease: () => void;
}) {
  return (
    <View style={styles.control}>
      <Text style={styles.controlLabel}>{label}</Text>
      <View style={styles.stepper}>
        <Pressable
          accessibilityRole="button"
          onPress={onDecrease}
          style={styles.stepButton}
        >
          <Text style={styles.stepText}>−</Text>
        </Pressable>
        <Text style={styles.controlValue}>{value}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={onIncrease}
          style={styles.stepButton}
        >
          <Text style={styles.stepText}>＋</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = createThemedStyles((colors) => ({
  back: { color: colors.gold, fontSize: 15, fontWeight: "700" },
  hero: {
    height: 340,
    overflow: "hidden",
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "#23556A",
    backgroundColor: "#01040A",
  },
  heroImage: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
  },
  heroShade: {
    position: "absolute",
    inset: 0,
    backgroundColor: "rgba(2, 8, 19, 0.52)",
  },
  heroCopy: {
    flex: 1,
    justifyContent: "flex-end",
    gap: spacing.sm,
    padding: spacing.lg,
    backgroundColor: "rgba(2, 8, 19, 0.28)",
  },
  eyebrow: {
    color: "#65E7FF",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 2,
  },
  heroTitle: {
    maxWidth: 330,
    color: "#FFFFFF",
    fontSize: 38,
    lineHeight: 39,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  heroText: { color: "#D6EEF6", fontSize: 15, lineHeight: 21 },
  layerGrid: { gap: spacing.sm },
  layerCard: { borderColor: "rgba(98, 231, 255, 0.25)" },
  layerLabel: {
    color: "#5DFFB0",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  dropZone: {
    minHeight: 92,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "rgba(98, 231, 255, 0.42)",
    borderRadius: radius.md,
    backgroundColor: "rgba(1, 10, 22, 0.74)",
  },
  uploadIcon: {
    width: 66,
    color: "#62E7FF",
    fontSize: 36,
    textAlign: "center",
  },
  thumb: { width: 66, height: 66, borderRadius: radius.sm },
  dropCopy: { flex: 1, gap: 3 },
  dropTitle: { color: colors.text, fontSize: 15, fontWeight: "800" },
  fileName: { color: colors.muted, fontSize: 12 },
  remove: { color: colors.danger, fontSize: 13, fontWeight: "700" },
  flightDeck: {
    gap: spacing.md,
    borderColor: "rgba(98, 231, 255, 0.38)",
    backgroundColor: "#07101E",
  },
  previewShell: { alignItems: "center" },
  preview: {
    maxWidth: "100%",
    overflow: "hidden",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(98, 231, 255, 0.48)",
    backgroundColor: "#000",
  },
  previewLayer: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
  },
  starLayer: { opacity: 0.82 },
  vignette: {
    position: "absolute",
    inset: 0,
    borderWidth: 18,
    borderColor: "rgba(0, 0, 0, 0.34)",
  },
  hudTop: {
    position: "absolute",
    top: 12,
    left: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  hudText: {
    color: "#8AF0FF",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.4,
  },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#5DFFB0" },
  emptyPreview: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 24,
    alignItems: "center",
    gap: 5,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: "rgba(2, 9, 18, 0.82)",
  },
  emptyIcon: { color: "#62E7FF", fontSize: 24 },
  emptyTitle: { color: colors.text, fontSize: 15, fontWeight: "800" },
  emptyText: { color: colors.muted, fontSize: 12, textAlign: "center" },
  stats: { flexDirection: "row", gap: spacing.xs },
  stat: {
    flex: 1,
    minWidth: 0,
    gap: 4,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: "rgba(98, 231, 255, 0.22)",
    borderRadius: radius.sm,
    backgroundColor: "rgba(98, 231, 255, 0.05)",
  },
  statLabel: {
    color: "#62E7FF",
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  statValue: { color: colors.text, fontSize: 16, fontWeight: "800" },
  control: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: "rgba(0, 0, 0, 0.22)",
  },
  controlLabel: {
    flex: 1,
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
  },
  stepper: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  stepButton: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: "rgba(98, 231, 255, 0.3)",
    backgroundColor: "#101E31",
  },
  stepText: { color: "#62E7FF", fontSize: 20, fontWeight: "700" },
  controlValue: {
    minWidth: 52,
    color: "#A98CFF",
    fontSize: 14,
    fontWeight: "900",
    textAlign: "center",
  },
  frameChips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  frameChip: {
    minWidth: 104,
    flexGrow: 1,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceElevated,
  },
  frameChipActive: {
    borderColor: "#62E7FF",
    backgroundColor: "rgba(98, 231, 255, 0.12)",
  },
  frameLabel: { color: colors.text, fontSize: 15, fontWeight: "900" },
  frameLabelActive: { color: "#62E7FF" },
  frameDetail: { color: colors.muted, fontSize: 10, marginTop: 2 },
  actions: { flexDirection: "row", gap: spacing.sm },
  actionHalf: { flex: 1 },
  renderCard: { borderLeftWidth: 3, borderLeftColor: "#5DFFB0" },
  renderEyebrow: {
    color: "#5DFFB0",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.4,
  },
}));
