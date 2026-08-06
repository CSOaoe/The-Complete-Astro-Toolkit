import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { Button, Card, Input, Screen, SectionHeader, uiStyles } from "@/components/ui";
import { useAppData } from "@/context/AppDataContext";
import { searchCatalogue } from "@/data/catalogue";
import { ImagingCampaign } from "@/types";
import { planCampaignNights } from "@/utils/multiNight";
import { createThemedStyles, radius, spacing } from "@/theme";

const STORAGE = "@astrotoolkit/imaging-campaigns";

export default function MultiNightScreen() {
  const router = useRouter();
  const { observer, equipment, horizon } = useAppData();
  const [campaigns, setCampaigns] = useState<ImagingCampaign[]>([]);
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState("");
  const [targetId, setTargetId] = useState("");
  const [targetName, setTargetName] = useState("");
  const [required, setRequired] = useState("12");
  const [captured, setCaptured] = useState("0");
  const [nights, setNights] = useState("14");
  const [rigId, setRigId] = useState(equipment.rigs[0]?.id ?? "");
  const matches = useMemo(() => query.trim() ? searchCatalogue(query, "All", 6) : [], [query]);
  useEffect(() => { AsyncStorage.getItem(STORAGE).then((value) => value && setCampaigns(JSON.parse(value) as ImagingCampaign[])).catch(() => undefined); }, []);
  const persist = (next: ImagingCampaign[]) => { setCampaigns(next); void AsyncStorage.setItem(STORAGE, JSON.stringify(next)); };
  const save = () => {
    if (!targetId || Number(required) <= 0) return;
    const campaign: ImagingCampaign = { id: `campaign-${Date.now()}`, targetId, targetName, rigId, requiredHours: Number(required), capturedHours: Math.max(0, Number(captured) || 0), nightsToPlan: Math.max(3, Math.min(60, Number(nights) || 14)), createdAt: new Date().toISOString() };
    persist([campaign, ...campaigns]); setCreating(false); setQuery(""); setTargetId(""); setTargetName("");
  };
  const updateCaptured = (campaign: ImagingCampaign, delta: number) => persist(campaigns.map((item) => item.id === campaign.id ? { ...item, capturedHours: Math.max(0, Math.min(item.requiredHours, item.capturedHours + delta)) } : item));
  return <Screen>
    <Pressable onPress={() => router.back()}><Text style={styles.back}>‹ Tools</Text></Pressable>
    <SectionHeader title="Multi-night projects" subtitle="Allocate integration time across the best upcoming Moon and altitude windows" action={!creating ? <Pressable onPress={() => setCreating(true)}><Text style={styles.add}>＋ New</Text></Pressable> : undefined} />
    {creating ? <Card>
      <Input label="Find target" value={query} onChangeText={setQuery} placeholder="M31, NGC 7000, Halley…" />
      {matches.map((item) => <Pressable key={item.id} onPress={() => { setTargetId(item.id); setTargetName(item.name); setQuery(item.name); }} style={[styles.match, targetId === item.id && styles.matchActive]}><Text style={styles.matchTitle}>{item.name}</Text><Text style={uiStyles.muted}>{item.catalogue} · {item.type}</Text></Pressable>)}
      <View style={styles.row}><View style={styles.half}><Input label="Required hours" value={required} onChangeText={setRequired} keyboardType="decimal-pad" /></View><View style={styles.half}><Input label="Already captured" value={captured} onChangeText={setCaptured} keyboardType="decimal-pad" /></View></View>
      <Input label="Nights to consider" value={nights} onChangeText={setNights} keyboardType="number-pad" />
      <Text style={styles.label}>IMAGING RIG</Text><View style={styles.choices}>{equipment.rigs.map((rig) => <Pressable key={rig.id} onPress={() => setRigId(rig.id)} style={[styles.chip, rig.id === rigId && styles.chipActive]}><Text style={[styles.chipText, rig.id === rigId && styles.chipTextActive]}>{rig.name}</Text></Pressable>)}</View>
      <Button title="Create multi-night project" onPress={save} disabled={!targetId} /><Button title="Cancel" variant="secondary" onPress={() => setCreating(false)} />
    </Card> : null}
    {!creating && !campaigns.length ? <Card><Text style={uiStyles.h3}>No multi-night projects yet</Text><Text style={uiStyles.body}>Create a target project and AstroToolkit will distribute the remaining hours across its strongest upcoming nights.</Text></Card> : null}
    {campaigns.map((campaign) => {
      const plan = planCampaignNights(campaign, observer, equipment, horizon);
      const percent = Math.round(Math.min(100, (campaign.capturedHours / campaign.requiredHours) * 100));
      return <Card key={campaign.id}>
        <View style={styles.head}><View style={styles.half}><Text style={uiStyles.h3}>{campaign.targetName}</Text><Text style={uiStyles.muted}>{campaign.capturedHours.toFixed(1)} / {campaign.requiredHours.toFixed(1)} hours · {percent}% complete</Text></View><Pressable onPress={() => persist(campaigns.filter((item) => item.id !== campaign.id))}><Text style={styles.delete}>Delete</Text></Pressable></View>
        <View style={styles.progress}><View style={[styles.progressFill, { width: `${percent}%` }]} /></View>
        <View style={styles.actions}><View style={styles.half}><Button title="− 0.5 h" variant="secondary" onPress={() => updateCaptured(campaign, -0.5)} /></View><View style={styles.half}><Button title="＋ 0.5 h" onPress={() => updateCaptured(campaign, 0.5)} /></View></View>
        <Text style={styles.label}>RECOMMENDED NIGHTS</Text>
        {plan.length ? plan.slice(0, 6).map((night) => <View key={night.date.toISOString()} style={styles.night}><View style={styles.half}><Text style={styles.nightDate}>{night.date.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" })}</Text><Text style={uiStyles.muted}>{night.reason} · Moon {night.moonIllumination}%</Text></View><View><Text style={styles.score}>{night.score}/100</Text><Text style={styles.hours}>{night.allocatedHours.toFixed(1)} h · {Math.round(night.peakAltitude)}°</Text></View></View>) : <Text style={uiStyles.muted}>No useful altitude window was found in this planning range.</Text>}
      </Card>;
    })}
  </Screen>;
}

const styles = createThemedStyles((colors) => ({ back: { color: colors.blue, fontWeight: "700" }, add: { color: colors.gold, fontWeight: "800" }, match: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 10 }, matchActive: { borderColor: colors.gold }, matchTitle: { color: colors.text, fontWeight: "700" }, row: { flexDirection: "row", gap: spacing.sm }, half: { flex: 1, minWidth: 0 }, label: { color: colors.muted, fontSize: 10, fontWeight: "800", letterSpacing: 0.8 }, choices: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }, chip: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 9 }, chipActive: { backgroundColor: colors.gold, borderColor: colors.gold }, chipText: { color: colors.muted, fontWeight: "700" }, chipTextActive: { color: colors.background }, head: { flexDirection: "row", alignItems: "center", gap: spacing.sm }, delete: { color: colors.danger, fontWeight: "700" }, progress: { height: 8, backgroundColor: colors.input, borderRadius: 4, overflow: "hidden" }, progressFill: { height: "100%", backgroundColor: colors.gold }, actions: { flexDirection: "row", gap: spacing.sm }, night: { flexDirection: "row", alignItems: "center", borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm }, nightDate: { color: colors.text, fontWeight: "700" }, score: { color: colors.gold, textAlign: "right", fontWeight: "800" }, hours: { color: colors.muted, textAlign: "right", fontSize: 12 } }));
