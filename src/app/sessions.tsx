import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  Card,
  EmptyState,
  Screen,
  SectionHeader,
  uiStyles,
} from "@/components/ui";
import { useAppData } from "@/context/AppDataContext";
import { colors, spacing } from "@/theme";

export default function SessionsScreen() {
  const router = useRouter();
  const { sessions } = useAppData();
  const completed = sessions.filter((item) => item.status === "Completed");
  const total = completed.reduce((sum, item) => sum + item.durationMinutes, 0);
  return (
    <Screen>
      <Pressable onPress={() => router.back()}>
        <Text style={styles.back}>‹ Journal</Text>
      </Pressable>
      <SectionHeader
        title="Session history"
        subtitle="A permanent record of completed capture nights"
      />
      <View style={styles.stats}>
        <Card style={{ flex: 1 }}>
          <Text style={styles.value}>{completed.length}</Text>
          <Text style={uiStyles.muted}>sessions</Text>
        </Card>
        <Card style={{ flex: 1 }}>
          <Text style={styles.value}>{(total / 60).toFixed(1)}h</Text>
          <Text style={uiStyles.muted}>scheduled</Text>
        </Card>
      </View>
      {completed.length === 0 ? (
        <EmptyState
          icon="☾"
          title="No completed sessions"
          message="Mark an imaging plan as completed and it will appear here."
        />
      ) : (
        completed.map((session) => (
          <Card key={session.id}>
            <Text style={styles.date}>
              {session.date} · {session.startTime}
            </Text>
            <Text style={uiStyles.h3}>{session.targetName}</Text>
            <Text style={uiStyles.muted}>
              {session.durationMinutes} minutes · {session.locationName}
              {session.rigName ? ` · ${session.rigName}` : ""}
            </Text>
            {session.notes ? (
              <Text style={uiStyles.body}>{session.notes}</Text>
            ) : null}
          </Card>
        ))
      )}
    </Screen>
  );
}
const styles = StyleSheet.create({
  back: { color: colors.blue, fontWeight: "700" },
  stats: { flexDirection: "row", gap: spacing.sm },
  value: {
    color: colors.gold,
    fontSize: 30,
    fontWeight: "800",
    textAlign: "center",
  },
  date: { color: colors.gold, fontSize: 11, fontWeight: "800" },
});
