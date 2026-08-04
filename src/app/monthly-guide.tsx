import { Image } from "expo-image";
import { Href, useRouter } from "expo-router";
import { Linking, Pressable, Text, View } from "react-native";
import { Card, Screen, SectionHeader, uiStyles } from "@/components/ui";
import { august2026Guide } from "@/data/monthlyGuides";
import { getCatalogueObject } from "@/data/catalogue";
import { surveyImageUrl, targetImageFov } from "@/utils/surveyImages";
import { createThemedStyles, radius, spacing } from "@/theme";

export default function MonthlyGuideScreen() {
  const router = useRouter();
  return (
    <Screen>
      <Pressable onPress={() => router.back()}>
        <Text style={styles.back}>‹ Tonight</Text>
      </Pressable>
      <Card style={styles.hero}>
        <Text style={styles.month}>{august2026Guide.month}</Text>
        <Text style={styles.title}>{august2026Guide.title}</Text>
        <Text style={styles.intro}>{august2026Guide.intro}</Text>
      </Card>
      <SectionHeader
        title="My sky at a glance"
        subtitle="Choose the view that matches your hemisphere"
      />
      <View style={styles.two}>
        <Card style={styles.half}>
          <Text style={styles.cardTitle}>Northern sky</Text>
          <Text style={uiStyles.muted}>{august2026Guide.north}</Text>
        </Card>
        <Card style={styles.half}>
          <Text style={styles.cardTitle}>Southern sky</Text>
          <Text style={uiStyles.muted}>{august2026Guide.south}</Text>
        </Card>
      </View>
      <SectionHeader title="The dates I’m planning around" />
      {august2026Guide.events.map((event) => (
        <Card key={event.date} style={styles.event}>
          <View style={styles.dateBadge}>
            <Text style={styles.dateText}>{event.date}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={uiStyles.h3}>{event.title}</Text>
            <Text style={uiStyles.muted}>{event.description}</Text>
          </View>
        </Card>
      ))}
      <Card style={styles.safety}>
        <Text style={styles.safetyTitle}>Solar safety — no shortcuts</Text>
        <Text style={uiStyles.muted}>
          I will only view or photograph the Sun through certified solar
          equipment fitted securely to the front of the optics. Never look
          through an unfiltered camera, telescope, finder or binoculars.
        </Text>
      </Card>
      <SectionHeader
        title="What I’d capture"
        subtitle="My August shortlist, with real survey imagery"
      />
      {august2026Guide.targets.map((guideTarget) => {
        const target = getCatalogueObject(guideTarget.id);
        if (!target) return null;
        const imageUrl = surveyImageUrl({
          raHours: target.raHours,
          decDegrees: target.decDegrees,
          fovDegrees: targetImageFov(target),
          width: 900,
          height: 480,
        });
        return (
          <Pressable
            key={guideTarget.id}
            onPress={() => router.push(`/catalogue/${guideTarget.id}` as Href)}
          >
            <Card style={styles.target}>
              <Image
                source={imageUrl}
                style={styles.targetImage}
                contentFit="cover"
                accessibilityLabel={`DSS2 image of ${target.name}`}
              />
              <View style={styles.targetBody}>
                <Text style={styles.targetCatalogue}>
                  {target.catalogue} · {target.constellation}
                </Text>
                <Text style={uiStyles.h3}>{target.name}</Text>
                <Text style={uiStyles.body}>{guideTarget.note}</Text>
                <Text style={styles.capture}>{guideTarget.capture}</Text>
              </View>
            </Card>
          </Pressable>
        );
      })}
      <SectionHeader title="My nightscape idea" />
      <Card>
        <Text style={uiStyles.h3}>Perseids over a strong foreground</Text>
        <Text style={uiStyles.muted}>
          I’d scout the composition in daylight, lock focus before dark and run
          a fast wide lens continuously through the 12–13 August peak. I’ll keep
          one clean foreground frame and combine only genuine meteor frames
          later.
        </Text>
      </Card>
      <Card>
        <Text style={styles.cardTitle}>About this guide</Text>
        <Text style={uiStyles.muted}>
          This is my app-friendly rewrite of the Cosmic Captures August 2026
          guide, checked against eclipse and meteor-shower references.
        </Text>
        <Pressable
          onPress={() =>
            void Linking.openURL(
              "https://www.cosmiccaptures.com/august2026guide",
            )
          }
        >
          <Text style={styles.link}>Read the original web guide ›</Text>
        </Pressable>
      </Card>
      <Text style={styles.credit}>Sky imagery: CDS Aladin DSS2.</Text>
    </Screen>
  );
}
const styles = createThemedStyles((colors) => ({
  back: { color: colors.blue, fontWeight: "700" },
  hero: {
    padding: spacing.xl,
    borderColor: colors.gold,
    backgroundColor: "#131626",
  },
  month: {
    color: colors.gold,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  title: {
    color: colors.text,
    fontSize: 32,
    lineHeight: 38,
    fontWeight: "800",
  },
  intro: { color: colors.text, fontSize: 16, lineHeight: 24 },
  two: { flexDirection: "row", gap: spacing.sm, alignItems: "stretch" },
  half: { flex: 1 },
  cardTitle: { color: colors.gold, fontWeight: "800", fontSize: 16 },
  event: { flexDirection: "row", alignItems: "flex-start" },
  dateBadge: {
    width: 66,
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    backgroundColor: "#282318",
  },
  dateText: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
  },
  safety: { borderColor: colors.danger, backgroundColor: "#24141B" },
  safetyTitle: { color: colors.danger, fontWeight: "800", fontSize: 17 },
  target: { padding: 0, overflow: "hidden" },
  targetImage: { width: "100%", height: 180, backgroundColor: colors.input },
  targetBody: { padding: spacing.md, gap: spacing.xs },
  targetCatalogue: { color: colors.gold, fontSize: 11, fontWeight: "800" },
  capture: { color: colors.blue, fontWeight: "700", marginTop: 4 },
  link: { color: colors.blue, fontWeight: "700", marginTop: 4 },
  credit: { color: colors.muted, textAlign: "center", fontSize: 11 },
}));
