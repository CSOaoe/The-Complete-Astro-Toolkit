import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Button, Card, Input, Screen, SectionHeader, uiStyles } from "@/components/ui";
import { useAppData } from "@/context/AppDataContext";
import { fetchAstroWeather } from "@/services/weather";
import { calculatePowerPlan, calculateStoragePlan, dewPointCelsius } from "@/utils/fieldOperations";
import { createThemedStyles, spacing } from "@/theme";

const KEY = "@astrotoolkit/power-plan";
const defaults = {
  batteryWh: "500", reserve: "15", duration: "6", temperature: "5", humidity: "82",
  mount: "12", camera: "18", computer: "15", dew: "12", accessories: "6",
  storage: "64", frameSize: "50", exposure: "180", overhead: "5",
};
const numeric = (form: typeof defaults, key: keyof typeof defaults) => Math.max(0, Number(form[key]) || 0);

export default function PowerPlannerScreen() {
  const router = useRouter();
  const { observer, sessions } = useAppData();
  const nextSession = sessions.find((session) => session.status === "Planned");
  const [form, setForm] = useState(defaults);
  const [saved, setSaved] = useState(false);
  const [forecastStatus, setForecastStatus] = useState("");

  useEffect(() => { AsyncStorage.getItem(KEY).then((value) => { if (value) setForm({ ...defaults, ...JSON.parse(value) }); }); }, []);
  const power = useMemo(() => calculatePowerPlan({
    batteryWh: numeric(form, "batteryWh"), reservePercent: numeric(form, "reserve"), ambientCelsius: Number(form.temperature) || 0,
    durationHours: numeric(form, "duration"), mountWatts: numeric(form, "mount"), cameraWatts: numeric(form, "camera"), computerWatts: numeric(form, "computer"),
    dewHeaterWatts: numeric(form, "dew"), accessoriesWatts: numeric(form, "accessories"),
  }), [form]);
  const storage = useMemo(() => calculateStoragePlan({
    freeStorageGb: numeric(form, "storage"), frameSizeMb: numeric(form, "frameSize"), exposureSeconds: numeric(form, "exposure"), overheadSeconds: numeric(form, "overhead"), durationHours: numeric(form, "duration"),
  }), [form]);
  const dewPoint = dewPointCelsius(Number(form.temperature) || 0, numeric(form, "humidity"));
  const dewGap = (Number(form.temperature) || 0) - dewPoint;
  const update = (key: keyof typeof form, value: string) => { setSaved(false); setForm((current) => ({ ...current, [key]: value })); };
  const applyForecast = async () => {
    setForecastStatus("Loading forecast…");
    try {
      const weather = await fetchAstroWeather(observer);
      const hour = weather[0];
      if (!hour) throw new Error();
      setForm((current) => ({ ...current, temperature: String(hour.temperature), humidity: String(hour.humidity) }));
      setForecastStatus(`Using ${observer.label} forecast`);
    } catch { setForecastStatus("Forecast unavailable — enter conditions manually"); }
  };
  const save = async () => { await AsyncStorage.setItem(KEY, JSON.stringify(form)); setSaved(true); };

  return <Screen>
    <Pressable onPress={() => router.back()}><Text style={styles.back}>‹ Tonight</Text></Pressable>
    <SectionHeader title="Power, dew & storage" subtitle="Check whether your battery and storage will safely finish the planned session" />
    {nextSession ? <Card style={styles.session}><Text style={styles.kicker}>NEXT PLANNED SESSION</Text><Text style={uiStyles.h3}>{nextSession.targetName}</Text><Text style={uiStyles.muted}>{nextSession.durationMinutes} minutes · {nextSession.rigName || "Saved equipment"}</Text></Card> : null}
    <View style={styles.summary}>
      <Metric label="POWER RUNTIME" value={`${power.runtimeHours.toFixed(1)} h`} good={power.sufficient} />
      <Metric label="DEW GAP" value={`${dewGap.toFixed(1)}°C`} good={dewGap >= 3} />
      <Metric label="STORAGE" value={`${storage.requiredGb.toFixed(1)} GB`} good={storage.sufficient} />
    </View>
    <Card style={[styles.verdict, power.sufficient && storage.sufficient && dewGap >= 3 ? styles.good : styles.warning]}>
      <Text style={styles.verdictTitle}>{power.sufficient && storage.sufficient ? "Capacity check passed" : "Session needs attention"}</Text>
      <Text style={uiStyles.muted}>{power.sufficient ? `${power.marginWh.toFixed(0)} Wh battery margin after reserve.` : `${Math.abs(power.marginWh).toFixed(0)} Wh more usable power required.`}</Text>
      <Text style={uiStyles.muted}>{storage.sufficient ? `${storage.remainingGb.toFixed(1)} GB remains after approximately ${storage.plannedFrames} frames.` : `${storage.requiredGb.toFixed(1)} GB required for approximately ${storage.plannedFrames} frames.`}</Text>
      <Text style={uiStyles.muted}>{dewGap < 2 ? "High condensation risk — use active dew control from setup." : dewGap < 4 ? "Moderate dew risk — keep heaters ready." : "Comfortable temperature-to-dew-point margin."}</Text>
    </Card>
    <SectionHeader title="Session conditions" action={<Pressable onPress={() => void applyForecast()}><Text style={styles.action}>Use forecast</Text></Pressable>} />
    <Card>
      <View style={styles.row}><View style={styles.half}><Input label="Duration (hours)" value={form.duration} onChangeText={(v) => update("duration", v)} keyboardType="decimal-pad" /></View><View style={styles.half}><Input label="Battery (Wh)" value={form.batteryWh} onChangeText={(v) => update("batteryWh", v)} keyboardType="decimal-pad" /></View></View>
      <View style={styles.row}><View style={styles.half}><Input label="Temperature °C" value={form.temperature} onChangeText={(v) => update("temperature", v)} keyboardType="numbers-and-punctuation" /></View><View style={styles.half}><Input label="Humidity %" value={form.humidity} onChangeText={(v) => update("humidity", v)} keyboardType="decimal-pad" /></View></View>
      <Input label="Battery reserve %" value={form.reserve} onChangeText={(v) => update("reserve", v)} keyboardType="decimal-pad" />
      {forecastStatus ? <Text style={styles.note}>{forecastStatus}</Text> : null}
    </Card>
    <SectionHeader title="Power draw" subtitle="Typical continuous draw; use manufacturer measurements where available" />
    <Card>
      <View style={styles.row}><View style={styles.half}><Input label="Mount watts" value={form.mount} onChangeText={(v) => update("mount", v)} keyboardType="decimal-pad" /></View><View style={styles.half}><Input label="Camera watts" value={form.camera} onChangeText={(v) => update("camera", v)} keyboardType="decimal-pad" /></View></View>
      <View style={styles.row}><View style={styles.half}><Input label="Computer watts" value={form.computer} onChangeText={(v) => update("computer", v)} keyboardType="decimal-pad" /></View><View style={styles.half}><Input label="Dew heaters watts" value={form.dew} onChangeText={(v) => update("dew", v)} keyboardType="decimal-pad" /></View></View>
      <Input label="Other accessories watts" value={form.accessories} onChangeText={(v) => update("accessories", v)} keyboardType="decimal-pad" />
      <Text style={styles.note}>{power.loadWatts.toFixed(0)} W continuous load · {(power.coldFactor * 100).toFixed(0)}% estimated cold-weather battery capacity</Text>
    </Card>
    <SectionHeader title="Camera storage" />
    <Card>
      <View style={styles.row}><View style={styles.half}><Input label="Free storage GB" value={form.storage} onChangeText={(v) => update("storage", v)} keyboardType="decimal-pad" /></View><View style={styles.half}><Input label="Frame size MB" value={form.frameSize} onChangeText={(v) => update("frameSize", v)} keyboardType="decimal-pad" /></View></View>
      <View style={styles.row}><View style={styles.half}><Input label="Exposure seconds" value={form.exposure} onChangeText={(v) => update("exposure", v)} keyboardType="decimal-pad" /></View><View style={styles.half}><Input label="Overhead seconds" value={form.overhead} onChangeText={(v) => update("overhead", v)} keyboardType="decimal-pad" /></View></View>
    </Card>
    <Button title={saved ? "Plan saved on this device" : "Save field power plan"} onPress={() => void save()} />
    <Text style={styles.disclaimer}>Battery performance varies with chemistry, age, cable loss and temperature. Keep a safety reserve and follow the battery manufacturer’s limits.</Text>
  </Screen>;
}

