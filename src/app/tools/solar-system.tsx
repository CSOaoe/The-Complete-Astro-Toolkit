import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Body } from "astronomy-engine";
import { Card, Header, Screen, SectionHeader, uiStyles } from "@/components/ui";
import { useAppData } from "@/context/AppDataContext";
import { bodyAltitudeSeries, bodyImagingSummary, imagingBodies, ImagingBody } from "@/utils/solarSystem";
import { createThemedStyles, radius, spacing } from "@/theme";

export default function SolarSystemScreen() {
  const { observer } = useAppData(); const [body, setBody] = useState<ImagingBody>(Body.Moon); const summary = useMemo(() => bodyImagingSummary(body, observer), [body, observer]); const series = useMemo(() => bodyAltitudeSeries(body, observer), [body, observer]);
  return <Screen><Header eyebrow="Lucky imaging" title="Solar, Lunar & Planets" /><View style={styles.chips}>{imagingBodies.map((item) => <Pressable key={item} onPress={() => setBody(item)} style={[styles.chip, body === item && styles.active]}><Text style={[styles.chipText, body === item && styles.activeText]}>{item}</Text></Pressable>)}</View>
    {body === Body.Sun ? <Card style={styles.safety}><Text style={styles.safetyTitle}>Solar safety is non-negotiable</Text><Text style={uiStyles.body}>Use a certified front-aperture solar filter designed for your telescope. Never rely on an eyepiece filter, camera exposure setting or cloud.</Text></Card> : null}
    <Card><Text style={styles.bodyName}>{body}</Text><View style={styles.stats}><Stat label="ALTITUDE" value={`${summary.altitude.toFixed(1)}°`} /><Stat label="AZIMUTH" value={`${summary.azimuth.toFixed(0)}°`} /><Stat label="MAGNITUDE" value={summary.magnitude.toFixed(1)} /><Stat label="ILLUMINATED" value={`${summary.illumination.toFixed(0)}%`} /></View></Card>
    <SectionHeader title="Next 12 hours" subtitle="Half-hour altitude timeline at your observing site" /><Card><View style={styles.timeline}>{series.map((point) => <View key={point.at.toISOString()} style={[styles.altitude, { height: Math.max(3, Math.max(0, point.altitude) * 1.4) }]} />)}</View></Card>
    <Card style={styles.advice}><Text style={styles.mode}>{summary.mode}</Text><Text style={styles.cadence}>{summary.cadence}</Text><Text style={uiStyles.body}>{summary.note}</Text></Card>
  </Screen>;
}
function Stat({ label, value }: { label: string; value: string }) { return <View style={styles.stat}><Text style={styles.label}>{label}</Text><Text style={styles.value}>{value}</Text></View>; }
const styles = createThemedStyles((colors) => ({ chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }, chip: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.surface }, active: { backgroundColor: colors.gold, borderColor: colors.gold }, chipText: { color: colors.text, fontWeight: "700", fontSize: 12 }, activeText: { color: colors.background }, safety: { borderColor: colors.danger }, safetyTitle: { color: colors.danger, fontSize: 18, fontWeight: "900" }, bodyName: { color: colors.gold, fontSize: 30, fontWeight: "900" }, stats: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }, stat: { width: "46%", flexGrow: 1, backgroundColor: colors.input, borderRadius: radius.md, padding: 12 }, label: { color: colors.muted, fontSize: 9, fontWeight: "800" }, value: { color: colors.text, fontSize: 18, fontWeight: "800" }, timeline: { height: 135, flexDirection: "row", alignItems: "flex-end", gap: 2 }, altitude: { flex: 1, backgroundColor: colors.gold, borderRadius: 2 }, advice: { borderColor: colors.gold }, mode: { color: colors.gold, fontSize: 20, fontWeight: "800" }, cadence: { color: colors.blue, fontWeight: "800" } }));
