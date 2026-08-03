import { useMemo, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Card, EmptyState, Screen, uiStyles } from "@/components/ui";
import { formatDec, formatRa, getCatalogueObject } from "@/data/catalogue";
import { useAppData } from "@/context/AppDataContext";
import { colors, radius, spacing } from "@/theme";
import { surveyImageUrl, targetImageFov } from "@/utils/surveyImages";

function filtersFor(type: string) {
  if (
    type.includes("Nebula") ||
    type.includes("Region") ||
    type.includes("Remnant")
  )
    return ["Ha", "OIII", "SII"];
  if (type.includes("Galaxy")) return ["L", "RGB", "Ha"];
  if (type.includes("Cluster")) return ["RGB", "L"];
  if (type.includes("comet") || type.includes("Comet")) return ["RGB", "L"];
  return ["RGB"];
}
export default function TargetDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { favourites, toggleFavourite } = useAppData();
  const target = useMemo(() => getCatalogueObject(id), [id]);
  const [imageFailed, setImageFailed] = useState(false);
  if (!target)
    return (
      <Screen>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>‹ Catalogue</Text>
        </Pressable>
        <EmptyState
          title="Target not found"
          message="This catalogue entry is unavailable."
        />
      </Screen>
    );
  const curated = target.curated;
  const isComet = target.objectKind === "comet";
  const imageUrl = surveyImageUrl({
    raHours: target.raHours,
    decDegrees: target.decDegrees,
    fovDegrees: targetImageFov(target),
  });
  const apparent = target.majorAxis
    ? `${target.majorAxis}′${target.minorAxis ? ` × ${target.minorAxis}′` : ""}`
    : (curated?.apparentSize ?? (isComet ? "Variable" : "Not recorded"));
  const filters = curated?.filters ?? filtersFor(target.type);
  return (
    <Screen>
      <View style={styles.nav}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>‹ Catalogue</Text>
        </Pressable>
        <Pressable onPress={() => void toggleFavourite(target.id)}>
          <Text
            style={[
              styles.star,
              favourites.includes(target.id) && { color: colors.gold },
            ]}
          >
            ★
          </Text>
        </Pressable>
      </View>
      <View>
        <Text style={styles.catalogue}>{target.catalogue}</Text>
        <Text style={uiStyles.title}>{target.name}</Text>
        <Text style={uiStyles.muted}>
          {target.type} · {target.constellation}
        </Text>
      </View>
      <View style={styles.imageCard}>
        {imageFailed ? (
          <View style={styles.imageFallback}>
            <Text style={styles.imageFallbackIcon}>✦</Text>
            <Text style={uiStyles.muted}>Survey image unavailable</Text>
          </View>
        ) : (
          <Image
            source={imageUrl}
            style={styles.heroImage}
            contentFit="cover"
            transition={350}
            cachePolicy="memory-disk"
            accessibilityLabel={`DSS2 sky survey image centred on ${target.name}`}
            onError={() => setImageFailed(true)}
          />
        )}
        <View style={styles.imageCaption}>
          <Text style={styles.imageCaptionTitle}>
            {isComet ? "Current sky field" : "Real sky survey image"}
          </Text>
          <Text style={styles.imageCaptionText}>
            {isComet
              ? "Calculated comet position over archival DSS2 imagery"
              : "DSS2 colour survey · centred on catalogue coordinates"}
          </Text>
        </View>
      </View>
      <Card>
        <View style={styles.grid}>
          <Datum label="RIGHT ASCENSION" value={formatRa(target.raHours)} />
          <Datum label="DECLINATION" value={formatDec(target.decDegrees)} />
          <Datum label="APPARENT SIZE" value={apparent} />
          <Datum
            label={isComet ? "ABSOLUTE MAG. (H)" : "MAGNITUDE"}
            value={
              (isComet ? target.absoluteMagnitude : target.magnitude)?.toString() ??
              "Not recorded"
            }
          />
        </View>
      </Card>
      {isComet && target.orbitalElements ? (
        <Card>
          <Text style={styles.heading}>Orbit and position</Text>
          <Text style={uiStyles.muted}>
            Approximate geocentric coordinates calculated for {target.positionDate ? new Date(target.positionDate).toLocaleString() : "the selected observing time"}.
          </Text>
          <View style={styles.grid}>
            <Datum label="ORBIT CLASS" value={target.orbitClass ?? "Comet"} />
            <Datum
              label="PERIHELION"
              value={`${target.orbitalElements.perihelionDistanceAu.toFixed(3)} AU`}
            />
            <Datum
              label="ECCENTRICITY"
              value={target.orbitalElements.eccentricity.toFixed(4)}
            />
            <Datum
              label="INCLINATION"
              value={`${target.orbitalElements.inclinationDegrees.toFixed(2)}°`}
            />
          </View>
        </Card>
      ) : null}
      <View>
        <Text style={styles.heading}>Recommended filters</Text>
        <View style={styles.filterRow}>
          {filters.map((filter) => (
            <Text key={filter} style={styles.filter}>
              {filter}
            </Text>
          ))}
        </View>
      </View>
      <Card>
        <Text style={styles.heading}>About this target</Text>
        <Text style={uiStyles.body}>
          {isComet
            ? `${target.name} is a moving Solar System target. Its position changes continuously, so the coordinates shown here are calculated from NASA/JPL orbital elements for the displayed time.`
            : curated?.description ??
            `${target.catalogue} is a ${target.type.toLowerCase()} in ${target.constellation}. Coordinates are J2000 and catalogue data is available offline.`}
        </Text>
      </Card>
      <Card>
        <Text style={styles.heading}>Imaging notes</Text>
        <Text style={uiStyles.body}>
          {isComet
            ? "Refresh the target before a session and confirm a precise ephemeris. Use non-sidereal tracking when available, take shorter sub-exposures, and align the comet and stars separately during processing. The DSS2 background is archival and may not contain the comet."
            : curated?.imagingNotes ??
            `Check altitude, Moon separation and framing before capture. ${target.magnitude !== null ? `Its listed visual magnitude is ${target.magnitude}.` : "No representative visual magnitude is recorded."}`}
        </Text>
      </Card>
      {isComet ? (
        <Text style={styles.credit}>
          Orbit data: NASA/JPL SBDB · sky imagery: CDS Aladin DSS2
        </Text>
      ) : !curated ? (
        <Text style={styles.credit}>
          Catalogue data: HYG DSO database · CC BY-SA 2.5
        </Text>
      ) : null}
    </Screen>
  );
}
function Datum({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.datum}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  nav: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  back: { color: colors.blue, fontSize: 16, fontWeight: "600" },
  star: { color: colors.border, fontSize: 27 },
  catalogue: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 5,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", rowGap: spacing.lg },
  datum: { width: "50%" },
  label: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
  },
  value: { color: colors.text, fontSize: 15, fontWeight: "600", marginTop: 5 },
  heading: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  filter: {
    color: colors.blue,
    backgroundColor: "#141E37",
    borderRadius: radius.pill,
    paddingHorizontal: 13,
    paddingVertical: 8,
    fontWeight: "700",
  },
  credit: { color: colors.muted, fontSize: 11, textAlign: "center" },
  imageCard: {
    overflow: "hidden",
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  heroImage: { width: "100%", height: 230, backgroundColor: "#07101F" },
  imageFallback: {
    height: 230,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: "#07101F",
  },
  imageFallbackIcon: { color: colors.gold, fontSize: 36 },
  imageCaption: { padding: spacing.md, gap: 3 },
  imageCaptionTitle: { color: colors.text, fontWeight: "700" },
  imageCaptionText: { color: colors.muted, fontSize: 12 },
});
