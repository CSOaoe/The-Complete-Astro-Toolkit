import { useEffect, useState } from "react";
import { Text } from "react-native";
import { Button, Card, Input, uiStyles } from "./ui";
import { WeatherHour } from "@/services/weather";
import { useAppData } from "@/context/AppDataContext";
import { useSavedList } from "@/hooks/useSavedList";
import { forecastFreshness } from "@/utils/forecast";
interface Observation {
  id: string;
  time: string;
  site: string;
  latitude: number;
  longitude: number;
  cloud: number;
  seeing: number;
  notes: string;
  predictedCloud?: number;
  predictedSeeing?: number;
}
export function WeatherConfidence({ hours }: { hours: WeatherHour[] }) {
  const { observer } = useAppData();
  const saved = useSavedList<Observation>("@astrotoolkit/weather-observations");
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, []);
  const [cloud, setCloud] = useState(""),
    [seeing, setSeeing] = useState(""),
    [notes, setNotes] = useState(""),
    [status, setStatus] = useState("");
  const closest = [...hours].sort(
    (a, b) =>
      Math.abs(Date.parse(a.time) - now.getTime()) -
      Math.abs(Date.parse(b.time) - now.getTime()),
  )[0];
  return (
    <Card>
      <Text style={uiStyles.h3}>Forecast confidence</Text>
      <Text style={uiStyles.body}>{forecastFreshness(hours[0], now)}</Text>
      <Text style={uiStyles.muted}>
        Open-Meteo weather forecast. Seeing:{" "}
        {closest?.seeingSource ?? "source unknown"}. Quality scale 1–8: higher
        is better. Model predictions and weather estimates are not measured
        seeing. Freshness is time since download, not the weather model’s issue
        time.
      </Text>
      {hours.some((h) => h.cached) ? (
        <Text style={uiStyles.body}>
          Offline cache in use. Conditions may have changed; refresh before
          relying on this forecast.
        </Text>
      ) : null}
      <Text style={uiStyles.h3}>Record actual conditions</Text>
      <Input
        label="Observed cloud (%)"
        value={cloud}
        onChangeText={setCloud}
        keyboardType="decimal-pad"
      />
      <Input
        label="Observed seeing quality (1 poor – 8 excellent)"
        value={seeing}
        onChangeText={setSeeing}
        keyboardType="number-pad"
      />
      <Input
        label="Conditions notes"
        value={notes}
        onChangeText={setNotes}
        multiline
      />
      <Button
        title="Save observation"
        disabled={!saved.ready}
        onPress={() => {
          if (
            !cloud.trim() ||
            !seeing.trim() ||
            !Number.isFinite(+cloud) ||
            +cloud < 0 ||
            +cloud > 100 ||
            !Number.isInteger(+seeing) ||
            +seeing < 1 ||
            +seeing > 8
          ) {
            setStatus("Enter cloud from 0–100 and seeing from 1–8.");
            return;
          }
          const matched =
            closest &&
            Math.abs(Date.parse(closest.time) - Date.now()) <= 3600000
              ? closest
              : null;
          void saved
            .update((old) =>
              [
                {
                  id: String(Date.now()),
                  time: new Date().toISOString(),
                  site: observer.label,
                  latitude: observer.latitude,
                  longitude: observer.longitude,
                  cloud: +cloud,
                  seeing: +seeing,
                  notes,
                  predictedCloud: matched?.cloud,
                  predictedSeeing: matched?.seeing,
                },
                ...old,
              ].slice(0, 1000),
            )
            .then(() => {
              setStatus("Conditions saved.");
              setNotes("");
            })
            .catch(() => setStatus("Could not save conditions."));
        }}
      />
      <Text style={uiStyles.muted}>{status}</Text>
      {saved.items
        .filter(
          (o) =>
            Math.abs(o.latitude - observer.latitude) < 0.01 &&
            Math.abs(o.longitude - observer.longitude) < 0.01,
        )
        .slice(0, 5)
        .map((o) => (
          <Text key={o.id} style={uiStyles.body}>
            {new Date(o.time).toLocaleString()}: cloud {o.cloud}%
            {o.predictedCloud !== undefined
              ? ` (forecast ${o.predictedCloud}%, difference ${Math.round(o.cloud - o.predictedCloud)} points)`
              : " (no matching forecast)"}
            ; seeing {o.seeing}/8
            {o.predictedSeeing !== undefined
              ? ` (forecast ${o.predictedSeeing}/8)`
              : ""}
            . {o.notes}
          </Text>
        ))}
    </Card>
  );
}
