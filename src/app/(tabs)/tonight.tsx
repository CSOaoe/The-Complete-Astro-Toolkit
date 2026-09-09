import { useEffect, useMemo, useState } from "react";
import { Href, useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";
import {
  Card,
  ErrorBanner,
  Header,
  Screen,
  SectionHeader,
  uiStyles,
} from "@/components/ui";
import { targets } from "@/data/targets";
import { useAppData } from "@/context/AppDataContext";
import { useFieldMode } from "@/context/FieldModeContext";
import { moonPhase } from "@/utils/astronomy";
import { fetchAstroWeather, WeatherHour } from "@/services/weather";
import { smartNightSchedule, smartTargetsTonight } from "@/utils/smartPlanning";
import { createThemedStyles, radius, spacing } from "@/theme";
import { forecastFreshness } from "@/utils/forecast";

function coordinate(value: number, positive: string, negative: string) {
  return `${Math.abs(value).toFixed(2)}°${value >= 0 ? positive : negative}`;
}

export default function TonightScreen() {
  const router = useRouter();
  const { favourites, toggleFavourite, observer, equipment, horizon, error } =
    useAppData();
  const { active: fieldModeActive, toggle: toggleFieldMode } = useFieldMode();
  const [weather, setWeather] = useState<WeatherHour[]>([]);
  const [weatherStatus, setWeatherStatus] = useState("Loading forecast…");
  const reference = useMemo(() => new Date(), []);
  useEffect(() => {
    let active = true;
    fetchAstroWeather(observer)
      .then((value) => {
        if (active) {
          setWeather(value);
          setWeatherStatus(forecastFreshness(value[0]));
        }
      })
      .catch(() => {
        if (active)
          setWeatherStatus("Forecast unavailable — astronomy score only");
      });
    return () => {
      active = false;
    };
  }, [observer]);
  const recommendations = useMemo(
    () =>
      smartTargetsTonight(
        targets,
        observer,
        weather,
        equipment,
        reference,
        5,
        horizon,
      ),
    [equipment, horizon, observer, reference, weather],
  );
  const schedule = useMemo(
    () =>
      smartNightSchedule(
        targets,
        observer,
        weather,
        equipment,
        reference,
        horizon,
      ),
    [equipment, horizon, observer, reference, weather],
  );
  const moon = useMemo(() => moonPhase(reference), [reference]);
  const date = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(reference);
  return (
    <Screen>
      <Header
        eyebrow="Plan the night"
        onSettings={() => router.push("/about")}
      />
      <View>
        <Text style={styles.date}>{date}</Text>
        <Text style={uiStyles.muted}>
          Recommendations update for your observing site
        </Text>
      </View>
      {error ? <ErrorBanner message={error} /> : null}
      <Pressable onPress={() => router.push("/monthly-guide" as Href)}>
        <Card style={styles.guideCard}>
          <Text style={styles.guideMonth}>AUGUST 2026 MONTHLY GUIDE</Text>
          <Text style={styles.guideTitle}>The Moon’s triple act</Text>
          <Text style={uiStyles.muted}>
            My targets, eclipse dates and Perseid plan — rewritten for
            AstroToolkit.
          </Text>
          <Text style={styles.guideLink}>Open my monthly guide ›</Text>
        </Card>
      </Pressable>
      <View style={styles.two}>
        <Pressable
          style={styles.half}
          onPress={() => router.push("/weather" as Href)}
        >
          <Card style={styles.shortcut}>
            <Text style={styles.shortcutIcon}>☁</Text>
            <Text style={styles.shortcutText}>Weather & seeing</Text>
          </Card>
        </Pressable>
        <Pressable
          style={styles.half}
          onPress={() => router.push("/planner" as Href)}
        >
          <Card style={styles.shortcut}>
            <Text style={styles.shortcutIcon}>◫</Text>
            <Text style={styles.shortcutText}>Imaging planner</Text>
          </Card>
        </Pressable>
      </View>
      <Pressable onPress={() => router.push("/space-weather" as Href)}>
        <Card style={styles.spaceWeather}>
          <Text style={styles.shortcutIcon}>◉</Text>
          <View style={styles.half}>
            <Text style={styles.kicker}>NOAA SPACE WEATHER</Text>
            <Text style={uiStyles.h3}>Aurora forecast, Kp, solar wind and Bz</Text>
          </View>
          <Text style={styles.change}>Open ›</Text>
        </Card>
      </Pressable>
      <Pressable onPress={() => router.push("/location" as Href)}>
        <Card style={styles.locationCard}>
          <View style={styles.pin}>
            <Text style={styles.pinText}>⌖</Text>
          </View>
          <View style={styles.half}>
            <Text style={styles.kicker}>OBSERVING FROM</Text>
            <Text style={styles.locationName}>{observer.label}</Text>
            <Text style={uiStyles.muted}>
              {coordinate(observer.latitude, "N", "S")} ·{" "}
              {coordinate(observer.longitude, "E", "W")}
            </Text>
          </View>
          <Text style={styles.change}>
            {observer.source === "default" ? "Set up ›" : "Change ›"}
          </Text>
        </Card>
      </Pressable>
      <SectionHeader title="Field operations" subtitle="Run the night, prepare offline and protect power" />
      <View style={styles.operationGrid}>
        <Operation title="Command Centre" subtitle="Live session" icon="▶" onPress={() => router.push("/session-command" as Href)} />
        <Operation title="Offline Pack" subtitle="No signal needed" icon="↓" onPress={() => router.push("/offline-pack" as Href)} />
        <Operation title="Power & Dew" subtitle="Runtime check" icon="⚡" onPress={() => router.push("/power-planner" as Href)} />
        <Operation title={fieldModeActive ? "Field Mode On" : "Field Mode"} subtitle="Red · dim · awake" icon="◐" active={fieldModeActive} onPress={() => void toggleFieldMode()} />
      </View>
      <Pressable onPress={() => router.push("/alerts" as Href)}>
        <Card style={styles.horizonCard}>
          <View style={styles.half}>
            <Text style={styles.kicker}>INTELLIGENT ALERT CENTRE</Text>
            <Text style={uiStyles.h3}>Clear sky, aurora, target and equipment alerts</Text>
            <Text style={uiStyles.muted}>Live rules for your location, rig and favourite targets.</Text>
          </View>
          <Text style={styles.change}>Open ›</Text>
        </Card>
      </Pressable>
      <Pressable onPress={() => router.push("/horizon" as Href)}>
        <Card style={styles.horizonCard}>
          <View style={styles.half}>
            <Text style={styles.kicker}>LOCAL HORIZON</Text>
            <Text style={uiStyles.h3}>
              {horizon.enabled
                ? `${horizon.label} enabled`
                : "Flat horizon assumed"}
            </Text>
            <Text style={uiStyles.muted}>
              {horizon.enabled
                ? "Smart scores exclude targets hidden by your skyline."
                : "Add trees, roofs and nearby obstructions for better recommendations."}
            </Text>
          </View>
          <Text style={styles.change}>Edit ›</Text>
        </Card>
      </Pressable>
      <Card style={styles.moon}>
        <View style={styles.moonIcon}>
          <Text style={styles.moonGlyph}>☾</Text>
        </View>
        <View style={styles.half}>
          <Text style={styles.kicker}>MOON TONIGHT</Text>
          <Text style={uiStyles.h3}>
            {moon.name} · {moon.illumination}%
          </Text>
          <Text style={uiStyles.muted}>Estimated illuminated fraction</Text>
        </View>
        <View
          style={[
            styles.rating,
            moon.rating === "BRIGHT" && styles.ratingBright,
          ]}
        >
          <Text
            style={[
              styles.ratingText,
              moon.rating === "BRIGHT" && styles.ratingBrightText,
            ]}
          >
            {moon.rating}
          </Text>
        </View>
      </Card>
      <SectionHeader
        title="Smart Best Tonight"
        subtitle={`Altitude + local horizon + Moon + rig fit + weather · ${weatherStatus}`}
      />
      {recommendations.map(
        ({
          target,
          altitude,
          score,
          moonSeparation,
          weatherScore,
          equipmentFit,
          reasons,
          at,
        }) => (
          <Pressable
            key={target.id}
            onPress={() => router.push(`/catalogue/${target.id}`)}
          >
            <Card>
              <View style={styles.targetHead}>
                <View style={styles.half}>
                  <Text style={styles.catalogue}>
                    {target.catalogue} · {target.type}
                  </Text>
                  <Text style={uiStyles.h3}>{target.name}</Text>
                  <Text style={uiStyles.muted}>{target.constellation}</Text>
                </View>
                <Pressable
                  accessibilityLabel={`${favourites.includes(target.id) ? "Remove" : "Add"} ${target.name} favourite`}
                  hitSlop={12}
                  onPress={() => void toggleFavourite(target.id)}
                >
                  <Text
                    style={[
                      styles.star,
                      favourites.includes(target.id) && styles.starActive,
                    ]}
                  >
                    ★
                  </Text>
                </Pressable>
              </View>
              <View style={styles.stats}>
                <Stat label="SMART SCORE" value={`${score}/100`} />
                <Stat label="ALTITUDE" value={`${Math.round(altitude)}°`} />
                <Stat
                  label="BEST TIME"
                  value={at.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                />
              </View>
              <View style={styles.breakdown}>
                <Text style={styles.breakdownText}>
                  Moon {Math.round(moonSeparation)}° away
                </Text>
                <Text style={styles.breakdownText}>
                  Weather {weatherScore ?? "—"}
                </Text>
                <Text style={styles.breakdownText}>
                  Rig fit {equipmentFit}/10
                </Text>
              </View>
              <Text style={uiStyles.muted}>
                {reasons.slice(0, 3).join(" · ")}
              </Text>
              <View style={styles.filters}>
                {target.filters.map((filter) => (
                  <Text key={filter} style={styles.filter}>
                    {filter}
                  </Text>
                ))}
              </View>
            </Card>
          </Pressable>
        ),
      )}
      <SectionHeader
        title="Your night plan"
        subtitle="Two-hour blocks recalculated as the sky and weather change"
      />
      <Card>
        {schedule.map((block) => (
          <View key={block.start.toISOString()} style={styles.scheduleRow}>
            <View style={styles.timePill}>
              <Text style={styles.timeText}>
                {block.start.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            </View>
            <View style={styles.half}>
              <Text style={styles.scheduleName}>{block.target.name}</Text>
              <Text style={uiStyles.muted}>
                {Math.round(block.altitude)}° high · score {block.score}/100
              </Text>
            </View>
          </View>
        ))}
      </Card>
      <Text style={styles.disclaimer}>
        Smart scores are planning estimates. Always check local cloud, terrain,
        daylight and equipment limits before starting a session.
      </Text>
    </Screen>
  );
}
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.half}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}
function Operation({ title, subtitle, icon, onPress, active = false }: { title: string; subtitle: string; icon: string; onPress: () => void; active?: boolean }) {
  return <Pressable onPress={onPress} style={styles.operationWrap}><Card style={[styles.operation, active && styles.operationActive]}><Text style={styles.operationIcon}>{icon}</Text><Text style={styles.operationTitle}>{title}</Text><Text style={styles.operationSubtitle}>{subtitle}</Text></Card></Pressable>;
}
const styles = createThemedStyles((colors) => ({
  date: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "600",
    marginBottom: 4,
  },
  two: { flexDirection: "row", gap: spacing.sm },
  operationGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  operationWrap: { flexGrow: 1, flexBasis: 145 },
  operation: { minHeight: 112, alignItems: "center", justifyContent: "center" },
  operationActive: { borderColor: colors.gold, borderWidth: 2, backgroundColor: colors.input },
  operationIcon: { color: colors.gold, fontSize: 25 },
  operationTitle: { color: colors.text, fontWeight: "800", textAlign: "center" },
  operationSubtitle: { color: colors.muted, fontSize: 11, textAlign: "center" },
  half: { flex: 1 },
  shortcut: { alignItems: "center", minHeight: 92, justifyContent: "center" },
  shortcutIcon: { color: colors.gold, fontSize: 24 },
  shortcutText: { color: colors.text, fontWeight: "700", textAlign: "center" },
  spaceWeather: { flexDirection: "row", alignItems: "center", borderColor: colors.gold },
  locationCard: {
    flexDirection: "row",
    alignItems: "center",
    borderColor: colors.gold,
  },
  horizonCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#141729",
  },
  pin: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#282318",
    alignItems: "center",
    justifyContent: "center",
  },
  pinText: { color: colors.gold, fontSize: 23 },
  locationName: { color: colors.text, fontSize: 16, fontWeight: "700" },
  change: { color: colors.gold, fontWeight: "700", fontSize: 13 },
  moon: { flexDirection: "row", alignItems: "center", paddingVertical: 20 },
  moonIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#1B2336",
    alignItems: "center",
    justifyContent: "center",
  },
  moonGlyph: { color: colors.gold, fontSize: 33 },
  kicker: {
    color: colors.gold,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.4,
  },
  rating: {
    backgroundColor: "#173328",
    borderRadius: radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  ratingText: { color: colors.success, fontSize: 9, fontWeight: "800" },
  ratingBright: { backgroundColor: "#382E18" },
  ratingBrightText: { color: colors.warning },
  guideCard: { borderColor: colors.gold, backgroundColor: "#141729" },
  guideMonth: {
    color: colors.gold,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  guideTitle: { color: colors.text, fontSize: 22, fontWeight: "800" },
  guideLink: { color: colors.blue, fontWeight: "700" },
  targetHead: { flexDirection: "row" },
  catalogue: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 4,
  },
  star: { color: colors.border, fontSize: 25 },
  starActive: { color: colors.gold },
  stats: {
    flexDirection: "row",
    gap: spacing.xs,
    backgroundColor: colors.input,
    padding: 12,
    borderRadius: radius.md,
  },
  statLabel: {
    color: colors.muted,
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 0.6,
  },
  statValue: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4,
  },
  breakdown: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  breakdownText: {
    color: colors.blue,
    backgroundColor: "#141E37",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
    fontSize: 10,
    fontWeight: "700",
  },
  filters: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  filter: {
    color: colors.blue,
    backgroundColor: "#141E37",
    borderRadius: radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 5,
    fontSize: 11,
    fontWeight: "700",
  },
  scheduleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  timePill: {
    width: 58,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: "#282318",
    alignItems: "center",
  },
  timeText: { color: colors.gold, fontSize: 11, fontWeight: "800" },
  scheduleName: { color: colors.text, fontWeight: "700" },
  disclaimer: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 16,
    textAlign: "center",
  },
}));
