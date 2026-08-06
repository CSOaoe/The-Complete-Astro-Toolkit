import { useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { Button, Card, Input, Screen, SectionHeader, uiStyles } from "@/components/ui";
import { useAppData } from "@/context/AppDataContext";
import { pixelScale } from "@/utils/calculations";
import { analyseEquipmentTrain, samplingAssessment, TrainComponent } from "@/utils/equipmentTrain";
import { createThemedStyles, radius, spacing } from "@/theme";

const initialComponents: TrainComponent[] = [
  { id: "camera", name: "Camera sensor recess", thicknessMm: 17.5 },
  { id: "filter-wheel", name: "Filter wheel", thicknessMm: 20 },
  { id: "adapter", name: "Threaded adapter", thicknessMm: 10 },
];

export default function EquipmentTrainScreen() {
  const router = useRouter();
  const { equipment } = useAppData();
  const [rigId, setRigId] = useState(equipment.rigs[0]?.id ?? "");
  const [required, setRequired] = useState("55");
  const [components, setComponents] = useState(initialComponents);
  const rig = equipment.rigs.find((item) => item.id === rigId) ?? equipment.rigs[0];
  const scope = equipment.telescopes.find((item) => item.id === rig?.telescopeId);
  const camera = equipment.cameras.find((item) => item.id === rig?.cameraId);
  const analysis = useMemo(
    () => analyseEquipmentTrain(Math.max(0, Number(required) || 0), components),
    [components, required],
  );
  const scale = scope && camera ? pixelScale(camera.pixelSize, scope.focalLength) : null;
  const setThickness = (id: string, value: string) =>
    setComponents((current) =>
      current.map((component) =>
        component.id === id
          ? { ...component, thicknessMm: Math.max(0, Number(value) || 0) }
          : component,
      ),
    );
  const addSpacer = () =>
    setComponents((current) => [
      ...current,
      { id: `spacer-${Date.now()}`, name: `Spacer ${current.length - 2}`, thicknessMm: 1 },
    ]);

  return (
    <Screen>
      <Pressable onPress={() => router.back()}>
        <Text style={styles.back}>‹ Equipment</Text>
      </Pressable>
      <SectionHeader
        title="Optical train builder"
        subtitle="Check back-focus spacing and camera sampling before assembling the rig"
      />
      {equipment.rigs.length ? (
        <Card>
          <Text style={styles.label}>SAVED IMAGING RIG</Text>
          <View style={styles.rigs}>
            {equipment.rigs.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => setRigId(item.id)}
                style={[styles.rig, item.id === rig?.id && styles.rigActive]}
              >
                <Text style={[styles.rigText, item.id === rig?.id && styles.rigTextActive]}>
                  {item.name}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={uiStyles.muted}>
            {scope?.name ?? "No telescope"} · {camera?.name ?? "No camera"}
          </Text>
        </Card>
      ) : null}
      <Card>
        <Input
          label="Required back focus (mm)"
          value={required}
          onChangeText={setRequired}
          keyboardType="decimal-pad"
        />
        {components.map((component) => (
          <View key={component.id} style={styles.componentRow}>
            <View style={styles.componentInput}>
              <Input
                label={component.name}
                value={String(component.thicknessMm)}
                onChangeText={(value) => setThickness(component.id, value)}
                keyboardType="decimal-pad"
              />
            </View>
            <Pressable
              accessibilityLabel={`Remove ${component.name}`}
              onPress={() => setComponents((current) => current.filter((item) => item.id !== component.id))}
              style={styles.remove}
            >
              <Text style={styles.removeText}>×</Text>
            </Pressable>
          </View>
        ))}
        <Button title="Add 1 mm spacer" variant="secondary" onPress={addSpacer} />
      </Card>
      <View style={styles.results}>
        <Card style={styles.resultCard}>
          <Text style={styles.label}>TRAIN LENGTH</Text>
          <Text style={styles.resultValue}>{analysis.usedMm.toFixed(1)} mm</Text>
        </Card>
        <Card style={styles.resultCard}>
          <Text style={styles.label}>REMAINING</Text>
          <Text style={styles.resultValue}>{analysis.remainingMm.toFixed(1)} mm</Text>
        </Card>
      </View>
      <Card style={styles.statusCard}>
        <Text style={styles.status}>{analysis.status}</Text>
        <Text style={uiStyles.body}>{analysis.guidance}</Text>
      </Card>
      {scale !== null ? (
        <Card>
          <Text style={styles.label}>RIG COMPATIBILITY</Text>
          <Text style={styles.resultValue}>{scale.toFixed(2)}″ per pixel</Text>
          <Text style={uiStyles.body}>{samplingAssessment(scale)}</Text>
          <Text style={uiStyles.muted}>
            {scope?.focalLength} mm at f/{scope?.focalRatio} · {camera?.pixelSize} μm pixels
          </Text>
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = createThemedStyles((colors) => ({
  back: { color: colors.blue, fontWeight: "700" },
  label: { color: colors.muted, fontSize: 10, fontWeight: "800", letterSpacing: 0.8 },
  rigs: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  rig: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 8 },
  rigActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  rigText: { color: colors.muted, fontWeight: "700" },
  rigTextActive: { color: colors.background },
  componentRow: { flexDirection: "row", alignItems: "flex-end", gap: spacing.sm },
  componentInput: { flex: 1 },
  remove: { width: 46, height: 50, borderRadius: radius.md, backgroundColor: colors.surfaceElevated, alignItems: "center", justifyContent: "center", marginBottom: 0 },
  removeText: { color: colors.danger, fontSize: 25, fontWeight: "700" },
  results: { flexDirection: "row", gap: spacing.sm },
  resultCard: { flex: 1, minWidth: 0 },
  resultValue: { color: colors.gold, fontSize: 21, fontWeight: "800" },
  statusCard: { borderColor: colors.gold },
  status: { color: colors.gold, fontSize: 20, fontWeight: "800" },
}));
