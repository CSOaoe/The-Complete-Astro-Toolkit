import { useMemo, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Image } from "expo-image";
import { Pressable, Share, StyleSheet, Text, View } from "react-native";
import {
  Button,
  Card,
  Input,
  Screen,
  SectionHeader,
  uiStyles,
} from "@/components/ui";
import {
  formatDec,
  formatRa,
  getCatalogueObject,
  searchCatalogue,
} from "@/data/catalogue";
import { fieldOfView } from "@/utils/calculations";
import { mosaicDimensions, mosaicPanels } from "@/utils/mosaic";
import { surveyImageUrl } from "@/utils/surveyImages";
import { colors, createThemedStyles, radius, spacing } from "@/theme";
import { useAppData } from "@/context/AppDataContext";

export default function MosaicScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{targetId?:string;ra?:string;dec?:string;rotation?:string;focal?:string;sensorWidth?:string;sensorHeight?:string}>();
  const { equipment } = useAppData();
  const rig = equipment.rigs[0];
  const savedScope = equipment.telescopes.find((item) => item.id === rig?.telescopeId) ?? equipment.telescopes[0];
  const savedCamera = equipment.cameras.find((item) => item.id === rig?.cameraId) ?? equipment.cameras[0];
  const [targetId, setTargetId] = useState(params.targetId ?? "ic1805");
  const [customCenter, setCustomCenter] = useState(params.ra !== undefined && params.dec !== undefined && Number.isFinite(+params.ra) && Number.isFinite(+params.dec) ? { raHours:+params.ra, decDegrees:+params.dec } : null);
  const [query, setQuery] = useState("");
  const [focalOverride, setFocalOverride] = useState<string | null>(params.focal ?? null);
  const [sensorWidthOverride, setSensorWidthOverride] = useState<string | null>(params.sensorWidth ?? null);
  const [sensorHeightOverride, setSensorHeightOverride] = useState<string | null>(params.sensorHeight ?? null);
  const focal = focalOverride ?? String(savedScope?.focalLength ?? 480);
  const sensorWidth = sensorWidthOverride ?? String(savedCamera?.sensorWidth ?? 23.5);
  const sensorHeight = sensorHeightOverride ?? String(savedCamera?.sensorHeight ?? 15.7);
  const [panelCount, setPanelCount] = useState(4);
  const [overlap, setOverlap] = useState("20");
  const [rotation, setRotation] = useState(params.rotation ?? "0");
  const target = useMemo(() => { const t = getCatalogueObject(targetId); return t && customCenter ? {...t,...customCenter} : t; }, [targetId,customCenter]);
  const columns = Math.ceil(Math.sqrt(panelCount));
  const rows = Math.ceil(panelCount / columns);
  const matches = useMemo(
    () => (query.trim() ? searchCatalogue(query, "All", 8) : []),
    [query],
  );
  const plan = useMemo(() => {
    if (!target) return null;
    try {
      const panelWidth = fieldOfView(Number(sensorWidth), Number(focal));
      const panelHeight = fieldOfView(Number(sensorHeight), Number(focal));
      const dimensions = mosaicDimensions(
        panelWidth,
        panelHeight,
        columns,
        rows,
        Number(overlap),
      );
      const panels = mosaicPanels({
        centerRaHours: target.raHours,
        centerDecDegrees: target.decDegrees,
        panelWidthDegrees: panelWidth,
        panelHeightDegrees: panelHeight,
        columns,
        rows,
        overlapPercent: Number(overlap),
        rotationDegrees: Number(rotation) || 0,
      });
      return { panelWidth, panelHeight, dimensions, panels: panels.slice(0, panelCount) };
    } catch {
      return null;
    }
  }, [
    focal,
    overlap,
    rotation,
    columns,
    panelCount,
    rows,
    sensorHeight,
    sensorWidth,
    target,
  ]);
  const imageUrl =
    target && plan
      ? surveyImageUrl({
          raHours: target.raHours,
          decDegrees: target.decDegrees,
          fovDegrees: Math.max(plan.dimensions.width, plan.dimensions.height),
          width: 900,
          height: 900,
          rotationDegrees: Number(rotation) || 0,
        })
      : null;
  const share = () => {
    if (!target || !plan) return;
    const lines = plan.panels.map(
      (panel) =>
        `${panel.label}: ${formatRa(panel.raHours)}, ${formatDec(panel.decDegrees)}`,
    );
    void Share.share({
      message: `${target.name} mosaic — ${panelCount} panels, ${overlap}% overlap\n${lines.join("\n")}`,
    });
  };
  return (
    <Screen>
      <Pressable onPress={() => router.back()}>
        <Text style={styles.back}>‹ Tools</Text>
      </Pressable>
      <SectionHeader
        title="Mosaic planner"
        subtitle="Turn oversized targets into an overlap-safe panel plan"
      />
      <Input
        label="Find a target"
        value={query}
        onChangeText={setQuery}
        placeholder="Try Heart Nebula or M31"
      />
      {matches.map((item) => (
        <Pressable
          key={item.id}
          style={styles.match}
          onPress={() => {
            setTargetId(item.id);
            setCustomCenter(null);
            setQuery("");
          }}
        >
          <Text style={uiStyles.h3}>{item.name}</Text>
          <Text style={uiStyles.muted}>
            {item.catalogue} · {item.type}
          </Text>
        </Pressable>
      ))}
      <Card style={styles.preview}>
        <Text style={styles.gold}>{target?.name ?? "Choose a target"}</Text>
        <View style={styles.sky}>
          {imageUrl ? (
            <Image
              source={imageUrl}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              accessibilityLabel={`DSS2 mosaic preview for ${target?.name}`}
            />
          ) : null}
          {plan ? (
            <View
              style={[
                styles.grid,
                {
                  aspectRatio: plan.dimensions.width / plan.dimensions.height,
                  transform: [{ rotate: `${Number(rotation) || 0}deg` }],
                },
              ]}
            >
              {plan.panels.map((panel) => (
                <View
                  key={panel.label}
                  style={{
                    width: `${100 / columns}%`,
                    height: `${100 / rows}%`,
                    borderWidth: 1.5,
                    borderColor: colors.gold,
                    backgroundColor: "#D8B56A18",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={styles.panelLabel}>{panel.label}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
        {plan ? (
          <Text style={uiStyles.muted}>
            {plan.panels.length} panels · {plan.dimensions.width.toFixed(2)}° ×{" "}
            {plan.dimensions.height.toFixed(2)}° total field
          </Text>
        ) : (
          <Text style={styles.error}>
            Enter valid positive dimensions, 1–9 rows/columns and 0–99% overlap.
          </Text>
        )}
      </Card>
      <Card>
        <Input
          label="Focal length (mm)"
          value={focal}
          onChangeText={setFocalOverride}
          keyboardType="decimal-pad"
        />
        <View style={styles.row}>
          <View style={styles.half}>
            <Input
              label="Sensor width (mm)"
              value={sensorWidth}
              onChangeText={setSensorWidthOverride}
              keyboardType="decimal-pad"
            />
          </View>
          <View style={styles.half}>
            <Input
              label="Sensor height (mm)"
              value={sensorHeight}
              onChangeText={setSensorHeightOverride}
              keyboardType="decimal-pad"
            />
          </View>
        </View>
        <Text style={styles.controlLabel}>PANELS</Text>
        <View style={styles.panelControl}>
          <Pressable accessibilityLabel="Delete one mosaic panel" onPress={() => setPanelCount((value) => Math.max(1, value - 1))} style={styles.panelButton}><Text style={styles.panelButtonText}>−</Text></Pressable>
          <View style={styles.panelCount}><Text style={styles.panelCountValue}>{panelCount}</Text><Text style={styles.panelCountMeta}>{columns} × {rows} automatic layout</Text></View>
          <Pressable accessibilityLabel="Add one mosaic panel" onPress={() => setPanelCount((value) => Math.min(36, value + 1))} style={styles.panelButton}><Text style={styles.panelButtonText}>＋</Text></Pressable>
        </View>
        <View style={styles.row}>
          <View style={styles.half}>
            <Input
              label="Overlap (%)"
              value={overlap}
              onChangeText={setOverlap}
              keyboardType="decimal-pad"
            />
          </View>
          <View style={styles.half}>
            <Input
              label="Rotation (°)"
              value={rotation}
              onChangeText={setRotation}
              keyboardType="decimal-pad"
            />
          </View>
        </View>
      </Card>
      {plan ? (
        <>
          <SectionHeader
            title="Panel centres"
            subtitle="Use these coordinates in your capture software"
          />
          <Card>
            {plan.panels.map((panel) => (
              <View key={panel.label} style={styles.coordinate}>
                <Text style={styles.panelName}>{panel.label}</Text>
                <Text style={styles.coordinateText}>
                  {formatRa(panel.raHours)} · {formatDec(panel.decDegrees)}
                </Text>
              </View>
            ))}
          </Card>
          <Button title="Share panel plan" onPress={share} />
        </>
      ) : null}
      <Text style={styles.credit}>Background imagery: CDS Aladin DSS2.</Text>
    </Screen>
  );
}

const styles = createThemedStyles((colors) => ({
  back: { color: colors.blue, fontWeight: "700" },
  match: {
    padding: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  preview: { alignItems: "center" },
  gold: { color: colors.gold, fontWeight: "800", fontSize: 18 },
  sky: {
    width: 310,
    height: 310,
    backgroundColor: colors.input,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  grid: {
    width: "82%",
    maxHeight: "82%",
    flexDirection: "row",
    flexWrap: "wrap",
    borderWidth: 1,
    borderColor: colors.gold,
  },
  panelLabel: {
    color: colors.text,
    backgroundColor: "#050812AA",
    paddingHorizontal: 5,
    paddingVertical: 2,
    fontSize: 10,
    fontWeight: "800",
  },
  row: { flexDirection: "row", gap: spacing.sm },
  half: { flex: 1 },
  controlLabel: { color: colors.muted, fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  panelControl: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  panelButton: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, borderColor: colors.gold, alignItems: "center", justifyContent: "center", backgroundColor: colors.input },
  panelButtonText: { color: colors.gold, fontSize: 26, fontWeight: "800" },
  panelCount: { flex: 1, alignItems: "center" },
  panelCountValue: { color: colors.text, fontSize: 28, fontWeight: "800" },
  panelCountMeta: { color: colors.muted, fontSize: 11 },
  error: { color: colors.danger, textAlign: "center" },
  coordinate: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  panelName: { color: colors.gold, fontWeight: "800", width: 45 },
  coordinateText: { color: colors.text, flex: 1 },
  credit: { color: colors.muted, fontSize: 11, textAlign: "center" },
}));
