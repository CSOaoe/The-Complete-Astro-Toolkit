import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useMemo, useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Button, Card, Screen, SectionHeader, uiStyles } from "@/components/ui";
import { useAppData } from "@/context/AppDataContext";
import { targets } from "@/data/targets";
import { fetchSpaceWeather, SpaceWeatherSnapshot } from "@/services/spaceWeather";
import { fetchAstroWeather, WeatherHour } from "@/services/weather";
import { AlertCategory, buildIntelligentAlerts } from "@/utils/intelligentAlerts";
import { smartTargetsTonight } from "@/utils/smartPlanning";
import { createThemedStyles, radius, spacing } from "@/theme";

const STORAGE = "@astrotoolkit/alert-categories";
const categories: AlertCategory[] = ["Clear sky", "Aurora", "Target", "Equipment"];

export default function AlertCentreScreen() {
  const router = useRouter();
  const { observer, equipment, horizon, favourites } = useAppData();
  const [weather, setWeather] = useState<WeatherHour[]>([]);
  const [spaceWeather, setSpaceWeather] = useState<SpaceWeatherSnapshot | null>(null);
  const [enabled, setEnabled] = useState<AlertCategory[]>(categories);
  const [status, setStatus] = useState("Checking live conditions…");
  const [dailyEnabled, setDailyEnabled] = useState(false);
  useEffect(() => { AsyncStorage.getItem(STORAGE).then((value) => value && setEnabled(JSON.parse(value) as AlertCategory[])).catch(() => undefined); }, []);
  useEffect(() => { let active = true; Promise.allSettled([fetchAstroWeather(observer), fetchSpaceWeather(observer)]).then(([weatherResult, spaceResult]) => { if (!active) return; if (weatherResult.status === "fulfilled") setWeather(weatherResult.value); if (spaceResult.status === "fulfilled") setSpaceWeather(spaceResult.value); setStatus(weatherResult.status === "fulfilled" || spaceResult.status === "fulfilled" ? "Live forecast rules evaluated" : "Live feeds unavailable — showing planning rules"); }); return () => { active = false; }; }, [observer]);
  const targetPool = favourites.length ? targets.filter((target) => favourites.includes(target.id)) : targets;
  const ranked = useMemo(() => smartTargetsTonight(targetPool, observer, weather, equipment, new Date(), 3, horizon), [equipment, horizon, observer, targetPool, weather]);
  const alerts = useMemo(() => buildIntelligentAlerts(weather, spaceWeather, ranked).filter((alert) => enabled.includes(alert.category)), [enabled, ranked, spaceWeather, weather]);
  const toggle = (category: AlertCategory) => { const next = enabled.includes(category) ? enabled.filter((item) => item !== category) : [...enabled, category]; setEnabled(next); void AsyncStorage.setItem(STORAGE, JSON.stringify(next)); };
  const enableDaily = async () => {
    if (Platform.OS === "web") { setStatus("Device notifications are available in the installed Android or iOS app."); return; }
    const Notifications = await import("expo-notifications");
    const permission = await Notifications.requestPermissionsAsync();
    if (!permission.granted) { setStatus("Notification permission was not granted."); return; }
    if (Platform.OS === "android") await Notifications.setNotificationChannelAsync("planning", { name: "Astro planning alerts", importance: Notifications.AndroidImportance.DEFAULT });
    await Notifications.scheduleNotificationAsync({ content: { title: "AstroToolkit evening check", body: "Review clear sky, aurora, dew and target windows for tonight." }, trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: 18, minute: 0, channelId: "planning" } });
    setDailyEnabled(true); setStatus("Daily planning notification scheduled for 18:00.");
  };
  return <Screen>
    <Pressable onPress={() => router.back()}><Text style={styles.back}>‹ Tonight</Text></Pressable>
    <SectionHeader title="Intelligent alert centre" subtitle="Clear sky, aurora, target altitude and equipment-risk rules" />
    <Card><Text style={styles.label}>ALERT RULES</Text><View style={styles.choices}>{categories.map((category) => <Pressable key={category} onPress={() => toggle(category)} style={[styles.chip, enabled.includes(category) && styles.chipActive]}><Text style={[styles.chipText, enabled.includes(category) && styles.chipTextActive]}>{category}</Text></Pressable>)}</View><Text style={uiStyles.muted}>{status}</Text><Button title={dailyEnabled ? "Daily reminder enabled" : "Enable 18:00 device reminder"} disabled={dailyEnabled} onPress={() => void enableDaily()} /></Card>
    {alerts.map((alert) => <Card key={alert.id} style={alert.priority === "High" ? styles.high : undefined}><View style={styles.head}><View style={styles.half}><Text style={styles.category}>{alert.category.toUpperCase()}</Text><Text style={uiStyles.h3}>{alert.title}</Text></View><View style={styles.badge}><Text style={styles.badgeText}>{alert.priority}</Text></View></View><Text style={uiStyles.body}>{alert.message}</Text></Card>)}
    {!alerts.length ? <Card><Text style={uiStyles.h3}>All alert categories are disabled</Text><Text style={uiStyles.body}>Enable at least one rule above to see live recommendations.</Text></Card> : null}
  </Screen>;
}
const styles = createThemedStyles((colors) => ({ back: { color: colors.blue, fontWeight: "700" }, label: { color: colors.muted, fontSize: 10, fontWeight: "800", letterSpacing: 0.8 }, choices: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }, chip: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 9 }, chipActive: { backgroundColor: colors.gold, borderColor: colors.gold }, chipText: { color: colors.muted, fontWeight: "700" }, chipTextActive: { color: colors.background }, high: { borderColor: colors.gold }, head: { flexDirection: "row", alignItems: "center", gap: spacing.sm }, half: { flex: 1 }, category: { color: colors.gold, fontSize: 10, fontWeight: "800", letterSpacing: 1 }, badge: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 4 }, badgeText: { color: colors.text, fontSize: 11, fontWeight: "700" } }));
