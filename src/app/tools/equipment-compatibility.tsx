import { useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { Card, Screen, SectionHeader, uiStyles } from "@/components/ui";
import { useAppData } from "@/context/AppDataContext";
import { correctorProfiles, evaluateRigCompatibility } from "@/data/equipmentCompatibility";
import { createThemedStyles, radius, spacing } from "@/theme";

export default function EquipmentCompatibilityScreen() {
  const router = useRouter();
  const { equipment } = useAppData();
  const [rigId, setRigId] = useState(equipment.rigs[0]?.id ?? "");
  const [correctorId, setCorrectorId] = useState(correctorProfiles[0].id);
  const rig = equipment.rigs.find((item) => item.id === rigId) ?? equipment.rigs[0];
  const telescope = equipment.telescopes.find((item) => item.id === rig?.telescopeId);
  const camera = equipment.cameras.find((item) => item.id === rig?.cameraId);
  const corrector = correctorProfiles.find((item) => item.id === correctorId) ?? correctorProfiles[0];
  const result = useMemo(() => telescope && camera ? evaluateRigCompatibility(telescope, camera, corrector) : null, [camera, corrector, telescope]);
  return <Screen>
    <Pressable onPress={() => router.back()}><Text style={styles.back}>‹ Equipment</Text></Pressable>
    <SectionHeader title="Equipment compatibility" subtitle="Image circle, threads, filters, sampling and reducer geometry" />
    <Card><Text style={styles.label}>SAVED RIG</Text><View style={styles.choices}>{equipment.rigs.map((item) => <Chip key={item.id} label={item.name} active={item.id === rig?.id} onPress={() => setRigId(item.id)} />)}</View></Card>
    <Card><Text style={styles.label}>CORRECTOR DATABASE</Text><View style={styles.choices}>{correctorProfiles.map((item) => <Chip key={item.id} label={item.name} active={item.id === corrector.id} onPress={() => setCorrectorId(item.id)} />)}</View><Text style={uiStyles.muted}>{corrector.telescopeThread} → {corrector.cameraThread} · {corrector.requiredBackFocusMm} mm back focus · {corrector.imageCircleMm} mm image circle</Text></Card>
    {result ? <>
      <View style={styles.grid}><Result label="IMAGE CIRCLE" value={result.imageCircleStatus} /><Result label="MARGIN" value={`${result.imageCircleMargin.toFixed(1)} mm`} /><Result label="PIXEL SCALE" value={`${result.pixelScale.toFixed(2)}″/px`} /><Result label="FILTER" value={result.filterSize} /></View>
      <Card><Text style={styles.label}>EFFECTIVE OPTICS</Text><Text style={styles.big}>{result.effectiveFocalLength.toFixed(0)} mm · f/{result.effectiveFocalRatio.toFixed(1)}</Text><Text style={uiStyles.body}>{result.horizontalFov.toFixed(2)}° × {result.verticalFov.toFixed(2)}° field · {result.diagonal.toFixed(1)} mm sensor diagonal</Text></Card>
      <Card style={result.imageCircleMargin < 0 ? styles.warning : styles.good}><Text style={uiStyles.h3}>{result.imageCircleMargin < 0 ? "Compatibility warning" : "Optical geometry compatible"}</Text><Text style={uiStyles.body}>{result.imageCircleMargin < 0 ? "The sensor is larger than this corrector's stated image circle, so edge illumination and star shape may suffer." : "The selected sensor fits inside the stated image circle. Confirm the manufacturer's exact spacing tolerance before buying adapters."}</Text></Card>
    </> : <Card><Text style={uiStyles.body}>Add a complete telescope and camera rig first.</Text></Card>}
  </Screen>;
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) { return <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}><Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text></Pressable>; }
function Result({ label, value }: { label: string; value: string }) { return <Card style={styles.result}><Text style={styles.label}>{label}</Text><Text style={styles.resultValue}>{value}</Text></Card>; }
const styles = createThemedStyles((colors) => ({ back: { color: colors.blue, fontWeight: "700" }, label: { color: colors.muted, fontSize: 10, fontWeight: "800", letterSpacing: 0.8 }, choices: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }, chip: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 9 }, chipActive: { backgroundColor: colors.gold, borderColor: colors.gold }, chipText: { color: colors.muted, fontWeight: "700", fontSize: 13 }, chipTextActive: { color: colors.background }, grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }, result: { width: "48%", minWidth: 0 }, resultValue: { color: colors.gold, fontSize: 17, fontWeight: "800" }, big: { color: colors.gold, fontSize: 23, fontWeight: "800" }, warning: { borderColor: colors.danger }, good: { borderColor: colors.success } }));
