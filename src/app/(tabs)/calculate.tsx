import { Href, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Button, Card, EmptyState, Header, Input, Screen, SectionHeader, uiStyles } from "@/components/ui";
import { createThemedStyles } from "@/theme";

const toolRoutes: { title: string; subtitle: string; icon: string; href: Href }[] = [
  { title: "Session Command Centre", subtitle: "Live progress, altitude, field checklist and reminders", icon: "▶", href: "/session-command" as Href },
  { title: "Offline Field Pack", subtitle: "Cache plans, forecast and target imagery before leaving", icon: "↓", href: "/offline-pack" as Href },
  { title: "Power, dew & storage", subtitle: "Battery runtime, condensation risk and image capacity", icon: "⚡", href: "/power-planner" as Href },
  { title: "Offline sky atlas", subtitle: "Pan and zoom the built-in deep-sky map without signal", icon: "✦", href: "/tools/sky-atlas" as Href },
  { title: "Intelligent alerts", subtitle: "Clear sky, aurora, target and equipment-risk rules", icon: "!", href: "/alerts" as Href },
  { title: "Multi-night projects", subtitle: "Allocate unfinished integration across upcoming nights", icon: "▦", href: "/tools/multi-night" as Href },
  { title: "Astro Flight", subtitle: "Fly through your own image layers", icon: "🚀", href: "/astro-flight" as Href },
  { title: "Visual framing", subtitle: "Rig-aware FOV, pixel scale, coordinates and smooth composition", icon: "▣", href: "/tools/framing" as Href },
  { title: "Optical train builder", subtitle: "Back-focus spacing and rig sampling compatibility", icon: "⌁", href: "/tools/equipment-train" as Href },
  { title: "Equipment compatibility", subtitle: "Image circles, threads, filters and reducer geometry", icon: "◎", href: "/tools/equipment-compatibility" as Href },
  { title: "Moon distance", subtitle: "Check angular separation", icon: "☾", href: "/tools/moon-distance" as Href },
  { title: "Mosaic planner", subtitle: "Build a flexible overlap-safe panel plan", icon: "◈", href: "/tools/mosaic" as Href },
  { title: "Plate solving", subtitle: "Identify an astro image's exact sky centre", icon: "⌖", href: "/tools/plate-solve" as Href },
  { title: "Satellite trails", subtitle: "Find safer capture windows for your frame", icon: "⌁", href: "/tools/satellite-trails" as Href },
  { title: "Image quality", subtitle: "Check focus, star shape and background locally", icon: "◎", href: "/tools/image-quality" as Href },
  { title: "FITS / XISF inspector", subtitle: "Read raw subframe metadata and FITS pixels locally", icon: "◈", href: "/tools/file-inspector" as Href },
  { title: "PHD2 log analyser", subtitle: "Explain guiding RMS, drift and excursions", icon: "⌁", href: "/tools/phd2-log" as Href },
  { title: "Calibration library", subtitle: "Track dark, flat, bias and dark-flat sets", icon: "▤", href: "/tools/calibration-library" as Href },
  { title: "Autofocus assistant", subtitle: "Calculate the focus zone and analyse V-curves", icon: "◎", href: "/tools/autofocus" as Href },
  { title: "All-night altitude", subtitle: "Animated target visibility from dusk to dawn", icon: "⌁", href: "/tools/altitude-chart" as Href },
  { title: "Solar, lunar & planets", subtitle: "Ephemerides and lucky-imaging capture guidance", icon: "☉", href: "/tools/solar-system" as Href },
  { title: "Eclipses & meteors", subtitle: "Local eclipse circumstances and shower planner", icon: "☄", href: "/tools/sky-events" as Href },
  { title: "Local horizon", subtitle: "Map trees, roofs and other obstructions", icon: "⌂", href: "/horizon" as Href },
  { title: "Exposure plan", subtitle: "Calculate optimal sub length", icon: "▷", href: "/tools/exposure" as Href },
  { title: "Post Process", subtitle: "Build a software-aware processing workflow", icon: "✦", href: "/tools/pixinsight" as Href },
].sort((a, b) => a.title.localeCompare(b.title, "en", { sensitivity: "base" }));

export default function ToolsScreen() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const visibleTools = toolRoutes.filter((tool) => {
    const text = `${tool.title} ${tool.subtitle}`.toLowerCase();
    return terms.every((term) => text.includes(term));
  });
  return (
    <Screen>
      <Header eyebrow="Capture and processing" title="Tools" />
      <Input label="Find a tool" value={query} onChangeText={setQuery} placeholder="Search framing, focus, weather…" autoCapitalize="none" autoCorrect={false} returnKeyType="search" clearButtonMode="while-editing" />
      <Text style={uiStyles.muted} accessibilityLiveRegion="polite">{visibleTools.length} of {toolRoutes.length} tools · A–Z</Text>
      {query ? <Button title="Clear search" variant="secondary" onPress={() => setQuery("")} /> : null}
      <SectionHeader title="Astrophotography toolkit" subtitle="Planning, capture, analysis and post-processing assistants" />
      {!visibleTools.length ? <EmptyState title="No matching tools" message="Try a shorter search or clear it to browse every tool." /> : null}
      {visibleTools.map((tool) => (
        <Pressable key={tool.title} accessibilityRole="button" accessibilityLabel={`${tool.title}. ${tool.subtitle}`} onPress={() => router.push(tool.href)} style={({ pressed }) => pressed && { opacity: 0.7 }}>
          <Card style={styles.tool}>
            <Text style={styles.toolIcon}>{tool.icon}</Text>
            <View style={styles.body}>
              <Text style={uiStyles.h3}>{tool.title}</Text>
              <Text style={uiStyles.muted}>{tool.subtitle}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Card>
        </Pressable>
      ))}
    </Screen>
  );
}

const styles = createThemedStyles((colors) => ({
  tool: { flexDirection: "row", alignItems: "center" },
  toolIcon: { width: 38, color: colors.gold, fontSize: 24 },
  body: { flex: 1 },
  chevron: { color: colors.muted, fontSize: 28 },
}));
