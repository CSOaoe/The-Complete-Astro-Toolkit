import { useState } from "react";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { Text, View } from "react-native";
import { Button, Card, ErrorBanner, Header, Screen, SectionHeader, uiStyles } from "@/components/ui";
import { analyseBase64Jpeg, ImageQualityResult } from "@/utils/imageQuality";
import { createThemedStyles, radius, spacing } from "@/theme";

export default function ImageQualityScreen() {
  const [uri, setUri] = useState<string | null>(null);
  const [result, setResult] = useState<ImageQualityResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const chooseImage = async () => {
    setError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError("Photo access is needed so you can choose an image to analyse.");
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 1 });
    if (picked.canceled) return;
    const selectedUri = picked.assets[0]?.uri;
    if (!selectedUri) return;
    setUri(selectedUri);
    setResult(null);
    setBusy(true);
    try {
      const context = ImageManipulator.manipulate(selectedUri);
      context.resize({ width: 640, height: null });
      const rendered = await context.renderAsync();
      const saved = await rendered.saveAsync({ base64: true, compress: 0.9, format: SaveFormat.JPEG });
      if (!saved.base64) throw new Error("The image preview could not be read.");
      setResult(analyseBase64Jpeg(saved.base64));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "This image could not be analysed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Header eyebrow="Capture review" title="Image Quality" />
      <Text style={uiStyles.muted}>
        Pick a recent subframe for a quick focus, star-shape, clipping and background check. The image stays on this device.
      </Text>
      {error ? <ErrorBanner message={error} /> : null}
      <Button title={busy ? "Analysing preview…" : "Choose an astro image"} onPress={() => void chooseImage()} disabled={busy} />
      {uri ? <Image source={uri} contentFit="cover" style={styles.preview} transition={180} /> : null}
      {result ? (
        <>
          <Card style={styles.summary}>
            <View style={styles.scoreCircle}><Text style={styles.score}>{result.score}</Text><Text style={styles.outOf}>/100</Text></View>
            <View style={styles.summaryCopy}>
              <Text style={[styles.verdict, result.verdict === "REJECT" && styles.reject, result.verdict === "CHECK" && styles.check]}>{result.verdict}</Text>
              <Text style={uiStyles.muted}>Fast screening result for this preview</Text>
            </View>
          </Card>
          <SectionHeader title="Frame measurements" subtitle="Relative estimates from a 640 px preview" />
          <View style={styles.metrics}>
            <Metric label="FWHM" value={result.fwhmPixels ? `${result.fwhmPixels.toFixed(2)} px` : "—"} />
            <Metric label="ECCENTRICITY" value={result.eccentricity ? result.eccentricity.toFixed(2) : "—"} />
            <Metric label="STARS" value={`${result.starCount}`} />
            <Metric label="CLIPPED" value={`${result.clippedPercent.toFixed(2)}%`} />
            <Metric label="BACKGROUND" value={`${Math.round(result.backgroundLevel)}/255`} />
            <Metric label="CONTRAST" value={`${Math.round(result.hazeScore)}/100`} />
          </View>
          <Card>
            <Text style={uiStyles.h3}>What I found</Text>
            {result.notes.map((note) => <View key={note} style={styles.note}><Text style={styles.bullet}>•</Text><Text style={styles.noteText}>{note}</Text></View>)}
          </Card>
        </>
      ) : null}
      <Text style={styles.disclaimer}>
        This is a quick local triage tool, not a calibrated scientific measurement. Compare frames from the same camera and binning, and use full-resolution tools such as PixInsight SubframeSelector for final rejection decisions.
      </Text>
    </Screen>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <Card style={styles.metric}><Text style={styles.metricLabel}>{label}</Text><Text style={styles.metricValue}>{value}</Text></Card>;
}

const styles = createThemedStyles((colors) => ({
  preview: { width: "100%", aspectRatio: 1.5, borderRadius: radius.lg, backgroundColor: colors.input },
  summary: { flexDirection: "row", alignItems: "center", borderColor: colors.gold },
  scoreCircle: { width: 78, height: 78, borderRadius: 39, backgroundColor: "#282318", alignItems: "center", justifyContent: "center", flexDirection: "row" },
  score: { color: colors.gold, fontSize: 29, fontWeight: "800" },
  outOf: { color: colors.muted, fontSize: 11, alignSelf: "flex-end", marginBottom: 21 },
  summaryCopy: { flex: 1 }, verdict: { color: colors.success, fontWeight: "900", letterSpacing: 1.5, fontSize: 20 },
  check: { color: colors.warning }, reject: { color: colors.danger },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  metric: { width: "48%", flexGrow: 1 }, metricLabel: { color: colors.muted, fontSize: 9, fontWeight: "800", letterSpacing: 0.8 },
  metricValue: { color: colors.text, fontSize: 18, fontWeight: "700" },
  note: { flexDirection: "row", gap: spacing.sm }, bullet: { color: colors.gold, fontSize: 18 }, noteText: { color: colors.text, flex: 1, lineHeight: 21 },
  disclaimer: { color: colors.muted, fontSize: 11, lineHeight: 17, textAlign: "center" },
}));
