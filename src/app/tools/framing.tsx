import { useMemo, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Text, View, useWindowDimensions } from "react-native";
import {
  Button,
  Card,
  CollapsibleCard,
  Input,
  Screen,
  SectionHeader,
  Workspace,
  uiStyles,
} from "@/components/ui";
import { FramingCanvas } from "@/components/FramingCanvas";
import { useAppData } from "@/context/AppDataContext";
import { getCatalogueObject, searchCatalogue } from "@/data/catalogue";
import { fieldOfView, pixelScale } from "@/utils/calculations";
import { Composition, validComposition } from "@/utils/compositions";
import { useSavedList } from "@/hooks/useSavedList";

export default function FramingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    targetId?: string;
    ra?: string;
    dec?: string;
    rotation?: string;
    rigId?: string;
    focal?: string;
    sensorWidth?: string;
    sensorHeight?: string;
  }>();
  const { equipment } = useAppData();
  const { width } = useWindowDimensions();
  const library = useSavedList<Composition>("@astrotoolkit/compositions");
  const [history, setHistory] = useState<Composition[]>(() => {
    const rig =
      equipment.rigs.find((r) => r.id === params.rigId) ?? equipment.rigs[0];
    const scope =
      equipment.telescopes.find((s) => s.id === rig?.telescopeId) ??
      equipment.telescopes[0];
    const camera =
      equipment.cameras.find((c) => c.id === rig?.cameraId) ??
      equipment.cameras[0];
    const target = getCatalogueObject(params.targetId ?? "m31");
    const c: Composition = {
      id: "draft",
      name: target?.name ?? "Composition",
      targetId: target?.id ?? "m31",
      rigId: rig?.id ?? "",
      createdAt: new Date().toISOString(),
      ra: params.ra !== undefined ? +params.ra : (target?.raHours ?? 0),
      dec: params.dec !== undefined ? +params.dec : (target?.decDegrees ?? 0),
      rotation: Number(params.rotation) || 0,
      focal: Number(params.focal) || scope?.focalLength || 480,
      sensorWidth: Number(params.sensorWidth) || camera?.sensorWidth || 23.5,
      sensorHeight: Number(params.sensorHeight) || camera?.sensorHeight || 15.7,
      pixelSize: camera?.pixelSize || 3.76,
    };
    const fallback = {
      ...c,
      ra: target?.raHours ?? 0,
      dec: target?.decDegrees ?? 0,
      focal: 480,
      sensorWidth: 23.5,
      sensorHeight: 15.7,
      pixelSize: 3.76,
      rotation: 0,
    };
    return [validComposition(c) ? c : fallback];
  });
  const [index, setIndex] = useState(0),
    [revision, setRevision] = useState(0);
  const frame = history[index];
  const [query, setQuery] = useState(""),
    [status, setStatus] = useState(""),
    [overlay, setOverlay] = useState<string>(),
    [opacity, setOpacity] = useState(0.4);
  const matches = useMemo(
    () => (query.trim() ? searchCatalogue(query, "All", 8) : []),
    [query],
  );
  const commit = (next: Composition, rebase = true) => {
    if (!validComposition(next)) {
      setStatus(
        "Use positive optical values, RA 0–24h and Dec −89.9 to 89.9°.",
      );
      return;
    }
    const past = history.slice(0, index + 1).slice(-49);
    setHistory([...past, next]);
    setIndex(past.length);
    if (rebase) setRevision((v) => v + 1);
  };
  const hf = fieldOfView(frame.sensorWidth, frame.focal),
    vf = fieldOfView(frame.sensorHeight, frame.focal);
  const canvasWidth = Math.max(
    200,
    Math.min(
      680,
      width >= 900 ? (Math.min(width, 1400) - 110) * 0.574 : width - 82,
    ),
  );
  const controls = (
    <>
      <CollapsibleCard title="Composition">
        <Input
          label="Composition name"
          value={frame.name}
          onChangeText={(name) => commit({ ...frame, name }, false)}
        />
        {equipment.rigs.map((r) => (
          <Button
            key={r.id}
            title={`${frame.rigId === r.id ? "✓ " : ""}${r.name}`}
            variant="secondary"
            onPress={() => {
              const s = equipment.telescopes.find(
                  (v) => v.id === r.telescopeId,
                ),
                c = equipment.cameras.find((v) => v.id === r.cameraId);
              if (s && c)
                commit({
                  ...frame,
                  rigId: r.id,
                  focal: s.focalLength,
                  sensorWidth: c.sensorWidth,
                  sensorHeight: c.sensorHeight,
                  pixelSize: c.pixelSize,
                });
              else setStatus("This rig needs a saved telescope and camera.");
            }}
          />
        ))}
        {(
          [
            ["focal", "Focal length (mm)"],
            ["sensorWidth", "Sensor width (mm)"],
            ["sensorHeight", "Sensor height (mm)"],
            ["pixelSize", "Pixel size (µm)"],
            ["rotation", "Rotation (°)"],
            ["ra", "Centre RA (hours)"],
            ["dec", "Centre Dec (degrees)"],
          ] as const
        ).map(([key, label]) => (
          <NumericSetting
            key={`${revision}-${key}-${frame[key]}`}
            label={label}
            value={frame[key]}
            save={(value) => commit({ ...frame, [key]: value })}
          />
        ))}
        <Text style={uiStyles.body}>
          {hf.toFixed(3)}° × {vf.toFixed(3)}° ·{" "}
          {pixelScale(frame.pixelSize, frame.focal).toFixed(2)}″/pixel
        </Text>
      </CollapsibleCard>
      <CollapsibleCard title="Previous-image reference">
        <Button
          title="Choose your previous image"
          variant="secondary"
          onPress={() => {
            void ImagePicker.launchImageLibraryAsync({
              mediaTypes: ["images"],
              quality: 0.8,
            })
              .then((result) => {
                if (!result.canceled) setOverlay(result.assets[0].uri);
              })
              .catch(() => setStatus("Could not open image picker."));
          }}
        />
        <Text style={uiStyles.muted}>
          Manual reference overlay fitted to the camera frame. Use an image from
          the same framing; it is not automatically plate-registered.
        </Text>
        {overlay ? (
          <>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {[0.2, 0.4, 0.6, 0.8].map((n) => (
                <Button
                  key={n}
                  title={`${Math.round(n * 100)}%`}
                  variant="secondary"
                  onPress={() => setOpacity(n)}
                />
              ))}
            </View>
            <Button
              title="Remove overlay"
              variant="secondary"
              onPress={() => setOverlay(undefined)}
            />
          </>
        ) : null}
      </CollapsibleCard>
      <Button
        title="Save composition"
        disabled={!library.ready}
        onPress={() =>
          void library
            .update((old) =>
              [
                {
                  ...frame,
                  id: `composition-${Date.now()}`,
                  createdAt: new Date().toISOString(),
                },
                ...old,
              ].slice(0, 200),
            )
            .then(() => setStatus("Composition saved."))
            .catch(() => setStatus("Could not save composition."))
        }
      />
      <Button
        title="Use this framing in Mosaic planner"
        onPress={() =>
          router.push({
            pathname: "/tools/mosaic",
            params: {
              targetId: frame.targetId,
              ra: String(frame.ra),
              dec: String(frame.dec),
              rotation: String(frame.rotation),
              focal: String(frame.focal),
              sensorWidth: String(frame.sensorWidth),
              sensorHeight: String(frame.sensorHeight),
            },
          })
        }
      />
      <Button
        title="Point mount at this frame"
        variant="secondary"
        onPress={() =>
          router.push({
            pathname: "/observatory" as never,
            params: { ra: String(frame.ra), dec: String(frame.dec) },
          })
        }
      />
      <Button
        title="Plan an imaging session"
        variant="secondary"
        onPress={() =>
          router.push({
            pathname: "/planner",
            params: {
              targetName: frame.name,
              targetId: frame.targetId,
              rigName: equipment.rigs.find((r) => r.id === frame.rigId)?.name,
              notes: `Framing RA ${frame.ra.toFixed(6)}h Dec ${frame.dec.toFixed(6)}° rotation ${frame.rotation.toFixed(1)}°; ${hf.toFixed(3)} x ${vf.toFixed(3)} degrees`,
            },
          })
        }
      />
    </>
  );
  return (
    <Screen>
      <SectionHeader
        title="Visual framing workspace"
        subtitle="Saved compositions, gestures and connected imaging plans"
      />
      <Input
        label="Find a target or comet"
        value={query}
        onChangeText={setQuery}
        autoCapitalize="none"
        placeholder="M 13, Messier 13, SH2-185…"
      />
      {matches.map((t) => (
        <Button
          key={t.id}
          title={`${t.name} · ${t.catalogue}`}
          variant="secondary"
          onPress={() => {
            commit({
              ...frame,
              targetId: t.id,
              name: t.name,
              ra: t.raHours,
              dec: t.decDegrees,
            });
            setQuery("");
          }}
        />
      ))}
      <Workspace
        preview={
          <Card>
            <Text style={uiStyles.h3}>{frame.name}</Text>
            <FramingCanvas
              key={`${revision}-${canvasWidth}-${frame.focal}-${frame.sensorWidth}-${frame.sensorHeight}`}
              ra={frame.ra}
              dec={frame.dec}
              rotation={frame.rotation}
              horizontalFov={hf}
              verticalFov={vf}
              width={canvasWidth}
              overlay={overlay}
              opacity={opacity}
              onChange={(next) => commit({ ...frame, ...next }, false)}
            />
            <View style={{ flexDirection: "row", gap: 12 }}>
              <Button
                title="Undo"
                disabled={index === 0}
                variant="secondary"
                onPress={() => {
                  setIndex(index - 1);
                  setRevision((v) => v + 1);
                }}
              />
              <Button
                title="Redo"
                disabled={index === history.length - 1}
                variant="secondary"
                onPress={() => {
                  setIndex(index + 1);
                  setRevision((v) => v + 1);
                }}
              />
              <Button
                title="Recentre view"
                variant="secondary"
                onPress={() => setRevision((v) => v + 1)}
              />
            </View>
            <Text style={uiStyles.muted}>
              Archival DSS2 survey, CDS Aladin. Comets are not visible in
              historical survey images; use Comet tracking for their predicted
              path.
            </Text>
          </Card>
        }
        controls={controls}
      />
      <Text style={uiStyles.muted} accessibilityLiveRegion="polite">
        {status}
      </Text>
      <CollapsibleCard title="Saved compositions">
        {library.items.filter(validComposition).map((c) => (
          <Card key={c.id}>
            <Text style={uiStyles.h3}>{c.name}</Text>
            <Text style={uiStyles.muted}>
              {c.ra.toFixed(4)}h, {c.dec.toFixed(4)}° ·{" "}
              {new Date(c.createdAt).toLocaleDateString()}
            </Text>
            <Button title="Load composition" onPress={() => commit(c)} />
            <Button
              title="Delete saved composition"
              variant="secondary"
              onPress={() =>
                void library
                  .update((old) => old.filter((v) => v.id !== c.id))
                  .catch(() => setStatus("Could not delete composition."))
              }
            />
          </Card>
        ))}
        {!library.items.length ? (
          <Text style={uiStyles.muted}>
            Save a frame above to return to it on another night.
          </Text>
        ) : null}
      </CollapsibleCard>
    </Screen>
  );
}
function NumericSetting({
  label,
  value,
  save,
}: {
  label: string;
  value: number;
  save(v: number): void;
}) {
  const [text, setText] = useState(String(value));
  return (
    <Input
      label={label}
      value={text}
      onChangeText={setText}
      onEndEditing={() => {
        if (text.trim() && Number.isFinite(+text)) save(+text);
        else setText(String(value));
      }}
      keyboardType="numbers-and-punctuation"
    />
  );
}
