import { useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Button, Card, Screen, SectionHeader, uiStyles } from "@/components/ui";
import { useAppData } from "@/context/AppDataContext";
import { fetchAstroWeather, WeatherHour } from "@/services/weather";
import { createOfflineFieldPack, deleteOfflineFieldPack, loadOfflineFieldPack, OfflineFieldPack } from "@/services/offlinePack";
import { collectOfflineTargets } from "@/utils/offlineTargets";
import { createThemedStyles, radius, spacing } from "@/theme";

export default function OfflinePackScreen() {
  const router = useRouter();
  const { observer, equipment, horizon, sessions, favourites } = useAppData();
  const [pack, setPack] = useState<OfflineFieldPack | null>(null);
  const [weather, setWeather] = useState<WeatherHour[]>([]);
  const [status, setStatus] = useState("Ready to build");
  const [working, setWorking] = useState(false);
  const targets = useMemo(() => collectOfflineTargets(favourites, sessions), [favourites, sessions]);
  useEffect(() => { loadOfflineFieldPack().then(setPack); fetchAstroWeather(observer).then(setWeather).catch(() => undefined); }, [observer]);
  const build = async () => {
    setWorking(true); setStatus("Saving plans, equipment, forecast and target imagery…");
    try {
      const next = await createOfflineFieldPack({ observer, equipment, horizon, sessions, weather, favourites });
      setPack(next); setStatus("Field pack ready for offline use");
    } catch { setStatus("Some field-pack items could not be saved. Try again with a connection."); }
    finally { setWorking(false); }
  };
  const remove = async () => { await deleteOfflineFieldPack(); setPack(null); setStatus("Offline field pack removed"); };
  const updated = pack ? new Date(pack.createdAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : null;
  return <Screen>
    <Pressable onPress={() => router.back()}><Text style={styles.back}>‹ Tonight</Text></Pressable>
    <SectionHeader title="Offline Field Pack" subtitle="Take your complete night plan where mobile reception cannot reach" />
    <Card style={[styles.statusCard, pack && styles.readyCard]}>
      <Text style={styles.packIcon}>{pack ? "✓" : "↓"}</Text>
      <Text style={styles.packTitle}>{pack ? "Offline pack ready" : "Build tonight’s pack"}</Text>
      <Text style={uiStyles.muted}>{pack ? `Updated ${updated} · ${pack.imageCount} target images saved` : "Plans and essential observing data will remain available without an internet connection."}</Text>
      <Text style={styles.status}>{status}</Text>
    </Card>
    <SectionHeader title="Included automatically" subtitle="Built from your current location, equipment, favourites and planned sessions" />
    <View style={styles.grid}>
      <PackItem icon="⌖" title="Observing site" value={observer.label} />
      <PackItem icon="□" title="Planned sessions" value={`${sessions.filter((item) => item.status === "Planned").length} sessions`} />
      <PackItem icon="✦" title="Target fields" value={`${targets.length} selected`} />
      <PackItem icon="☁" title="Forecast" value={weather.length ? `${weather.length} hours` : "Last available data"} />
      <PackItem icon="⌁" title="Equipment" value={`${equipment.rigs.length} rigs`} />
      <PackItem icon="⌂" title="Local horizon" value={horizon.enabled ? horizon.label : "Flat horizon"} />
    </View>
    {targets.length ? <><SectionHeader title="Target image pack" subtitle="Real survey fields cached for framing and identification" /><Card>{targets.map((target) => <View key={target.id} style={styles.targetRow}><Text style={styles.targetMark}>✦</Text><View style={styles.targetBody}><Text style={styles.targetName}>{target.name}</Text><Text style={uiStyles.muted}>{target.catalogue}</Text></View><Text style={styles.included}>INCLUDED</Text></View>)}</Card></> : <Card><Text style={uiStyles.h3}>No target images selected yet</Text><Text style={uiStyles.muted}>Favourite catalogue targets or create planned sessions, then rebuild the pack.</Text></Card>}
    <Button title={working ? "Building field pack…" : pack ? "Refresh offline field pack" : "Build offline field pack"} disabled={working} onPress={() => void build()} />
    {pack ? <Button title="Remove downloaded field pack" variant="danger" onPress={() => void remove()} /> : null}
    <Text style={styles.disclaimer}>Forecasts and moving-object positions are a snapshot from the build time. Refresh shortly before leaving for the observing site.</Text>
  </Screen>;
}

function PackItem({ icon, title, value }: { icon: string; title: string; value: string }) { return <Card style={styles.item}><Text style={styles.itemIcon}>{icon}</Text><Text style={styles.itemTitle}>{title}</Text><Text style={styles.itemValue}>{value}</Text></Card>; }
const styles = createThemedStyles((colors) => ({
  back: { color: colors.blue, fontWeight: "700" },
  statusCard: { alignItems: "center", borderWidth: 2, borderStyle: "dashed" },
  readyCard: { borderStyle: "solid", borderColor: colors.success },
  packIcon: { color: colors.gold, fontSize: 40, fontWeight: "900" },
  packTitle: { color: colors.text, fontSize: 24, fontWeight: "900" },
  status: { color: colors.blue, fontSize: 12, fontWeight: "700", textAlign: "center" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  item: { flexGrow: 1, flexBasis: 145, minWidth: 0 },
  itemIcon: { color: colors.gold, fontSize: 22 },
  itemTitle: { color: colors.text, fontWeight: "800" },
  itemValue: { color: colors.muted, fontSize: 12 },
  targetRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, minHeight: 52, borderBottomWidth: 1, borderBottomColor: colors.border },
  targetMark: { color: colors.gold, fontSize: 18 },
  targetBody: { flex: 1 },
  targetName: { color: colors.text, fontWeight: "800" },
  included: { color: colors.success, fontSize: 9, fontWeight: "900", borderWidth: 1, borderColor: colors.success, borderRadius: radius.pill, paddingHorizontal: 7, paddingVertical: 4 },
  disclaimer: { color: colors.muted, fontSize: 11, lineHeight: 16, textAlign: "center" },
}));
