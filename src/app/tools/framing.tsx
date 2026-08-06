import { useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { Animated, PanResponder, Pressable, Text, useWindowDimensions, View } from "react-native";
import { Card, Input, Screen, SectionHeader, uiStyles } from "@/components/ui";
import { useAppData } from "@/context/AppDataContext";
import { formatDec, formatRa, getCatalogueObject, searchCatalogue } from "@/data/catalogue";
import { fieldOfView, pixelScale } from "@/utils/calculations";
import { clampPanOffset, coordinateForPan, PanOffset, SkyCoordinate } from "@/utils/framingPan";
import { surveyImageUrl } from "@/utils/surveyImages";
import { createThemedStyles, radius, spacing } from "@/theme";

const SURVEY_OVERSCAN = 2.2;

export default function FramingScreen() {
  const router = useRouter();
  const { width: viewportWidth } = useWindowDimensions();
  const { equipment } = useAppData();
  const [targetId, setTargetId] = useState("m31");
  const [query, setQuery] = useState("");
  const [selectedRigId, setSelectedRigId] = useState("");
  const selectedRig = equipment.rigs.find((rig) => rig.id === selectedRigId) ?? equipment.rigs[0];
  const savedScope = equipment.telescopes.find((scope) => scope.id === selectedRig?.telescopeId) ?? equipment.telescopes[0];
  const savedCamera = equipment.cameras.find((camera) => camera.id === selectedRig?.cameraId) ?? equipment.cameras[0];
  const [focalOverride, setFocalOverride] = useState<string | null>(null);
  const [widthOverride, setWidthOverride] = useState<string | null>(null);
  const [heightOverride, setHeightOverride] = useState<string | null>(null);
  const [pixelOverride, setPixelOverride] = useState<string | null>(null);
  const [resolutionWidthOverride, setResolutionWidthOverride] = useState<string | null>(null);
  const [resolutionHeightOverride, setResolutionHeightOverride] = useState<string | null>(null);
  const focal = focalOverride ?? String(savedScope?.focalLength ?? 480);
  const width = widthOverride ?? String(savedCamera?.sensorWidth ?? 23.5);
  const height = heightOverride ?? String(savedCamera?.sensorHeight ?? 15.7);
  const pixel = pixelOverride ?? String(savedCamera?.pixelSize ?? 3.76);
  const resolutionWidth = resolutionWidthOverride ?? String(savedCamera?.resolutionWidth ?? 6248);
  const resolutionHeight = resolutionHeightOverride ?? String(savedCamera?.resolutionHeight ?? 4176);
  const [rotation, setRotation] = useState("0");
  const target = useMemo(() => getCatalogueObject(targetId), [targetId]);
  const [imageOrigin, setImageOrigin] = useState<SkyCoordinate>({ ra: target?.raHours ?? 0, dec: target?.decDegrees ?? 0 });
  const [liveCenter, setLiveCenter] = useState(imageOrigin);
  const [drag] = useState(() => new Animated.ValueXY());
  const [panOffset, setPanOffset] = useState<PanOffset>({ x: 0, y: 0 });
  const matches = useMemo(() => (query.trim() ? searchCatalogue(query, "All", 8) : []), [query]);
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);

  const result = useMemo(() => {
    try {
      return {
        h: fieldOfView(Number(width), Number(focal)),
        v: fieldOfView(Number(height), Number(focal)),
        scale: pixelScale(Number(pixel), Number(focal)),
      };
    } catch {
      return null;
    }
  }, [focal, height, pixel, width]);
  const frameWidth = Math.max(260, Math.min(620, viewportWidth - 70));
  const frameHeight = result ? Math.max(150, Math.min(460, (frameWidth * result.v) / result.h)) : 210;
  const rotationDegrees = Number(rotation) || 0;
  const coordinateAtOffset = (offset: PanOffset) => result
    ? coordinateForPan(imageOrigin, offset, result.h, result.v, frameWidth, frameHeight)
    : imageOrigin;
  const offsetForGesture = (dx: number, dy: number) => clampPanOffset({
    x: panOffset.x + dx,
    y: panOffset.y + dy,
  }, frameWidth, frameHeight, SURVEY_OVERSCAN);
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => Boolean(result),
    onMoveShouldSetPanResponder: (_, gesture) => Boolean(result && Math.abs(gesture.dx) + Math.abs(gesture.dy) > 3),
    onPanResponderMove: (_, gesture) => {
      const next = offsetForGesture(gesture.dx, gesture.dy);
      drag.setValue(next);
      setLiveCenter(coordinateAtOffset(next));
    },
    onPanResponderRelease: (_, gesture) => {
      const next = offsetForGesture(gesture.dx, gesture.dy);
      setPanOffset(next);
      drag.setValue(next);
      setLiveCenter(coordinateAtOffset(next));
    },
    onPanResponderTerminate: (_, gesture) => {
      const next = offsetForGesture(gesture.dx, gesture.dy);
      setPanOffset(next);
      drag.setValue(next);
      setLiveCenter(coordinateAtOffset(next));
    },
  });

  const selectTarget = (id: string, next: SkyCoordinate) => {
    setTargetId(id);
    setImageOrigin(next);
    setPanOffset({ x: 0, y: 0 });
    drag.setValue({ x: 0, y: 0 });
    setLiveCenter(next);
    setQuery("");
  };
  const imageUrl = target && result ? surveyImageUrl({
    raHours: imageOrigin.ra,
    decDegrees: imageOrigin.dec,
    fovDegrees: Math.max(result.h, result.v) * SURVEY_OVERSCAN,
    width: 1400,
    height: Math.max(700, Math.round((1400 * result.v) / result.h)),
    rotationDegrees,
  }) : null;
  const imageFailed = imageUrl !== null && failedImageUrl === imageUrl;

  return (
    <Screen>
      <Pressable onPress={() => router.back()}><Text style={styles.back}>‹ Tools</Text></Pressable>
      <SectionHeader title="Visual framing planner" subtitle="Saved-rig FOV, pixel scale and drag-to-compose sky preview" />
      <Input label="Find any catalogue target or comet" value={query} onChangeText={setQuery} placeholder="Try M31, NGC 7000 or Halley" autoCapitalize="none" />
      {matches.length ? <View style={styles.matches}>{matches.map((item) => (
        <Pressable key={item.id} onPress={() => selectTarget(item.id, { ra: item.raHours, dec: item.decDegrees })} style={styles.match}>
          <Text style={styles.matchTitle}>{item.name}</Text>
          <Text style={styles.matchMeta}>{item.catalogue} · {item.objectKind === "comet" ? "Comet" : item.type}</Text>
        </Pressable>
      ))}</View> : null}
      <View style={styles.coordinates}>
        <Card style={styles.coordinateCard}><Text style={styles.coordinateLabel}>RIGHT ASCENSION</Text><Text style={styles.coordinateValue}>{formatRa(liveCenter.ra)}</Text></Card>
        <Card style={styles.coordinateCard}><Text style={styles.coordinateLabel}>DECLINATION</Text><Text style={styles.coordinateValue}>{formatDec(liveCenter.dec)}</Text></Card>
      </View>
      <Card style={styles.preview}>
        <Text style={styles.previewLabel}>{target?.name ?? "Target unavailable"}</Text>
        <View style={[styles.frame, { width: frameWidth, height: frameHeight }]} {...panResponder.panHandlers}>
          {imageUrl && !imageFailed ? (
            <Animated.View style={[styles.movingImage, {
              width: frameWidth * SURVEY_OVERSCAN,
              height: frameHeight * SURVEY_OVERSCAN,
              left: -(frameWidth * (SURVEY_OVERSCAN - 1)) / 2,
              top: -(frameHeight * (SURVEY_OVERSCAN - 1)) / 2,
              transform: drag.getTranslateTransform(),
            }]}>
              <Image source={imageUrl} style={styles.frameImage} contentFit="cover" transition={180} cachePolicy="memory-disk" accessibilityLabel={`Interactive sky survey framing preview for ${target?.name ?? "target"}`} onError={() => setFailedImageUrl(imageUrl)} />
            </Animated.View>
          ) : <View style={styles.imageFallback}><Text style={styles.imageFallbackIcon}>✦</Text><Text style={styles.imageFallbackText}>{imageFailed ? "Survey image unavailable" : "Enter valid dimensions"}</Text></View>}
          <View pointerEvents="none" style={styles.crossH} /><View pointerEvents="none" style={styles.crossV} /><View pointerEvents="none" style={styles.reticle} />
          {target?.objectKind === "comet" ? <View pointerEvents="none" style={styles.cometMarker}><Text style={styles.cometMarkerText}>☄</Text></View> : null}
        </View>
        <Text style={styles.dragHint}>Drag the sky smoothly to recentre; RA and Dec update as you move.</Text>
        {result ? <Text style={uiStyles.muted}>{result.h.toFixed(2)}° × {result.v.toFixed(2)}° field · {rotationDegrees.toFixed(0)}° rotation</Text> : <Text style={styles.error}>Enter valid positive optical dimensions.</Text>}
      </Card>
      {equipment.rigs.length ? <Card><Text style={styles.sectionLabel}>SAVED IMAGING RIG</Text><View style={styles.rigs}>{equipment.rigs.map((rig) => <Pressable key={rig.id} onPress={() => { setSelectedRigId(rig.id); setFocalOverride(null); setWidthOverride(null); setHeightOverride(null); setPixelOverride(null); setResolutionWidthOverride(null); setResolutionHeightOverride(null); }} style={[styles.rig, rig.id === selectedRig?.id && styles.rigActive]}><Text style={[styles.rigText, rig.id === selectedRig?.id && styles.rigTextActive]}>{rig.name}</Text></Pressable>)}</View></Card> : null}
      <Card>
        <Input label="Telescope focal length (mm)" value={focal} onChangeText={setFocalOverride} keyboardType="decimal-pad" />
        <View style={styles.row}><View style={styles.half}><Input label="Sensor width (mm)" value={width} onChangeText={setWidthOverride} keyboardType="decimal-pad" /></View><View style={styles.half}><Input label="Sensor height (mm)" value={height} onChangeText={setHeightOverride} keyboardType="decimal-pad" /></View></View>
        <Input label="Pixel size (microns)" value={pixel} onChangeText={setPixelOverride} keyboardType="decimal-pad" />
        <View style={styles.row}><View style={styles.half}><Input label="Resolution width (px)" value={resolutionWidth} onChangeText={setResolutionWidthOverride} keyboardType="number-pad" /></View><View style={styles.half}><Input label="Resolution height (px)" value={resolutionHeight} onChangeText={setResolutionHeightOverride} keyboardType="number-pad" /></View></View>
        <Input label="Camera rotation (degrees)" value={rotation} onChangeText={setRotation} keyboardType="decimal-pad" />
      </Card>
      {result ? <View style={styles.results}><Card style={styles.result}><Text style={styles.coordinateLabel}>HORIZONTAL FOV</Text><Text style={styles.resultValue}>{result.h.toFixed(2)}°</Text></Card><Card style={styles.result}><Text style={styles.coordinateLabel}>VERTICAL FOV</Text><Text style={styles.resultValue}>{result.v.toFixed(2)}°</Text></Card><Card style={styles.result}><Text style={styles.coordinateLabel}>PIXEL SCALE</Text><Text style={styles.resultValue}>{result.scale.toFixed(2)}″/px</Text></Card></View> : null}
      <Text style={styles.surveyCredit}>Archival sky imagery: CDS Aladin DSS2. A moving comet may not appear in the historical background.</Text>
    </Screen>
  );
}

