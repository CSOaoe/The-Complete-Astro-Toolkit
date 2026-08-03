import { useMemo, useState } from "react";
import { Href, useRouter } from "expo-router";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import {
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  Header,
  Input,
  LoadingState,
  Screen,
  SectionHeader,
  StatusBadge,
  uiStyles,
} from "@/components/ui";
import { useAppData } from "@/context/AppDataContext";
import { JournalProject, ProjectStatus } from "@/types";
import { formatDuration, totalIntegrationSeconds } from "@/utils/calculations";
import { colors, radius, spacing } from "@/theme";

type Draft = Omit<
  JournalProject,
  "id" | "createdAt" | "exposureLength" | "exposureCount"
> & { id?: string; exposureLength: string; exposureCount: string };
const blank: Draft = {
  target: "",
  telescope: "",
  camera: "",
  filter: "",
  exposureLength: "",
  exposureCount: "",
  notes: "",
  status: "Planned",
};
const statuses: (ProjectStatus | "All")[] = [
  "All",
  "Planned",
  "Active",
  "Completed",
];

export default function JournalScreen() {
  const router = useRouter();
  const { projects, saveProject, deleteProject, loading, error } = useAppData();
  const [filter, setFilter] = useState<ProjectStatus | "All">("All");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const visible = useMemo(
    () =>
      filter === "All"
        ? projects
        : projects.filter((item) => item.status === filter),
    [filter, projects],
  );
  const edit = (project: JournalProject) =>
    setDraft({
      ...project,
      exposureLength: String(project.exposureLength),
      exposureCount: String(project.exposureCount),
    });
  const submit = async () => {
    if (!draft) return;
    const next: Record<string, string> = {};
    if (!draft.target.trim()) next.target = "Target is required";
    if (!draft.telescope.trim()) next.telescope = "Telescope is required";
    if (!draft.camera.trim()) next.camera = "Camera is required";
    if (!draft.filter.trim()) next.filter = "Filter is required";
    if (
      !Number.isFinite(Number(draft.exposureLength)) ||
      Number(draft.exposureLength) <= 0
    )
      next.exposureLength = "Enter a positive exposure";
    if (
      !Number.isInteger(Number(draft.exposureCount)) ||
      Number(draft.exposureCount) <= 0
    )
      next.exposureCount = "Enter a whole number";
    setErrors(next);
    if (Object.keys(next).length) return;
    await saveProject({
      id: draft.id ?? `project-${Date.now()}`,
      target: draft.target.trim(),
      telescope: draft.telescope.trim(),
      camera: draft.camera.trim(),
      filter: draft.filter.trim(),
      exposureLength: Number(draft.exposureLength),
      exposureCount: Number(draft.exposureCount),
      notes: draft.notes.trim(),
      status: draft.status,
      createdAt: draft.id
        ? (projects.find((item) => item.id === draft.id)?.createdAt ??
          new Date().toISOString())
        : new Date().toISOString(),
    });
    setDraft(null);
  };
  if (loading)
    return (
      <Screen>
        <Header eyebrow="Capture history" title="Journal" />
        <LoadingState />
      </Screen>
    );
  return (
    <Screen>
      <Header eyebrow="Capture history" title="Journal" />
      {error ? <ErrorBanner message={error} /> : null}
      <Pressable onPress={() => router.push("/sessions" as Href)}>
        <Card style={{ flexDirection: "row", alignItems: "center" }}>
          <Text style={{ color: colors.gold, fontSize: 24 }}>◷</Text>
          <View style={{ flex: 1 }}>
            <Text style={uiStyles.h3}>Session history</Text>
            <Text style={uiStyles.muted}>Review completed capture nights</Text>
          </View>
          <Text style={{ color: colors.muted, fontSize: 26 }}>›</Text>
        </Card>
      </Pressable>
      <SectionHeader
        title="Imaging projects"
        subtitle="Plan, track and remember every clear night"
        action={
          !draft ? (
            <Pressable onPress={() => setDraft(blank)}>
              <Text style={styles.add}>＋ Add</Text>
            </Pressable>
          ) : undefined
        }
      />
      {draft ? (
        <Card>
          <Text style={uiStyles.h3}>
            {draft.id ? "Edit project" : "New project"}
          </Text>
          <Input
            label="Target"
            value={draft.target}
            onChangeText={(v) => setDraft({ ...draft, target: v })}
            error={errors.target}
            placeholder="e.g. M31 Andromeda Galaxy"
          />
          <Input
            label="Telescope"
            value={draft.telescope}
            onChangeText={(v) => setDraft({ ...draft, telescope: v })}
            error={errors.telescope}
            placeholder="e.g. 80mm APO"
          />
          <Input
            label="Camera"
            value={draft.camera}
            onChangeText={(v) => setDraft({ ...draft, camera: v })}
            error={errors.camera}
            placeholder="e.g. ASI2600MC Pro"
          />
          <Input
            label="Filter"
            value={draft.filter}
            onChangeText={(v) => setDraft({ ...draft, filter: v })}
            error={errors.filter}
            placeholder="e.g. Dual band"
          />
          <View style={styles.two}>
            <View style={{ flex: 1 }}>
              <Input
                label="Exposure (seconds)"
                keyboardType="decimal-pad"
                value={draft.exposureLength}
                onChangeText={(v) => setDraft({ ...draft, exposureLength: v })}
                error={errors.exposureLength}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Input
                label="Number of exposures"
                keyboardType="number-pad"
                value={draft.exposureCount}
                onChangeText={(v) => setDraft({ ...draft, exposureCount: v })}
                error={errors.exposureCount}
              />
            </View>
          </View>
          <Text style={styles.label}>Status</Text>
          <View style={styles.chips}>
            {statuses.slice(1).map((status) => (
              <Pressable
                key={status}
                onPress={() =>
                  setDraft({ ...draft, status: status as ProjectStatus })
                }
                style={[
                  styles.chip,
                  draft.status === status && styles.chipActive,
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    draft.status === status && styles.chipTextActive,
                  ]}
                >
                  {status}
                </Text>
              </Pressable>
            ))}
          </View>
          <Input
            label="Notes"
            multiline
            value={draft.notes}
            onChangeText={(v) => setDraft({ ...draft, notes: v })}
            placeholder="Conditions, framing, processing ideas…"
          />
          {Number(draft.exposureLength) > 0 &&
          Number(draft.exposureCount) > 0 ? (
            <View style={styles.total}>
              <Text style={styles.totalLabel}>TOTAL INTEGRATION</Text>
              <Text style={styles.totalValue}>
                {formatDuration(
                  totalIntegrationSeconds(
                    Number(draft.exposureLength),
                    Number(draft.exposureCount),
                  ),
                )}
              </Text>
            </View>
          ) : null}
          <Button
            title={draft.id ? "Save changes" : "Create project"}
            onPress={() => void submit()}
          />
          <Button
            title="Cancel"
            variant="secondary"
            onPress={() => {
              setDraft(null);
              setErrors({});
            }}
          />
        </Card>
      ) : null}
      {!draft ? (
        <>
          <View style={styles.chips}>
            {statuses.map((status) => (
              <Pressable
                key={status}
                onPress={() => setFilter(status)}
                style={[styles.chip, filter === status && styles.chipActive]}
              >
                <Text
                  style={[
                    styles.chipText,
                    filter === status && styles.chipTextActive,
                  ]}
                >
                  {status}
                </Text>
              </Pressable>
            ))}
          </View>
          {visible.length === 0 ? (
            <EmptyState
              title="No projects here yet"
              message="Add an imaging project or choose another status filter."
              action={
                <View style={{ marginTop: spacing.sm }}>
                  <Button title="Add project" onPress={() => setDraft(blank)} />
                </View>
              }
            />
          ) : (
            visible.map((project) => (
              <Card key={project.id}>
                <View style={styles.projectHead}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.projectTarget}>{project.target}</Text>
                    <Text style={uiStyles.muted}>
                      {project.telescope} · {project.camera}
                    </Text>
                  </View>
                  <StatusBadge status={project.status} />
                </View>
                <View style={styles.projectData}>
                  <View>
                    <Text style={styles.dataLabel}>INTEGRATION</Text>
                    <Text style={styles.dataValue}>
                      {formatDuration(
                        totalIntegrationSeconds(
                          project.exposureLength,
                          project.exposureCount,
                        ),
                      )}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.dataLabel}>CAPTURE PLAN</Text>
                    <Text style={styles.dataValue}>
                      {project.exposureCount} × {project.exposureLength}s
                    </Text>
                  </View>
                </View>
                {project.notes ? (
                  <Text style={uiStyles.body}>{project.notes}</Text>
                ) : null}
                <View style={styles.actions}>
                  <View style={{ flex: 1 }}>
                    <Button
                      title="Edit"
                      variant="secondary"
                      onPress={() => edit(project)}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Button
                      title="Delete"
                      variant="danger"
                      onPress={() =>
                        Alert.alert(
                          "Delete project?",
                          `${project.target} will be removed from this device.`,
                          [
                            { text: "Cancel", style: "cancel" },
                            {
                              text: "Delete",
                              style: "destructive",
                              onPress: () => void deleteProject(project.id),
                            },
                          ],
                        )
                      }
                    />
                  </View>
                </View>
              </Card>
            ))
          )}
        </>
      ) : null}
    </Screen>
  );
}
const styles = StyleSheet.create({
  add: { color: colors.gold, fontWeight: "700", fontSize: 15 },
  two: { flexDirection: "row", gap: spacing.sm },
  label: { color: colors.text, fontSize: 14, fontWeight: "600" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  chipActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  chipText: { color: colors.muted, fontWeight: "600" },
  chipTextActive: { color: colors.background },
  total: {
    backgroundColor: colors.input,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  totalLabel: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  totalValue: {
    color: colors.gold,
    fontSize: 22,
    fontWeight: "700",
    marginTop: 4,
  },
  projectHead: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  projectTarget: { color: colors.text, fontSize: 19, fontWeight: "700" },
  projectData: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: colors.input,
    padding: 13,
    borderRadius: radius.md,
  },
  dataLabel: {
    color: colors.muted,
    fontSize: 9,
    letterSpacing: 1,
    fontWeight: "800",
  },
  dataValue: { color: colors.text, marginTop: 4, fontWeight: "600" },
  actions: { flexDirection: "row", gap: spacing.sm },
});