function Metric({ label, value, good }: { label: string; value: string; good: boolean }) {
  return <Card style={styles.metric}><Text style={styles.metricLabel}>{label}</Text><Text style={[styles.metricValue, !good && styles.metricWarning]}>{value}</Text></Card>;
}

const styles = createThemedStyles((colors) => ({
  back: { color: colors.blue, fontWeight: "700" },
  session: { borderColor: colors.gold },
  kicker: { color: colors.gold, fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  summary: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  metric: { flexGrow: 1, flexBasis: 100, minWidth: 0 },
  metricLabel: { color: colors.muted, fontSize: 9, fontWeight: "800" },
  metricValue: { color: colors.success, fontSize: 22, fontWeight: "900" },
  metricWarning: { color: colors.warning },
  verdict: { borderWidth: 2 },
  good: { borderColor: colors.success },
  warning: { borderColor: colors.warning },
  verdictTitle: { color: colors.text, fontSize: 19, fontWeight: "800" },
  row: { flexDirection: "row", gap: spacing.sm },
  half: { flex: 1, minWidth: 0 },
  action: { color: colors.gold, fontWeight: "800" },
  note: { color: colors.blue, fontSize: 12, lineHeight: 18 },
  disclaimer: { color: colors.muted, fontSize: 11, lineHeight: 16, textAlign: "center" },
}));
