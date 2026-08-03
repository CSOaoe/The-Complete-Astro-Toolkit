import { useState } from "react";
import { useRouter } from "expo-router";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import {
  Button,
  Card,
  EmptyState,
  Input,
  Screen,
  SectionHeader,
  StatusBadge,
  uiStyles,
} from "@/components/ui";
import { useAppData } from "@/context/AppDataContext";
import { ImagingSession, ProjectStatus, SessionStatus } from "@/types";
import { colors, radius, spacing } from "@/theme";

const initial = {
  targetName: "",
  date: new Date().toISOString().slice(0, 10),
  startTime: "22:00",
  duration: "180",
  rigName: "",
  notes: "",
  status: "Planned" as SessionStatus,
};
export default function PlannerScreen() {
  const router = useRouter();
  const { sessions, observer, saveSession, deleteSession } = useAppData();
  const [form, setForm] = useState(initial);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const submit = async () => {
    if (
      !form.targetName.trim() ||
      !/^\d{4}-\d{2}-\d{2}$/.test(form.date) ||
      !/^\d{2}:\d{2}$/.test(form.startTime) ||
      Number(form.duration) <= 0
    ) {
      setError("Enter a target, valid date/time and positive duration.");
      return;
    }
    const session: ImagingSession = {
      id: `session-${Date.now()}`,
      targetId: "",
      targetName: form.targetName.trim(),
      date: form.date,
      startTime: form.startTime,
      durationMinutes: Number(form.duration),
      locationName: observer.label,
      rigName: form.rigName.trim(),
      notes: form.notes.trim(),
      status: form.status,
      createdAt: new Date().toISOString(),
    };
    await saveSession(session);
    setForm(initial);
    setShowForm(false);
    setError("");
  };
  const updateStatus = (session: ImagingSession, status: SessionStatus) =>
    void saveSession({ ...session, status });
  return (
    <Screen>
      <Pressable onPress={() => router.back()}>
        <Text style={styles.back}>‹ Tonight</Text>
      </Pressable>
      <SectionHeader
        title="Imaging planner"
        subtitle="Schedule capture windows and carry them into session history"
        action={
          !showForm ? (
            <Pressable onPress={() => setShowForm(true)}>
              <Text style={styles.add}>＋ Plan</Text>
            </Pressable>
          ) : undefined
        }
      />
      {showForm ? (
        <Card>
          <Input
            label="Target"
            value={form.targetName}
            onChangeText={(targetName) => setForm({ ...form, targetName })}
            placeholder="e.g. NGC 7000"
          />
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Input
                label="Date"
                value={form.date}
                onChangeText={(date) => setForm({ ...form, date })}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Input
                label="Start"
                value={form.startTime}
                onChangeText={(startTime) => setForm({ ...form, startTime })}
              />
            </View>
          </View>
          <Input
            label="Duration (minutes)"
            value={form.duration}
            onChangeText={(duration) => setForm({ ...form, duration })}
            keyboardType="number-pad"
          />
          <Input
            label="Imaging rig"
            value={form.rigName}
            onChangeText={(rigName) => setForm({ ...form, rigName })}
            placeholder="Optional rig name"
          />
          <Input
            label="Notes"
            multiline
            value={form.notes}
            onChangeText={(notes) => setForm({ ...form, notes })}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button title="Save session" onPress={() => void submit()} />
          <Button
            title="Cancel"
            variant="secondary"
            onPress={() => setShowForm(false)}
          />
        </Card>
      ) : null}
      {sessions.length === 0 ? (
        <EmptyState
          title="No sessions planned"
          message="Create a date-based imaging plan for your next clear night."
        />
      ) : (
        sessions.map((session) => (
          <Card key={session.id}>
            <View style={styles.head}>
              <View style={{ flex: 1 }}>
                <Text style={uiStyles.h3}>{session.targetName}</Text>
                <Text style={uiStyles.muted}>
                  {session.date} · {session.startTime} ·{" "}
                  {session.durationMinutes} min
                </Text>
              </View>
              <StatusBadge
                status={
                  (session.status === "Cancelled"
                    ? "Planned"
                    : session.status) as ProjectStatus
                }
              />
            </View>
            <Text style={uiStyles.muted}>
              {session.locationName}
              {session.rigName ? ` · ${session.rigName}` : ""}
            </Text>
            {session.notes ? (
              <Text style={uiStyles.body}>{session.notes}</Text>
            ) : null}
            <View style={styles.row}>
              {session.status !== "Completed" ? (
                <View style={{ flex: 1 }}>
                  <Button
                    title="Complete"
                    onPress={() => updateStatus(session, "Completed")}
                  />
                </View>
              ) : null}
              <View style={{ flex: 1 }}>
                <Button
                  title="Delete"
                  variant="danger"
                  onPress={() =>
                    Alert.alert("Delete session?", session.targetName, [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Delete",
                        style: "destructive",
                        onPress: () => void deleteSession(session.id),
                      },
                    ])
                  }
                />
              </View>
            </View>
          </Card>
        ))
      )}
    </Screen>
  );
}
const styles = StyleSheet.create({
  back: { color: colors.blue, fontWeight: "700" },
  add: { color: colors.gold, fontWeight: "700" },
  row: { flexDirection: "row", gap: spacing.sm },
  head: { flexDirection: "row", gap: spacing.sm },
  error: { color: colors.danger },
  chip: { borderRadius: radius.pill },
});
