import { useState } from "react";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import {
  Linking,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import {
  Button,
  Card,
  Input,
  Screen,
  SectionHeader,
  uiStyles,
} from "@/components/ui";
import { PlateSolveResult, solveImage } from "@/services/astrometryNet";
import { createThemedStyles, spacing } from "@/theme";

export default function PlateSolveScreen() {
  const router = useRouter();
  const [apiKey, setApiKey] = useState("");
  const [asset, setAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<PlateSolveResult | null>(null);
  const [working, setWorking] = useState(false);
  const choose = async () => {
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 1,
    });
    if (!picked.canceled) {
      setAsset(picked.assets[0]);
      setResult(null);
      setError("");
    }
  };
  const solve = async () => {
    if (!apiKey.trim() || !asset) {
      setError("Add your Astrometry.net API key and choose an image first.");
      return;
    }
    setWorking(true);
    setError("");
    setResult(null);
    try {
      let file: Blob;
      if (Platform.OS === "web" && asset.file) file = asset.file;
      else file = await (await fetch(asset.uri)).blob();
      setResult(
        await solveImage(
          apiKey,
          file,
          asset.fileName ?? "astro-frame.jpg",
          setStatus,
        ),
      );
      setStatus("Plate solve complete.");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "The plate solve failed.",
      );
      setStatus("");
    } finally {
      setWorking(false);
    }
  };
  return (
    <Screen>
      <Pressable onPress={() => router.back()}>
        <Text style={styles.back}>‹ Calculate</Text>
      </Pressable>
      <SectionHeader
        title="Plate solving"
        subtitle="Upload an astro image to identify its exact sky position"
      />
      <Card style={styles.notice}>
        <Text style={styles.noticeTitle}>Before I upload</Text>
        <Text style={uiStyles.muted}>
          Your selected image is sent privately to Nova Astrometry.net for
          solving. It is marked not publicly visible, not modifiable and not for
          commercial reuse. Your API key stays only in this screen’s memory.
        </Text>
      </Card>
      <Input
        label="Astrometry.net API key"
        value={apiKey}
        onChangeText={setApiKey}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="Paste your free API key"
      />
      <Button
        title="Get a free Astrometry.net API key"
        variant="secondary"
        onPress={() =>
          void Linking.openURL("https://nova.astrometry.net/api_help")
        }
      />
      <Button
        title={asset ? "Choose a different image" : "Choose astro image"}
        variant="secondary"
        onPress={() => void choose()}
      />
      {asset ? (
        <Card style={styles.preview}>
          <Image source={asset.uri} style={styles.image} contentFit="contain" />
          <Text style={uiStyles.muted}>
            {asset.fileName ?? "Selected image"} · {asset.width} ×{" "}
            {asset.height}px
          </Text>
        </Card>
      ) : null}
      <Button
        title={working ? "Solving…" : "Solve this image"}
        disabled={working || !asset || !apiKey.trim()}
        onPress={() => void solve()}
      />
      {status ? (
        <Card>
          <Text style={styles.status}>{status}</Text>
        </Card>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {result ? (
        <>
          <SectionHeader
            title="Solved frame"
            subtitle={`Astrometry.net job ${result.jobId}`}
          />
          <Card>
            <Result
              label="CENTRE"
              value={`RA ${(result.ra / 15).toFixed(4)}h · Dec ${result.dec.toFixed(4)}°`}
            />
            <Result
              label="PIXEL SCALE"
              value={`${result.pixelScale.toFixed(3)} arcsec/pixel`}
            />
            <Result
              label="ROTATION"
              value={`${result.orientation.toFixed(2)}°`}
            />
            <Result
              label="FIELD RADIUS"
              value={`${result.radius.toFixed(3)}°`}
            />
            {result.objects.length ? (
              <>
                <Text style={styles.label}>OBJECTS IN FIELD</Text>
                <Text style={uiStyles.body}>
                  {result.objects.slice(0, 20).join(" · ")}
                </Text>
              </>
            ) : null}
          </Card>
          <Image
            source={result.annotatedImageUrl}
            style={styles.annotated}
            contentFit="contain"
          />
          <Button
            title="Open annotated result"
            variant="secondary"
            onPress={() => void Linking.openURL(result.annotatedImageUrl)}
          />
        </>
      ) : null}
      <Text style={styles.credit}>
        Plate solving is provided by Astrometry.net. Upload only images you are
        permitted to share with that service.
      </Text>
    </Screen>
  );
}
function Result({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.result}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}
const styles = createThemedStyles((colors) => ({
  back: { color: colors.blue, fontWeight: "700" },
  notice: { borderColor: colors.gold, backgroundColor: "#1A1720" },
  noticeTitle: { color: colors.gold, fontWeight: "800" },
  preview: { alignItems: "center" },
  image: { width: "100%", height: 260, backgroundColor: colors.input },
  annotated: { width: "100%", height: 360, backgroundColor: colors.input },
  status: { color: colors.gold, fontWeight: "700", textAlign: "center" },
  error: { color: colors.danger, lineHeight: 20 },
  result: {
    gap: 3,
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  label: {
    color: colors.gold,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },
  value: { color: colors.text, fontSize: 16, fontWeight: "600" },
  credit: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 16,
    textAlign: "center",
  },
}));
