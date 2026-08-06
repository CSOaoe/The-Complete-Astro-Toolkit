import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import * as Notifications from "expo-notifications";
import { Href, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Platform, Pressable, ScrollView, Text, View } from "react-native";
import { Button, Card, EmptyState, Screen, SectionHeader, uiStyles } from "@/components/ui";
import { useAppData } from "@/context/AppDataContext";
import { getCatalogueObject, searchCatalogue } from "@/data/catalogue";
import { altitudeAt } from "@/utils/astronomy";
import { sessionTiming } from "@/utils/fieldOperations";
import { createThemedStyles, radius, spacing } from "@/theme";
import { ImagingSession } from "@/types";

const checklist = [
  "Site and weather safety checked",
  "Mount levelled and polar aligned",
  "Cables, power and dew control checked",
  "Target centred with a solved frame",
  "Focus, guiding and test exposure checked",
  "Capture sequence running",
  "Calibration frames and shutdown completed",
];

export default function SessionCommandScreen() {
  const router = useRouter();
  const { sessions, observer, saveSession } = useAppData();
  const planned = useMemo(() => sessions.filter((session) => session.status === "Planned").sort((a, b) => `${a.date}T${a.startTime}`.localeCompare(`${b.date}T${b.startTime}`)), [sessions]);
  const [selectedId, setSelectedId] = useState("");
  const session = planned.find((item) => item.id === selectedId) ?? planned[0];
  const [now, setNow] = useState(new Date());
  const [completed, setCompleted] = useState<number[]>([]);
  const [notice, setNotice] = useState("");

  useEffect(() => { const timer = setInterval(() => setNow(new Date()), 1_000); return () => clearInterval(timer); }, []);
  useEffect(() => {
    if (!session) return;
    AsyncStorage.getItem(`@astrotoolkit/session-checklist/${session.id}`).then((stored) => setCompleted(stored ? JSON.parse(stored) : []));
  }, [session]);

  if (!session) return <Screen>
    <Pressable onPress={() => router.back()}><Text style={styles.back}>‹ Tonight</Text></Pressable>
    <SectionHeader title="Session Command Centre" subtitle="Live capture timeline, field checklist and safety status" />
    <EmptyState title="No planned session" message="Create an imaging plan first, then return here to run it in the field." action={<Button title="Open imaging planner" onPress={() => router.push("/planner" as Href)} />} />
  </Screen>;

  const timing = sessionTiming(session, now);
  const target = session.targetId ? getCatalogueObject(session.targetId) : searchCatalogue(session.targetName, "All", 1)[0];
  const altitude = target ? altitudeAt(target.raHours * 15, target.decDegrees, observer, now) : null;
  const donePercent = Math.round((completed.length / checklist.length) * 100);
  const toggleCheck = async (index: number) => {
    const next = completed.includes(index) ? completed.filter((item) => item !== index) : [...completed, index];
    setCompleted(next);
    await AsyncStorage.setItem(`@astrotoolkit/session-checklist/${session.id}`, JSON.stringify(next));
    await Haptics.selectionAsync().catch(() => undefined);
  };
  const startNow = async () => {
    const current = new Date();
    const updated: ImagingSession = { ...session, date: current.toISOString().slice(0, 10), startTime: current.toTimeString().slice(0, 5) };
    await saveSession(updated);
    setNow(current);
    setNotice("Session timeline started now");
  };
  const scheduleAlerts = async () => {
    if (Platform.OS === "web") { setNotice("Session reminders are available in the Android and iOS app"); return; }
    const permission = await Notifications.requestPermissionsAsync();
    if (!permission.granted) { setNotice("Notification permission was not granted"); return; }
    if (Platform.OS === "android") await Notifications.setNotificationChannelAsync("sessions", { name: "Imaging sessions", importance: Notifications.AndroidImportance.HIGH });
    const startDate = timing.start > now ? timing.start : new Date(now.getTime() + 5_000);
    await Notifications.scheduleNotificationAsync({ content: { title: `${session.targetName} session`, body: "Your imaging session is ready to begin.", data: { route: "/session-command" } }, trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: startDate, channelId: "sessions" } });
    if (timing.end > now) await Notifications.scheduleNotificationAsync({ content: { title: "Session window complete", body: `Check ${session.targetName}, calibration frames and safe shutdown.`, data: { route: "/session-command" } }, trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: timing.end, channelId: "sessions" } });
    setNotice("Start and shutdown reminders scheduled");
  };

  return <Screen>
    <Pressable onPress={() => router.back()}><Text style={styles.back}>‹ Tonight</Text></Pressable>
    <SectionHeader title="Session Command Centre" subtitle="Large, field-safe controls for the complete imaging run" />
    {planned.length > 1 ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sessions}>{planned.map((item) => <Pressable key={item.id} onPress={() => setSelectedId(item.id)} style={[styles.sessionChip, item.id === session.id && styles.sessionChipActive]}><Text style={[styles.sessionChipText, item.id === session.id && styles.sessionChipTextActive]}>{item.targetName}</Text></Pressable>)}</ScrollView> : null}
    <Card style={styles.hero}>
      <Text style={styles.kicker}>{timing.state.toUpperCase()} SESSION</Text>
      <Text style={styles.target}>{session.targetName}</Text>
      <Text style={uiStyles.muted}>{session.rigName || "Saved imaging rig"} · {session.locationName}</Text>
      <View style={styles.metrics}>
        <LiveMetric label="PROGRESS" value={`${Math.round(timing.progress * 100)}%`} />
        <LiveMetric label="REMAINING" value={timing.state === "upcoming" ? "Not started" : `${Math.round(timing.remainingMinutes)} min`} />
        <LiveMetric label="ALTITUDE" value={altitude === null ? "—" : `${Math.round(altitude)}°`} warning={altitude !== null && altitude < 25} />
      </View>
      <View style={styles.track}><View style={[styles.trackFill, { width: `${Math.max(2, timing.progress * 100)}%` }]} /></View>
      <Text style={styles.clock}>{now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</Text>
      <Text style={styles.window}>{timing.start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} → {timing.end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</Text>
    </Card>
    <View style={styles.actions}><View style={styles.actionHalf}><Button title="Start now" onPress={() => void startNow()} /></View><View style={styles.actionHalf}><Button title="Set reminders" variant="secondary" onPress={() => void scheduleAlerts()} /></View></View>
    {notice ? <Text style={styles.notice}>{notice}</Text> : null}
    <SectionHeader title="Field checklist" subtitle={`${completed.length}/${checklist.length} complete · ${donePercent}%`} />
    <Card>
      {checklist.map((item, index) => {
        const checked = completed.includes(index);
        return <Pressable accessibilityRole="checkbox" accessibilityState={{ checked }} key={item} onPress={() => void toggleCheck(index)} style={styles.checkRow}>
          <View style={[styles.check, checked && styles.checkDone]}><Text style={styles.checkGlyph}>{checked ? "✓" : ""}</Text></View>
          <Text style={[styles.checkText, checked && styles.checkTextDone]}>{item}</Text>
        </Pressable>;
      })}
    </Card>
    <SectionHeader title="Live shortcuts" />
    <View style={styles.shortcutGrid}>
      <Shortcut title="Framing" icon="□" onPress={() => router.push("/tools/framing" as Href)} />
      <Shortcut title="Plate solve" icon="⌖" onPress={() => router.push("/tools/plate-solve" as Href)} />
      <Shortcut title="Guiding" icon="⌁" onPress={() => router.push("/tools/phd2-log" as Href)} />
      <Shortcut title="Power & dew" icon="⚡" onPress={() => router.push("/power-planner" as Href)} />
    </View>
    <Button title="Mark session completed" disabled={timing.state === "upcoming" && completed.length < 5} onPress={() => void saveSession({ ...session, status: "Completed" })} />
    <Text style={styles.disclaimer}>Always retain direct control of your mount and power system. The command centre is a planning and checklist aid, not a safety interlock.</Text>
  </Screen>;
}

function LiveMetric({ label, value, warning }: { label: string; value: string; warning?: boolean }) { return <View style={styles.metric}><Text style={styles.metricLabel}>{label}</Text><Text style={[styles.metricValue, warning && styles.metricWarning]}>{value}</Text></View>; }
function Shortcut({ title, icon, onPress }: { title: string; icon: string; onPress: () => void }) { return <Pressable onPress={onPress} style={styles.shortcut}><Text style={styles.shortcutIcon}>{icon}</Text><Text style={styles.shortcutText}>{title}</Text></Pressable>; }

const styles = createThemedStyles((colors) => ({
  back: { color: colors.blue, fontWeight: "700" },
  sessions: { gap: spacing.xs },
  sessionChip: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: 13, paddingVertical: 9 },
  sessionChipActive: { borderColor: colors.gold, backgroundColor: colors.input },
  sessionChipText: { color: colors.muted, fontWeight: "700" },
  sessionChipTextActive: { color: colors.gold },
  hero: { alignItems: "center", borderColor: colors.gold, borderWidth: 2 },
  kicker: { color: colors.gold, fontSize: 10, fontWeight: "900", letterSpacing: 1.3 },
  target: { color: colors.text, fontSize: 28, lineHeight: 34, fontWeight: "900", textAlign: "center" },
  metrics: { width: "100%", flexDirection: "row", gap: spacing.xs },
  metric: { flex: 1, minWidth: 0, backgroundColor: colors.input, borderRadius: radius.md, padding: 10 },
  metricLabel: { color: colors.muted, fontSize: 8, fontWeight: "900" },
  metricValue: { color: colors.text, fontSize: 13, fontWeight: "800", marginTop: 4 },
  metricWarning: { color: colors.warning },
  track: { width: "100%", height: 10, borderRadius: 5, backgroundColor: colors.border, overflow: "hidden" },
  trackFill: { height: "100%", borderRadius: 5, backgroundColor: colors.gold },
  clock: { color: colors.gold, fontSize: 35, lineHeight: 42, fontWeight: "900", fontVariant: ["tabular-nums"] },
  window: { color: colors.muted, fontSize: 12, fontWeight: "700" },
  actions: { flexDirection: "row", gap: spacing.sm },
  actionHalf: { flex: 1 },
  notice: { color: colors.blue, textAlign: "center", fontWeight: "700" },
  checkRow: { minHeight: 54, flexDirection: "row", alignItems: "center", gap: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  check: { width: 28, height: 28, borderRadius: 8, borderWidth: 2, borderColor: colors.muted, alignItems: "center", justifyContent: "center" },
  checkDone: { borderColor: colors.success, backgroundColor: colors.success },
  checkGlyph: { color: colors.background, fontWeight: "900" },
  checkText: { color: colors.text, flex: 1, fontSize: 14, lineHeight: 20, fontWeight: "600" },
  checkTextDone: { color: colors.muted, textDecorationLine: "line-through" },
  shortcutGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  shortcut: { flexGrow: 1, flexBasis: 130, minHeight: 84, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  shortcutIcon: { color: colors.gold, fontSize: 24 },
  shortcutText: { color: colors.text, fontWeight: "800" },
  disclaimer: { color: colors.muted, fontSize: 11, lineHeight: 16, textAlign: "center" },
}));
