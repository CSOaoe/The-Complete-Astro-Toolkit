import { useState } from "react";
import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import {
  Button,
  Card,
  Input,
  Screen,
  SectionHeader,
  uiStyles,
} from "@/components/ui";
import { useAppData } from "@/context/AppDataContext";
import { targets } from "@/data/targets";
import { fetchAstroWeather } from "@/services/weather";
import { generateNightPlan, NightBlock } from "@/utils/nightPlan";
import { forecastFreshness } from "@/utils/forecast";
const localDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export default function NightPlanScreen() {
  const router = useRouter();
  const data = useAppData();
  const [date, setDate] = useState(localDate(new Date()));
  const [time, setTime] = useState("21:00");
  const [hours, setHours] = useState("6"),
    [sub, setSub] = useState("180"),
    [rigId, setRig] = useState("");
  const [blocks, setBlocks] = useState<NightBlock[]>([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [saved, setSaved] = useState(false);
  const [planRig, setPlanRig] = useState("");
  const [planSite, setPlanSite] = useState("");
  const [planRigId, setPlanRigId] = useState("");
  const rig =
    data.equipment.rigs.find((r) => r.id === rigId) ?? data.equipment.rigs[0];
  const generate = async () => {
    setBusy(true);
    setBlocks([]);
    setSaved(false);
    try {
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)
      )
        throw new Error("Enter a valid date and 24-hour time.");
      const start = new Date(`${date}T${time}:00`);
      if (localDate(start) !== date)
        throw new Error("That date does not exist.");
      const weather = await fetchAstroWeather(data.observer).catch(() => []);
      const result = generateNightPlan({
        targets,
        observer: data.observer,
        equipment: data.equipment,
        horizon: data.horizon,
        weather,
        start,
        hours: +hours,
        rigId: rig?.id ?? "",
        subSeconds: +sub,
      });
      setBlocks(result.blocks);
      setPlanRig(rig?.name ?? "");
      setPlanRigId(rig?.id ?? "");
      setPlanSite(data.observer.label);
      setStatus(
        `${result.blocks.length} capture blocks. ${result.skippedMinutes} minutes excluded for daylight, low targets or poor forecast. Forecast: ${forecastFreshness(weather[0])}.`,
      );
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Unable to create plan.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen>
      <SectionHeader
        title="Plan my night"
        subtitle={`For ${data.observer.label} · times use this device’s timezone`}
      />
      <Button
        title="Change observing location"
        variant="secondary"
        onPress={() => router.push("/location")}
      />
      <Card>
        <Input label="Date (YYYY-MM-DD)" value={date} onChangeText={setDate} />
        <Input label="Start time (HH:MM)" value={time} onChangeText={setTime} />
        <Input
          label="Available hours (1–16)"
          value={hours}
          onChangeText={setHours}
          keyboardType="decimal-pad"
        />
        <Input
          label="Starting sub-exposure (seconds)"
          value={sub}
          onChangeText={setSub}
          keyboardType="number-pad"
        />
        {data.equipment.rigs.map((r) => (
          <Button
            key={r.id}
            title={`${r.id === rig?.id ? "✓ " : ""}${r.name}`}
            variant="secondary"
            onPress={() => setRig(r.id)}
          />
        ))}
        <Text style={uiStyles.muted}>
          Exposure counts reserve five minutes for setup per target and five
          seconds between frames. Sub length is your starting estimate; check a
          test exposure for saturation and tracking.
        </Text>
      </Card>
      <Button
        title={busy ? "Planning…" : "Generate my night"}
        disabled={busy || data.loading}
        onPress={() => void generate()}
      />
      <Text style={uiStyles.muted} accessibilityLiveRegion="polite">
        {status}
      </Text>
      {blocks.map((b) => (
        <Card key={b.start}>
          <Text style={uiStyles.h3}>
            {new Date(b.start).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
            –
            {new Date(b.end).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}{" "}
            · {b.targetName}
          </Text>
          <Text style={uiStyles.body}>
            {b.frames} × {b.subSeconds}s · {b.fov} · score {b.score}/100
          </Text>
          <Text style={uiStyles.body}>{b.filters.join(" / ")}</Text>
          {b.reasons.map((r) => (
            <Text key={r} style={uiStyles.muted}>
              • {r}
            </Text>
          ))}
          <Button
            title="Preview framing"
            variant="secondary"
            onPress={() =>
              router.push({
                pathname: "/tools/framing",
                params: {
                  targetId: b.targetId,
                  ra: String(b.ra),
                  dec: String(b.dec),
                  rigId: planRigId,
                },
              })
            }
          />
        </Card>
      ))}
      {blocks.length ? (
        <View>
          <Button
            title={
              saved ? "Saved to sessions" : "Save all blocks to Imaging planner"
            }
            disabled={busy || saved}
            onPress={() => {
              setBusy(true);
              void data
                .saveSessions(
                  blocks.map((b) => {
                    const d = new Date(b.start);
                    return {
                      id: `auto-${b.targetId}-${d.getTime()}`,
                      date: localDate(d),
                      startTime: `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`,
                      targetId: b.targetId,
                      targetName: b.targetName,
                      durationMinutes:
                        (Date.parse(b.end) - d.getTime()) / 60000,
                      locationName: planSite,
                      rigName: planRig,
                      notes: `${b.frames} x ${b.subSeconds}s; ${b.filters.join(" / ")}; ${b.fov}\n${b.reasons.join(". ")}`,
                      status: "Planned",
                      createdAt: new Date().toISOString(),
                    };
                  }),
                )
                .then(() => setSaved(true))
                .catch(() =>
                  setStatus("Could not save sessions. Please try again."),
                )
                .finally(() => setBusy(false));
            }}
          />
        </View>
      ) : null}
    </Screen>
  );
}
