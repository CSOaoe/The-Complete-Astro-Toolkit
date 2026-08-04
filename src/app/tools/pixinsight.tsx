import { useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { Card, Screen, SectionHeader, uiStyles } from "@/components/ui";
import { PixInsightAnswers, pixInsightWorkflow } from "@/utils/planning";
import { createThemedStyles, radius, spacing } from "@/theme";

export default function PixInsightScreen() {
  const router = useRouter();
  const [answers, setAnswers] = useState<PixInsightAnswers>({
    data: "OSC",
    target: "Nebula",
    narrowband: false,
    gradients: true,
    noise: true,
    stars: true,
  });
  const steps = useMemo(() => pixInsightWorkflow(answers), [answers]);
  return (
    <Screen>
      <Pressable onPress={() => router.back()}>
        <Text style={styles.back}>‹ Calculate</Text>
      </Pressable>
      <SectionHeader
        title="PixInsight workflow"
        subtitle="A decision-based assistant for your dataset"
      />
      <Card>
        <Choice
          label="Camera data"
          values={["OSC", "Mono"]}
          selected={answers.data}
          onSelect={(data) =>
            setAnswers({ ...answers, data: data as PixInsightAnswers["data"] })
          }
        />
        <Choice
          label="Target type"
          values={["Nebula", "Galaxy", "Cluster"]}
          selected={answers.target}
          onSelect={(target) =>
            setAnswers({
              ...answers,
              target: target as PixInsightAnswers["target"],
            })
          }
        />
        <Toggle
          label="Narrowband data"
          value={answers.narrowband}
          onPress={() =>
            setAnswers({ ...answers, narrowband: !answers.narrowband })
          }
        />
        <Toggle
          label="Strong gradients"
          value={answers.gradients}
          onPress={() =>
            setAnswers({ ...answers, gradients: !answers.gradients })
          }
        />
        <Toggle
          label="Noise reduction needed"
          value={answers.noise}
          onPress={() => setAnswers({ ...answers, noise: !answers.noise })}
        />
        <Toggle
          label="Separate star processing"
          value={answers.stars}
          onPress={() => setAnswers({ ...answers, stars: !answers.stars })}
        />
      </Card>
      <SectionHeader
        title="Recommended sequence"
        subtitle={`${steps.length} ordered stages`}
      />
      {steps.map((step, index) => (
        <Card key={step} style={styles.step}>
          <View style={styles.number}>
            <Text style={styles.numberText}>{index + 1}</Text>
          </View>
          <Text style={[uiStyles.body, { flex: 1 }]}>{step}</Text>
        </Card>
      ))}
      <Text style={styles.note}>
        Process names may require commercial third-party tools. Always work
        non-destructively and inspect each stage.
      </Text>
    </Screen>
  );
}
function Choice({
  label,
  values,
  selected,
  onSelect,
}: {
  label: string;
  values: string[];
  selected: string;
  onSelect: (value: string) => void;
}) {
  return (
    <View style={{ gap: spacing.xs }}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.choices}>
        {values.map((value) => (
          <Pressable
            key={value}
            onPress={() => onSelect(value)}
            style={[styles.choice, value === selected && styles.choiceActive]}
          >
            <Text
              style={[
                styles.choiceText,
                value === selected && styles.choiceTextActive,
              ]}
            >
              {value}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
function Toggle({
  label,
  value,
  onPress,
}: {
  label: string;
  value: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.toggle}>
      <Text style={uiStyles.body}>{label}</Text>
      <View style={[styles.switch, value && styles.switchOn]}>
        <View style={[styles.knob, value && styles.knobOn]} />
      </View>
    </Pressable>
  );
}
const styles = createThemedStyles((colors) => ({
  back: { color: colors.blue, fontWeight: "700" },
  label: { color: colors.text, fontWeight: "600" },
  choices: { flexDirection: "row", gap: spacing.sm },
  choice: {
    flex: 1,
    padding: 10,
    alignItems: "center",
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
  },
  choiceActive: { backgroundColor: colors.gold },
  choiceText: { color: colors.muted },
  choiceTextActive: { color: colors.background, fontWeight: "700" },
  toggle: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    minHeight: 44,
  },
  switch: {
    width: 46,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.border,
    padding: 3,
  },
  switchOn: { backgroundColor: colors.gold },
  knob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.text,
  },
  knobOn: { alignSelf: "flex-end" },
  step: { flexDirection: "row", alignItems: "center" },
  number: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#282318",
    alignItems: "center",
    justifyContent: "center",
  },
  numberText: { color: colors.gold, fontWeight: "800" },
  note: { color: colors.muted, fontSize: 11, textAlign: "center" },
}));
