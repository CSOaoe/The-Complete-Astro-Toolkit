import { useEffect, useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { Body, Equator, Observer } from "astronomy-engine";
import { DeviceMotion, Magnetometer } from "expo-sensors";
import { Animated, PanResponder, Platform, Pressable, Text, View } from "react-native";
import { Card, Screen, SectionHeader, uiStyles } from "@/components/ui";
import { useAppData } from "@/context/AppDataContext";
import { formatDec, formatRa, searchCatalogue, skyAtlasObjects } from "@/data/catalogue";
import { brightStars, constellationLines, meteorRadiants, milkyWaySpine } from "@/data/skyLayers";
import { equatorialCoordinates } from "@/utils/astronomy";
import { fieldOfView } from "@/utils/calculations";
import { createThemedStyles, radius, spacing } from "@/theme";

const MAP_WIDTH = 300;
const MAP_HEIGHT = 400;
const wrapRa = (hours: number) => ((hours % 24) + 24) % 24;
const clampDec = (degrees: number) => Math.max(-85, Math.min(85, degrees));
const raDelta = (value: number, centre: number) => ((value - centre + 36) % 24) - 12;
type Layer = "Stars" | "Constellations" | "Milky Way" | "Solar system" | "Comets" | "Meteors" | "Rig FOV" | "Mosaic" | "Horizon" | "Light pollution";
const layerOptions: Layer[] = ["Stars", "Constellations", "Milky Way", "Solar system", "Comets", "Meteors", "Rig FOV", "Mosaic", "Horizon", "Light pollution"];
interface MapPoint { id: string; name: string; raHours: number; decDegrees: number; magnitude?: number | null; kind: "star" | "object" | "planet" | "comet" | "meteor" | "milky"; routeId?: string; }

export default function SkyAtlasScreen() {
  const router = useRouter();
  const { equipment, observer, horizon } = useAppData();
  const [centre, setCentre] = useState({ ra: 12, dec: 0 });
  const [zoom, setZoom] = useState(1);
  const [drag] = useState(() => new Animated.ValueXY());
  const [layers, setLayers] = useState<Layer[]>(["Stars", "Constellations", "Milky Way", "Solar system", "Comets", "Rig FOV", "Horizon"]);
  const [pointMode, setPointMode] = useState(false);
  const [heading, setHeading] = useState<number | null>(null);
  const [tilt, setTilt] = useState<number | null>(null);
  const raField = 24 / zoom;
  const decField = 170 / zoom;
  const objects = useMemo<MapPoint[]>(() => skyAtlasObjects(360).map((item) => ({ id: item.id, name: item.name, raHours: item.raHours, decDegrees: item.decDegrees, magnitude: item.magnitude, kind: "object", routeId: item.id })), []);
  const comets = useMemo<MapPoint[]>(() => searchCatalogue("", "Comets", 12).map((item) => ({ id: item.id, name: item.name, raHours: item.raHours, decDegrees: item.decDegrees, kind: "comet", routeId: item.id })), []);
  const planets = useMemo<MapPoint[]>(() => {
    const site = new Observer(observer.latitude, observer.longitude, 0);
    return [Body.Moon, Body.Venus, Body.Mars, Body.Jupiter, Body.Saturn].map((body) => { const value = Equator(body, new Date(), site, true, true); return { id: `planet-${body}`, name: String(body), raHours: value.ra, decDegrees: value.dec, kind: "planet" as const }; });
  }, [observer]);
  const allPoints = useMemo(() => [
    ...objects,
    ...(layers.includes("Stars") ? brightStars.map((item) => ({ ...item, kind: "star" as const })) : []),
    ...(layers.includes("Solar system") ? planets : []),
    ...(layers.includes("Comets") ? comets : []),
    ...(layers.includes("Meteors") ? meteorRadiants.map((item) => ({ ...item, kind: "meteor" as const })) : []),
    ...(layers.includes("Milky Way") ? milkyWaySpine.map((item) => ({ ...item, kind: "milky" as const })) : []),
  ], [comets, layers, objects, planets]);
  const visible = useMemo(() => allPoints.map((point) => ({ point, ...project(point, centre, raField, decField) })).filter((item) => item.x !== null) as { point: MapPoint; x: number; y: number }[], [allPoints, centre, decField, raField]);
  const starPositions = useMemo(() => new Map(visible.filter((item) => item.point.kind === "star").map((item) => [item.point.id, item])), [visible]);
  const rig = equipment.rigs[0]; const scope = equipment.telescopes.find((item) => item.id === rig?.telescopeId); const camera = equipment.cameras.find((item) => item.id === rig?.cameraId);
  const rigFrame = scope && camera ? { h: fieldOfView(camera.sensorWidth, scope.focalLength), v: fieldOfView(camera.sensorHeight, scope.focalLength) } : null;
  useEffect(() => {
    if (!pointMode || Platform.OS === "web") return;
    Magnetometer.setUpdateInterval(200); DeviceMotion.setUpdateInterval(200);
    const magnet = Magnetometer.addListener(({ x, y }) => { const degrees = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360; const next = equatorialCoordinates(degrees, 45, observer, new Date()); setHeading(degrees); setCentre({ ra: next.raHours, dec: next.decDegrees }); });
    const motion = DeviceMotion.addListener(({ rotation }) => setTilt(rotation ? (rotation.beta * 180) / Math.PI : null));
    return () => { magnet.remove(); motion.remove(); };
  }, [observer, pointMode]);
  const panResponder = PanResponder.create({ onStartShouldSetPanResponder: () => !pointMode, onMoveShouldSetPanResponder: (_, gesture) => !pointMode && Math.abs(gesture.dx) + Math.abs(gesture.dy) > 3, onPanResponderMove: Animated.event([null, { dx: drag.x, dy: drag.y }], { useNativeDriver: false }), onPanResponderRelease: (_, gesture) => { setCentre({ ra: wrapRa(centre.ra - (gesture.dx / MAP_WIDTH) * raField), dec: clampDec(centre.dec + (gesture.dy / MAP_HEIGHT) * decField) }); drag.setValue({ x: 0, y: 0 }); }, onPanResponderTerminate: () => drag.setValue({ x: 0, y: 0 }) });
  const toggleLayer = (layer: Layer) => setLayers((current) => current.includes(layer) ? current.filter((item) => item !== layer) : [...current, layer]);
  const fovWidth = rigFrame ? Math.max(14, Math.min(MAP_WIDTH, (rigFrame.h / (raField * 15)) * MAP_WIDTH)) : 0;
  const fovHeight = rigFrame ? Math.max(14, Math.min(MAP_HEIGHT, (rigFrame.v / decField) * MAP_HEIGHT)) : 0;
  return <Screen>
    <Pressable onPress={() => router.back()}><Text style={styles.back}>‹ Tools</Text></Pressable>
    <SectionHeader title="Sky Atlas 2.0" subtitle="Offline sky layers, rig overlays and phone-pointing mode" />
    <View style={styles.coordinates}><Card style={styles.coordinateCard}><Text style={styles.label}>CENTRE RA</Text><Text style={styles.coordinate}>{formatRa(centre.ra)}</Text></Card><Card style={styles.coordinateCard}><Text style={styles.label}>CENTRE DEC</Text><Text style={styles.coordinate}>{formatDec(centre.dec)}</Text></Card></View>
    <Card><View style={styles.layerGrid}>{layerOptions.map((layer) => <Pressable key={layer} onPress={() => toggleLayer(layer)} style={[styles.layerChip, layers.includes(layer) && styles.layerChipActive]}><Text style={[styles.layerText, layers.includes(layer) && styles.layerTextActive]}>{layer}</Text></Pressable>)}</View><Pressable onPress={() => { setPointMode((value) => !value); if (Platform.OS === "web") { setHeading(null); setTilt(null); } }} style={[styles.pointButton, pointMode && styles.pointButtonActive]}><Text style={styles.pointText}>{pointMode ? "■ Stop phone pointing" : "⌖ Point phone at the sky"}</Text></Pressable>{pointMode ? <Text style={uiStyles.muted}>{Platform.OS === "web" ? "Install on Android or iOS to use compass and motion sensors." : `Heading ${heading?.toFixed(0) ?? "—"}° · tilt ${tilt?.toFixed(0) ?? "—"}°`}</Text> : null}</Card>
    <Card style={styles.atlasCard}><View style={styles.map} {...panResponder.panHandlers}>
      {layers.includes("Light pollution") ? <View pointerEvents="none" style={styles.lightPollution} /> : null}
      <View pointerEvents="none" style={styles.gridHorizontal} /><View pointerEvents="none" style={styles.gridVertical} />
      <Animated.View style={[styles.objectLayer, { transform: drag.getTranslateTransform() }]}>
        {layers.includes("Constellations") ? constellationLines.flatMap((group) => group.stars.slice(0, -1).map((id, index) => { const a = starPositions.get(id); const b = starPositions.get(group.stars[index + 1]); if (!a || !b) return null; return <View key={`${group.name}-${id}`} pointerEvents="none" style={[styles.constellationLine, lineBetween(a.x, a.y, b.x, b.y)]} />; })) : null}
        {visible.map(({ point, x, y }) => { const size = point.kind === "milky" ? 18 : point.kind === "meteor" ? 11 : point.kind === "planet" ? 10 : Math.max(4, Math.min(11, 10 - (point.magnitude ?? 6) * 0.65)); const labelled = point.kind === "planet" || point.kind === "comet" || point.kind === "meteor" || (point.kind === "star" && (point.magnitude ?? 9) < 1.4) || (point.kind === "object" && Boolean(point.routeId)); return <Pressable accessibilityLabel={`Open ${point.name}`} disabled={!point.routeId} key={`${point.kind}-${point.id}`} onPress={() => point.routeId && router.push(`/catalogue/${point.routeId}`)} style={[styles.markerHit, { left: x - 12, top: y - 12 }]}><View style={[styles.marker, point.kind === "planet" && styles.planet, point.kind === "comet" && styles.comet, point.kind === "meteor" && styles.meteor, point.kind === "milky" && styles.milky, { width: size, height: size, borderRadius: size / 2 }]} />{labelled ? <Text numberOfLines={1} style={styles.markerLabel}>{point.name}</Text> : null}</Pressable>; })}
      </Animated.View>
      {layers.includes("Horizon") ? <View pointerEvents="none" style={[styles.horizonMask, { height: horizon.enabled ? 55 : 30 }]}><Text style={styles.horizonText}>{horizon.enabled ? horizon.label : "Flat horizon"}</Text></View> : null}
      {layers.includes("Rig FOV") && rigFrame ? <View pointerEvents="none" style={[styles.fov, { width: fovWidth, height: fovHeight, left: MAP_WIDTH / 2 - fovWidth / 2, top: MAP_HEIGHT / 2 - fovHeight / 2 }]}>{layers.includes("Mosaic") ? <><View style={styles.mosaicV} /><View style={styles.mosaicH} /></> : null}</View> : null}
      <View pointerEvents="none" style={styles.centreReticle} />
    </View><Text style={uiStyles.muted}>{visible.length} mapped points · {layers.length} layers · {rig?.name ?? "no saved rig"}</Text><View style={styles.zoomRow}><Pressable accessibilityLabel="Zoom sky atlas out" onPress={() => setZoom((value) => Math.max(1, value / 1.6))} style={styles.zoomButton}><Text style={styles.zoomText}>−</Text></Pressable><Text style={styles.zoomValue}>{zoom.toFixed(1)}×</Text><Pressable accessibilityLabel="Zoom sky atlas in" onPress={() => setZoom((value) => Math.min(8, value * 1.6))} style={styles.zoomButton}><Text style={styles.zoomText}>＋</Text></Pressable></View></Card>
    <Card><Text style={uiStyles.h3}>Offline field map</Text><Text style={uiStyles.body}>Stars, constellations, Milky Way, meteor radiants and the deep-sky catalogue are packaged with the app. Planet and comet positions are calculated on-device.</Text></Card>
  </Screen>;
}

function project(point: Pick<MapPoint, "raHours" | "decDegrees">, centre: { ra: number; dec: number }, raField: number, decField: number) { const x = MAP_WIDTH / 2 + (raDelta(point.raHours, centre.ra) / raField) * MAP_WIDTH; const y = MAP_HEIGHT / 2 - ((point.decDegrees - centre.dec) / decField) * MAP_HEIGHT; return x < -25 || x > MAP_WIDTH + 25 || y < -25 || y > MAP_HEIGHT + 25 ? { x: null, y: null } : { x, y }; }
function lineBetween(x1: number, y1: number, x2: number, y2: number) { const length = Math.hypot(x2 - x1, y2 - y1); const angle = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI; return { left: x1, top: y1, width: length, transform: [{ rotate: `${angle}deg` }] }; }
const styles = createThemedStyles((colors) => ({ back: { color: colors.blue, fontWeight: "700" }, coordinates: { flexDirection: "row", gap: spacing.sm }, coordinateCard: { flex: 1, minWidth: 0 }, label: { color: colors.muted, fontSize: 10, fontWeight: "800", letterSpacing: 0.8 }, coordinate: { color: colors.gold, fontSize: 14, fontWeight: "800" }, layerGrid: { flexDirection: "row", flexWrap: "wrap", gap: 7 }, layerChip: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 7 }, layerChipActive: { backgroundColor: colors.gold, borderColor: colors.gold }, layerText: { color: colors.muted, fontSize: 12, fontWeight: "700" }, layerTextActive: { color: colors.background }, pointButton: { minHeight: 46, borderRadius: radius.md, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border }, pointButtonActive: { borderColor: colors.gold }, pointText: { color: colors.text, fontWeight: "800" }, atlasCard: { alignItems: "center" }, map: { width: MAP_WIDTH, height: MAP_HEIGHT, overflow: "hidden", borderRadius: radius.md, backgroundColor: "#020711", borderColor: colors.border, borderWidth: 1 }, objectLayer: { position: "absolute", inset: 0 }, gridHorizontal: { position: "absolute", left: 0, right: 0, top: "50%", height: 1, backgroundColor: colors.border }, gridVertical: { position: "absolute", top: 0, bottom: 0, left: "50%", width: 1, backgroundColor: colors.border }, constellationLine: { position: "absolute", height: 1, backgroundColor: "rgba(130,170,255,0.45)", transformOrigin: "left center" }, markerHit: { position: "absolute", width: 60, height: 30, flexDirection: "row", alignItems: "center", gap: 3, padding: 9 }, marker: { backgroundColor: colors.text }, planet: { backgroundColor: colors.gold }, comet: { backgroundColor: colors.success }, meteor: { borderWidth: 2, borderColor: colors.blue, backgroundColor: "transparent" }, milky: { backgroundColor: "rgba(90,130,230,0.12)" }, markerLabel: { color: colors.muted, fontSize: 8, width: 41 }, horizonMask: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "rgba(40,24,18,0.72)", alignItems: "center", justifyContent: "flex-start" }, horizonText: { color: colors.muted, fontSize: 9, marginTop: 4 }, lightPollution: { position: "absolute", bottom: -40, left: -20, right: -20, height: 150, borderRadius: 100, backgroundColor: "rgba(180,55,28,0.16)" }, fov: { position: "absolute", borderWidth: 2, borderColor: colors.gold }, mosaicV: { position: "absolute", left: "50%", top: 0, bottom: 0, width: 1, backgroundColor: colors.gold }, mosaicH: { position: "absolute", top: "50%", left: 0, right: 0, height: 1, backgroundColor: colors.gold }, centreReticle: { position: "absolute", left: MAP_WIDTH / 2 - 8, top: MAP_HEIGHT / 2 - 8, width: 16, height: 16, borderRadius: 8, borderWidth: 1, borderColor: colors.gold }, zoomRow: { flexDirection: "row", alignItems: "center", gap: spacing.md }, zoomButton: { width: 48, height: 42, borderRadius: radius.md, backgroundColor: colors.surfaceElevated, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border }, zoomText: { color: colors.text, fontSize: 24, fontWeight: "700" }, zoomValue: { color: colors.gold, fontWeight: "800", minWidth: 42, textAlign: "center" } }));
