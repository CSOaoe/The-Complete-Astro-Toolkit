import { useMemo } from "react";
import { Text, View } from "react-native";
import { Card, Header, Screen, SectionHeader, uiStyles } from "@/components/ui";
import { useAppData } from "@/context/AppDataContext";
import { meteorShowers, nextEclipses, nextMeteorPeak } from "@/utils/skyEvents";
import { moonPhase } from "@/utils/astronomy";
import { createThemedStyles, radius, spacing } from "@/theme";

export default function SkyEventsScreen() {
  const { observer } = useAppData(); const events = useMemo(() => nextEclipses(observer), [observer]); const showers = useMemo(() => meteorShowers.map((shower) => { const peak = nextMeteorPeak(shower); return { shower, peak, moon: moonPhase(peak) }; }).sort((a, b) => a.peak.getTime() - b.peak.getTime()), []);
  return <Screen><Header eyebrow="Rare-event planning" title="Eclipses & Meteors" /><Card style={styles.eclipse}><Text style={styles.kicker}>NEXT LOCAL SOLAR ECLIPSE</Text><Text style={styles.title}>{events.solar.kind}</Text><Text style={styles.date}>{events.solar.peak.toLocaleString()}</Text><Text style={uiStyles.muted}>{Math.round(events.solar.obscuration * 100)}% obscuration · Sun {Math.round(events.solar.altitude)}° high at peak</Text><Text style={styles.safety}>Never photograph or view the Sun without a certified front-aperture solar filter except during the total phase of a genuinely total eclipse at your exact location.</Text></Card>
    <Card><Text style={styles.kicker}>NEXT LUNAR ECLIPSE</Text><Text style={styles.title}>{events.lunar.kind}</Text><Text style={styles.date}>{events.lunar.peak.toLocaleString()}</Text><Text style={uiStyles.muted}>{Math.round(events.lunar.obscuration * 100)}% umbral obscuration · Moon {Math.round(events.lunar.altitude)}° high at your location · approximately {Math.round(events.lunar.penumbralMinutes)} minutes penumbral duration</Text></Card>
    <SectionHeader title="Major meteor showers" subtitle="Annual planning dates; actual peak timing can shift, so confirm the current IMO calendar before travel" />
    {showers.map(({ shower, peak, moon }) => <Card key={shower.code}><View style={styles.row}><View style={styles.badge}><Text style={styles.badgeText}>{shower.code}</Text></View><View style={{ flex: 1 }}><Text style={uiStyles.h3}>{shower.name}</Text><Text style={styles.date}>{peak.toLocaleDateString([], { weekday: "short", day: "numeric", month: "long", year: "numeric" })}</Text></View><Text style={styles.zhr}>ZHR {shower.zhr}</Text></View><Text style={uiStyles.muted}>Radiant: {shower.radiant} · {shower.speed} km/s · Moon {moon.illumination}% illuminated</Text><Text style={uiStyles.body}>{shower.note}</Text></Card>)}
  </Screen>;
}
const styles = createThemedStyles((colors) => ({ eclipse: { borderColor: colors.gold }, kicker: { color: colors.gold, fontSize: 10, fontWeight: "900", letterSpacing: 1.2 }, title: { color: colors.text, fontSize: 25, fontWeight: "900" }, date: { color: colors.blue, fontWeight: "700" }, safety: { color: colors.danger, fontSize: 12, lineHeight: 18, fontWeight: "700" }, row: { flexDirection: "row", alignItems: "center", gap: spacing.sm }, badge: { width: 48, height: 48, borderRadius: radius.md, backgroundColor: colors.input, alignItems: "center", justifyContent: "center" }, badgeText: { color: colors.gold, fontWeight: "900" }, zhr: { color: colors.gold, fontWeight: "800" } }));