const styles = createThemedStyles((colors) => ({
  back: { color: colors.blue, fontWeight: "700" },
  matches: { gap: spacing.xs },
  match: { padding: 12, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  matchTitle: { color: colors.text, fontWeight: "700" },
  matchMeta: { color: colors.muted, fontSize: 12, marginTop: 2 },
  coordinates: { flexDirection: "row", gap: spacing.sm },
  coordinateCard: { flex: 1, minWidth: 0 },
  coordinateLabel: { color: colors.muted, fontSize: 9, fontWeight: "800", letterSpacing: 0.8 },
  coordinateValue: { color: colors.gold, fontSize: 14, fontWeight: "800", marginTop: 5 },
  preview: { alignItems: "center", overflow: "hidden" },
  previewLabel: { color: colors.gold, fontWeight: "700" },
  frame: { backgroundColor: "#07101F", borderColor: colors.text, borderWidth: 2, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  movingImage: { position: "absolute" },
  frameImage: { width: "100%", height: "100%" },
  imageFallback: { flex: 1, alignItems: "center", justifyContent: "center" },
  imageFallbackIcon: { color: colors.gold, fontSize: 34 },
  imageFallbackText: { color: colors.muted, fontSize: 12, marginTop: 6 },
  crossH: { position: "absolute", width: "100%", height: 1, backgroundColor: "#91A0B855" },
  crossV: { position: "absolute", width: 1, height: "100%", backgroundColor: "#91A0B855" },
  reticle: { position: "absolute", width: 22, height: 22, borderRadius: 11, borderWidth: 1, borderColor: "#F7F8FCAA" },
  cometMarker: { position: "absolute", width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: colors.gold, alignItems: "center", justifyContent: "center" },
  cometMarkerText: { color: colors.gold, fontSize: 16 },
  dragHint: { color: colors.blue, fontSize: 11, textAlign: "center" },
  sectionLabel: { color: colors.muted, fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  rigs: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  rig: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: 11, paddingVertical: 8 },
  rigActive: { borderColor: colors.gold, backgroundColor: colors.input },
  rigText: { color: colors.muted, fontWeight: "700", fontSize: 12 },
  rigTextActive: { color: colors.gold },
  row: { flexDirection: "row", gap: spacing.sm },
  half: { flex: 1 },
  results: { gap: spacing.sm },
  result: { borderLeftWidth: 3, borderLeftColor: colors.gold },
  resultValue: { color: colors.gold, fontSize: 26, fontWeight: "800" },
  error: { color: colors.danger },
  surveyCredit: { color: colors.muted, fontSize: 11, lineHeight: 16, textAlign: "center" },
}));
