import { useMemo, useState } from "react";
import { Text, View, useWindowDimensions } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import {
  Button,
  Card,
  Input,
  Screen,
  SectionHeader,
  Workspace,
  uiStyles,
} from "@/components/ui";
import { useAppData } from "@/context/AppDataContext";
import { searchCatalogue } from "@/data/catalogue";
import { CatalogueObject } from "@/types";
import { CometTrack, fetchCometTrack } from "@/services/cometTrack";
import { trackOffset, trackingRate, trailingLimit } from "@/utils/cometTrack";
import { fieldOfView, pixelScale } from "@/utils/calculations";
import { surveyImageUrl } from "@/utils/surveyImages";
import { colors } from "@/theme";
export default function CometTrackingScreen() {
  const { observer, equipment } = useAppData();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [query, setQuery] = useState(""),
    [comet, setComet] = useState<CatalogueObject | null>(null),
    [start, setStart] = useState(new Date().toISOString().slice(0, 16)),
    [hours, setHours] = useState("6"),
    [tolerance, setTolerance] = useState("1"),
    [selectedRig, setRig] = useState("");
  const [track, setTrack] = useState<CometTrack | null>(null),
    [status, setStatus] = useState(""),
    [busy, setBusy] = useState(false),
    [failed, setFailed] = useState(false);
  const matches = useMemo(
    () => (query.trim() ? searchCatalogue(query, "All", 10, "Comets") : []),
    [query],
  );
  const rig =
      equipment.rigs.find((r) => r.id === selectedRig) ?? equipment.rigs[0],
    scope = equipment.telescopes.find((s) => s.id === rig?.telescopeId),
    camera = equipment.cameras.find((c) => c.id === rig?.cameraId);
  let hf = 2,
    vf = 1.5,
    scale = 1;
  let validRig = false;
  try {
    if (scope && camera) {
      hf = fieldOfView(camera.sensorWidth, scope.focalLength);
      vf = fieldOfView(camera.sensorHeight, scope.focalLength);
      scale = pixelScale(camera.pixelSize, scope.focalLength);
      validRig = true;
    }
  } catch {
    /* Equipment warning shown below. */
  }
  const origin = track?.points[0];
  const maxRate = track
    ? Math.max(
        ...track.points
          .slice(1)
          .map((p, i) => trackingRate(track.points[i], p)),
      )
    : 0;
  let limit: number | null = null;
  try {
    limit = trailingLimit(maxRate, scale, +tolerance);
  } catch {
    /* Show validation on input. */
  }
  const size = Math.max(
    200,
    Math.min(520, width >= 900 ? width * 0.48 : width - 82),
  );
  const url = origin
    ? surveyImageUrl({
        raHours: origin.ra,
        decDegrees: origin.dec,
        fovDegrees: Math.max(hf, vf) * 1.3,
        width: 900,
        height: 900,
      })
    : null;
  const field = Math.max(hf, vf) * 1.3;
  return (
    <Screen>
      <SectionHeader
        title="Comet tracking"
        subtitle={`JPL Horizons · ${observer.label} · topocentric ICRF positions`}
      />
      <Input
        label="Find a comet"
        value={query}
        onChangeText={setQuery}
        placeholder="Halley, Encke, 2026…"
      />
      {matches
        .filter((m) => m.objectKind === "comet")
        .map((m) => (
          <Button
            key={m.id}
            title={m.name}
            variant="secondary"
            onPress={() => {
              setComet(m);
              setQuery("");
              setTrack(null);
            }}
          />
        ))}
      <Workspace
        preview={
          <Card>
            {url && origin ? (
              <>
                <View
                  style={{
                    width: size,
                    height: size,
                    overflow: "hidden",
                    backgroundColor: colors.input,
                  }}
                >
                  {!failed ? (
                    <Image
                      source={url}
                      style={{ width: "100%", height: "100%" }}
                      onError={() => setFailed(true)}
                    />
                  ) : null}
                  <View
                    pointerEvents="none"
                    style={{
                      position: "absolute",
                      left: ((1 - hf / field) * size) / 2,
                      top: ((1 - vf / field) * size) / 2,
                      width: (size * hf) / field,
                      height: (size * vf) / field,
                      borderWidth: 2,
                      borderColor: colors.gold,
                    }}
                  />
                  {track?.points.map((p, i) => {
                    const o = trackOffset(p, origin),
                      x = 0.5 - o.east / field,
                      y = 0.5 - o.north / field;
                    return x >= 0 && x <= 1 && y >= 0 && y <= 1 ? (
                      <Text
                        key={p.time}
                        style={{
                          position: "absolute",
                          left: x * size - 5,
                          top: y * size - 8,
                          color: colors.gold,
                          fontWeight: "900",
                        }}
                      >
                        {i === 0 ? "☄" : "•"}
                      </Text>
                    ) : null;
                  })}
                </View>
                <Text style={uiStyles.muted}>
                  Gold dots: 30-minute positions. Gold box: your rig’s field.
                  North up, east left. Archival DSS2 image, not a current comet
                  photograph.
                </Text>
              </>
            ) : (
              <Text style={uiStyles.muted}>
                Choose a comet and load its path.
              </Text>
            )}
          </Card>
        }
        controls={
          <Card>
            <Text style={uiStyles.h3}>{comet?.name ?? "Choose a comet"}</Text>
            <Input
              label="Start (UTC, YYYY-MM-DDTHH:MM)"
              value={start}
              onChangeText={setStart}
            />
            <Input
              label="Hours (1–16)"
              value={hours}
              onChangeText={setHours}
              keyboardType="decimal-pad"
            />
            <Input
              label="Allowed trailing (pixels)"
              value={tolerance}
              onChangeText={setTolerance}
              keyboardType="decimal-pad"
            />
            {equipment.rigs.map((r) => (
              <Button
                key={r.id}
                title={`${rig?.id === r.id ? "✓ " : ""}${r.name}`}
                variant="secondary"
                onPress={() => setRig(r.id)}
              />
            ))}
            <Button
              title={busy ? "Loading JPL ephemeris…" : "Load comet path"}
              disabled={busy || !comet}
              onPress={() => {
                setBusy(true);
                setTrack(null);
                setFailed(false);
                void fetchCometTrack(
                  comet!.catalogue,
                  observer,
                  new Date(start + "Z"),
                  +hours,
                )
                  .then((t) => {
                    setTrack(t);
                    setStatus(
                      `${t.cached ? "Cached" : "Downloaded"} ${new Date(t.fetchedAt).toLocaleString()} · ${t.site}`,
                    );
                  })
                  .catch((e) =>
                    setStatus(
                      e instanceof Error
                        ? e.message
                        : "Comet service unavailable.",
                    ),
                  )
                  .finally(() => setBusy(false));
              }}
            />
            <Text style={uiStyles.muted}>{status}</Text>
            {track ? (
              <>
                <Text style={uiStyles.body}>
                  Maximum sampled motion: {(maxRate * 60).toFixed(3)}″/minute
                </Text>
                <Text style={uiStyles.body}>
                  {validRig
                    ? limit !== null
                      ? `Estimated ${limit.toFixed(1)}s for ${tolerance} pixels of comet trailing while tracking stars.`
                      : "Enter a positive tolerance; motion may be too small to resolve."
                    : "Add a telescope and camera to a rig for exposure guidance."}
                </Text>
                <Text style={uiStyles.muted}>
                  This estimate only covers comet motion, not mount error or
                  seeing. Paths are sampled every 30 minutes. Refresh before
                  imaging.
                </Text>
              </>
            ) : null}
          </Card>
        }
      />
      {track?.points.map((p) => (
        <Card key={p.time}>
          <Text style={uiStyles.body}>
            {new Date(p.time).toLocaleString()} · RA {p.ra.toFixed(6)}h · Dec{" "}
            {p.dec.toFixed(6)}°
          </Text>
          <Button
            title="Frame this position"
            variant="secondary"
            onPress={() =>
              router.push({
                pathname: "/tools/framing",
                params: {
                  targetId: comet?.id,
                  ra: String(p.ra),
                  dec: String(p.dec),
                  rigId: rig?.id,
                },
              })
            }
          />
        </Card>
      ))}
    </Screen>
  );
}
