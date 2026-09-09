import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import {
  Button,
  Card,
  EmptyState,
  LoadingState,
  Screen,
  SectionHeader,
  uiStyles,
} from "@/components/ui";
import { useAppData } from "@/context/AppDataContext";
import { WeatherConfidence } from "@/components/WeatherConfidence";
import { fetchAstroWeather, WeatherHour } from "@/services/weather";
import { colors, createThemedStyles, radius, spacing } from "@/theme";

export default function WeatherScreen() {
  const router = useRouter();
  const { observer } = useAppData();
  const [hours, setHours] = useState<WeatherHour[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const request = useRef({ generation: 0 });
  const load = useCallback(async () => {
    const generation = ++request.current.generation;
    setLoading(true);
    setError("");
    setHours([]);
    try {
      const forecast = await fetchAstroWeather(observer);
      if (generation === request.current.generation) setHours(forecast);
    } catch (reason) {
      if (generation === request.current.generation)
        setError(
          reason instanceof Error ? reason.message : "Forecast unavailable.",
        );
    } finally {
      if (generation === request.current.generation) setLoading(false);
    }
  }, [observer, request]);
  useEffect(() => {
    let active = true;
    const state = request.current;
    void Promise.resolve().then(() => {
      if (active) void load();
    });
    return () => {
      active = false;
      state.generation++;
    };
  }, [load, request]);
  const best = hours.reduce<WeatherHour | null>(
    (current, item) =>
      !current || item.score > current.score ? item : current,
    null,
  );
  return (
    <Screen>
      <Pressable onPress={() => router.back()}>
        <Text style={styles.back}>‹ Tonight</Text>
      </Pressable>
      <SectionHeader
        title="Weather & seeing"
        subtitle={`48-hour astronomy forecast for ${observer.label} · device local time`}
        action={
          <Pressable onPress={() => void load()}>
            <Text style={styles.refresh}>Refresh</Text>
          </Pressable>
        }
      />
      <WeatherConfidence hours={hours} />
      {loading ? (
        <LoadingState />
      ) : error ? (
        <EmptyState
          icon="☁"
          title="Forecast unavailable"
          message={error}
          action={
            <View style={{ marginTop: spacing.sm }}>
              <Button title="Try again" onPress={() => void load()} />
            </View>
          }
        />
      ) : (
        <>
          {best ? (
            <Card style={styles.best}>
              <Text style={styles.kicker}>BEST WINDOW</Text>
              <Text style={styles.bestTime}>
                {new Date(best.time).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}{" "}
                · {best.score}/100
              </Text>
              <Text style={uiStyles.muted}>
                {best.cloud}% cloud · seeing {best.seeing}/8 · transparency{" "}
                {best.transparency}/8
              </Text>
            </Card>
          ) : null}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.hours}
          >
            {hours.map((hour) => (
              <Card key={hour.time} style={styles.hour}>
                <Text style={styles.time}>
                  {new Date(hour.time).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
                <Text style={styles.weatherIcon}>
                  {hour.cloud < 20 ? "✦" : hour.cloud < 60 ? "☾" : "☁"}
                </Text>
                <Metric label="Cloud" value={`${hour.cloud}%`} />
                <Metric label="Seeing" value={`${hour.seeing}/8`} />
                <Metric label="Transp." value={`${hour.transparency}/8`} />
                <Metric label="Humidity" value={`${hour.humidity}%`} />
                <Metric label="Wind" value={`${hour.wind} km/h`} />
                <Text
                  style={[
                    styles.score,
                    {
                      color:
                        hour.score >= 70
                          ? colors.success
                          : hour.score >= 45
                            ? colors.warning
                            : colors.danger,
                    },
                  ]}
                >
                  {hour.score}
                </Text>
              </Card>
            ))}
          </ScrollView>
          <Card>
            <Text style={uiStyles.h3}>Forecast notes</Text>
            <Text style={uiStyles.muted}>
              Cloud, humidity, temperature, visibility and wind come from
              Open-Meteo. Seeing and transparency use 7Timer where available,
              with a weather-based fallback. Forecasts are guidance, not
              observatory measurements.
            </Text>
          </Card>
        </>
      )}
    </Screen>
  );
}
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}
const styles = createThemedStyles((colors) => ({
  back: { color: colors.blue, fontWeight: "700" },
  refresh: { color: colors.gold, fontWeight: "700" },
  best: { borderColor: colors.gold },
  kicker: {
    color: colors.gold,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  bestTime: { color: colors.text, fontSize: 25, fontWeight: "800" },
  hours: { gap: spacing.sm },
  hour: { width: 145, padding: 13 },
  time: { color: colors.text, fontWeight: "800", textAlign: "center" },
  weatherIcon: { color: colors.gold, fontSize: 27, textAlign: "center" },
  metricLabel: { color: colors.muted, fontSize: 9, textTransform: "uppercase" },
  metricValue: { color: colors.text, fontWeight: "600" },
  score: {
    alignSelf: "center",
    borderRadius: radius.pill,
    fontSize: 22,
    fontWeight: "800",
  },
}));
