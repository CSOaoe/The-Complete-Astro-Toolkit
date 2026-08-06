import { useMemo, useState } from "react";
import { useRouter } from "expo-router";
import {
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  Card,
  EmptyState,
  Header,
  Screen,
  SectionHeader,
  uiStyles,
} from "@/components/ui";
import {
  CatalogueFamily,
  catalogueFamilies,
  catalogueCount,
  catalogueObjectMatchesFamily,
  catalogueObjectMatchesQuery,
  getCatalogueObject,
  searchCatalogue,
} from "@/data/catalogue";
import { useAppData } from "@/context/AppDataContext";
import { colors, createThemedStyles, radius, spacing } from "@/theme";

const filters = [
  "All",
  "Nebulae",
  "Galaxies",
  "Clusters",
  "Planetary",
  "Comets",
  "Favourites",
] as const;
export default function CatalogueScreen() {
  const router = useRouter();
  const { favourites } = useAppData();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<(typeof filters)[number]>("All");
  const [catalogueFamily, setCatalogueFamily] = useState<CatalogueFamily>("All");
  const results = useMemo(() => {
    if (filter !== "Favourites")
      return searchCatalogue(query, filter, 100, catalogueFamily);
    return favourites
      .map((id) => getCatalogueObject(id))
      .filter((item) => item !== undefined)
      .filter((item) => catalogueObjectMatchesQuery(item, query))
      .filter((item) => catalogueObjectMatchesFamily(item, catalogueFamily));
  }, [catalogueFamily, favourites, filter, query]);
  return (
    <Screen>
      <Header eyebrow="Deep sky + Solar System" title="Catalogue" />
      <View style={styles.countCard}>
        <Text style={styles.count}>{catalogueCount.toLocaleString()}+</Text>
        <Text style={uiStyles.muted}>
          offline deep-sky objects and JPL comets
        </Text>
      </View>
      <View style={styles.search}>
        <Text style={styles.searchIcon}>⌕</Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search M, NGC, IC, comet, name…"
          placeholderTextColor={colors.muted}
          style={styles.searchInput}
        />
      </View>
      <View style={styles.catalogueBrowseHeader}>
        <Text style={styles.catalogueBrowseTitle}>Browse by catalogue</Text>
        <Text style={styles.catalogueBrowseHint}>Swipe to see every collection</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.catalogueFilters}
      >
        {catalogueFamilies.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => {
              setCatalogueFamily(item.id);
              if (item.id === "Comets") setFilter("All");
            }}
            style={[
              styles.catalogueChip,
              catalogueFamily === item.id && styles.catalogueChipActive,
            ]}
          >
            <Text
              style={[
                styles.catalogueChipText,
                catalogueFamily === item.id && styles.catalogueChipTextActive,
              ]}
            >
              {item.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filters}
      >
        {filters.map((item) => (
          <Pressable
            key={item}
            onPress={() => {
              setFilter(item);
              if (item === "Comets") setCatalogueFamily("Comets");
            }}
            style={[styles.chip, filter === item && styles.chipActive]}
          >
            <Text
              style={[
                styles.chipText,
                filter === item && styles.chipTextActive,
              ]}
            >
              {item}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      <SectionHeader
        title={`${results.length}${results.length === 100 ? " shown" : " results"}`}
        subtitle={
          results.length === 100
            ? "Refine your search to narrow the first 100 matches"
            : "Tap a target for coordinates and imaging data"
        }
      />
      {results.length === 0 ? (
        <EmptyState
          title="No targets found"
          message="Try another designation, name or object type."
        />
      ) : (
        results.map((target) => (
          <Pressable
            key={target.id}
            onPress={() => router.push(`/catalogue/${target.id}`)}
          >
            <Card style={styles.target}>
              <View style={styles.objectMark}>
                <Text style={styles.objectMarkText}>
                  {target.objectKind === "comet" ? "☄" : "✦"}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.catalogue}>
                  {target.catalogue} · {target.type}
                </Text>
                <Text style={uiStyles.h3}>{target.name}</Text>
                <Text style={uiStyles.muted}>
                  {target.objectKind === "comet"
                    ? "Calculated current position"
                    : target.constellation}
                  {target.magnitude !== null
                    ? ` · mag ${target.magnitude}`
                    : ""}
                </Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Card>
          </Pressable>
        ))
      )}
    </Screen>
  );
}
const styles = createThemedStyles((colors) => ({
  countCard: { alignItems: "center", paddingVertical: spacing.md },
  count: { color: colors.gold, fontSize: 38, fontWeight: "800" },
  search: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.input,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
  },
  searchIcon: { color: colors.gold, fontSize: 24 },
  searchInput: { flex: 1, color: colors.text, fontSize: 16, padding: 14 },
  catalogueBrowseHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  catalogueBrowseTitle: { color: colors.text, fontSize: 14, fontWeight: "800" },
  catalogueBrowseHint: { color: colors.muted, fontSize: 10 },
  catalogueFilters: { gap: spacing.xs, paddingRight: spacing.md },
  catalogueChip: {
    borderWidth: 1,
    borderColor: colors.gold + "66",
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  catalogueChipActive: { backgroundColor: colors.input, borderColor: colors.gold },
  catalogueChipText: { color: colors.muted, fontSize: 12, fontWeight: "700" },
  catalogueChipTextActive: { color: colors.gold },
  filters: { gap: spacing.sm },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  chipActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  chipText: { color: colors.muted, fontWeight: "600" },
  chipTextActive: { color: colors.background },
  target: { flexDirection: "row", alignItems: "center" },
  objectMark: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#171F33",
    alignItems: "center",
    justifyContent: "center",
  },
  objectMarkText: { color: colors.gold, fontSize: 18 },
  catalogue: { color: colors.gold, fontSize: 11, fontWeight: "700" },
  chevron: { color: colors.muted, fontSize: 28 },
}));
