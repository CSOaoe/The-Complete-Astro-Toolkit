import React, { PropsWithChildren, ReactNode } from "react";
import {
  ActivityIndicator,
  KeyboardTypeOptions,
  Pressable,
  ScrollView,
  StyleProp,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, createThemedStyles, radius, spacing } from "@/theme";
import { ProjectStatus } from "@/types";

export function Screen({
  children,
  scroll = true,
}: PropsWithChildren<{ scroll?: boolean }>) {
  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={styles.screen}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.screen, { flex: 1 }]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

export function Workspace({ preview, controls }: { preview: ReactNode; controls: ReactNode }) {
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  return <View style={{ flexDirection: wide ? "row" : "column", alignItems: "flex-start", gap: spacing.lg }}>
    <View style={{ flex: wide ? 1.35 : undefined, width: wide ? undefined : "100%", minWidth: 0, gap: spacing.md }}>{preview}</View>
    <View style={{ flex: wide ? 1 : undefined, width: wide ? undefined : "100%", minWidth: 0, gap: spacing.md }}>{controls}</View>
  </View>;
}

export function CollapsibleCard({ title, children }: PropsWithChildren<{ title: string }>) {
  const [open, setOpen] = React.useState(true);
  return <Card><Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen(!open)} style={{ minHeight: 48, justifyContent: "center" }}><Text style={uiStyles.h3}>{open ? "−" : "+"} {title}</Text></Pressable>{open ? children : null}</Card>;
}

export function Card({
  children,
  style,
}: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Button({
  title,
  onPress,
  variant = "primary",
  disabled = false,
}: {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        styles[`button_${variant}`],
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Text
        style={[
          styles.buttonText,
          variant === "secondary" && { color: colors.text },
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

export function Input({
  label,
  error,
  keyboardType,
  ...props
}: TextInputProps & {
  label: string;
  error?: string;
  keyboardType?: KeyboardTypeOptions;
}) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.muted}
        keyboardType={keyboardType}
        style={[
          styles.input,
          error && styles.inputError,
          props.multiline && { minHeight: 96, textAlignVertical: "top" },
        ]}
        {...props}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

export function EmptyState({
  icon = "✦",
  title,
  message,
  action,
}: {
  icon?: string;
  title: string;
  message: string;
  action?: ReactNode;
}) {
  return (
    <Card style={styles.empty}>
      <Text style={styles.emptyIcon}>{icon}</Text>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.muted}>{message}</Text>
      {action}
    </Card>
  );
}

export function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={{ flex: 1 }}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.muted}>{subtitle}</Text> : null}
      </View>
      {action}
    </View>
  );
}

export function StatusBadge({ status }: { status: ProjectStatus }) {
  const colour =
    status === "Completed"
      ? colors.success
      : status === "Active"
        ? colors.gold
        : colors.muted;
  return (
    <View style={[styles.badge, { borderColor: colour }]}>
      <Text style={[styles.badgeText, { color: colour }]}>{status}</Text>
    </View>
  );
}

export function Header({
  eyebrow,
  title = "AstroToolkit",
  onSettings,
}: {
  eyebrow?: string;
  title?: string;
  onSettings?: () => void;
}) {
  return (
    <View style={styles.header}>
      <View style={{ flex: 1 }}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.logo}>
          <Text style={{ color: colors.gold }}>✦ </Text>
          {title}
        </Text>
      </View>
      {onSettings ? (
        <Pressable
          accessibilityLabel="About AstroToolkit"
          hitSlop={10}
          onPress={onSettings}
          style={styles.settings}
        >
          <Text style={styles.settingsText}>⚙</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function LoadingState() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={colors.gold} />
      <Text style={styles.muted}>Loading your observatory…</Text>
    </View>
  );
}
export function ErrorBanner({ message }: { message: string }) {
  return (
    <View style={styles.errorBanner}>
      <Text style={styles.error}>{message}</Text>
    </View>
  );
}

export const uiStyles = createThemedStyles((colors) => ({
  title: {
    color: colors.text,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "700",
  },
  h3: { color: colors.text, fontSize: 18, lineHeight: 24, fontWeight: "700" },
  body: { color: colors.text, fontSize: 15, lineHeight: 22 },
  muted: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  chipActive: { backgroundColor: colors.gold, borderColor: colors.gold },
}));

const styles = createThemedStyles((colors) => ({
  safe: { flex: 1, backgroundColor: colors.background },
  screen: { padding: spacing.lg, paddingBottom: 120, gap: spacing.lg, width: "100%", maxWidth: 1400, alignSelf: "center" },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  button: {
    minHeight: 48,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  button_primary: { backgroundColor: colors.gold },
  button_secondary: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
    borderWidth: 1,
  },
  button_danger: { backgroundColor: colors.danger },
  buttonText: { color: colors.background, fontSize: 15, fontWeight: "700" },
  pressed: { opacity: 0.78 },
  disabled: { opacity: 0.45 },
  inputGroup: { gap: spacing.xs },
  label: { color: colors.text, fontSize: 14, fontWeight: "600" },
  input: {
    minHeight: 50,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.input,
    color: colors.text,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  inputError: { borderColor: colors.danger },
  error: { color: colors.danger, fontSize: 13, lineHeight: 18 },
  errorBanner: {
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: "#30151C",
    borderColor: colors.danger,
    borderWidth: 1,
  },
  empty: { alignItems: "center", paddingVertical: spacing.xl },
  emptyIcon: { color: colors.gold, fontSize: 34 },
  emptyTitle: { color: colors.text, fontSize: 18, fontWeight: "700" },
  muted: { color: colors.muted, textAlign: "center", lineHeight: 20 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.md,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 21,
    lineHeight: 28,
    fontWeight: "700",
  },
  badge: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  badgeText: { fontSize: 12, fontWeight: "700" },
  header: { flexDirection: "row", alignItems: "center" },
  eyebrow: {
    color: colors.gold,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    fontWeight: "700",
    marginBottom: 4,
  },
  logo: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.7,
  },
  settings: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  settingsText: { color: colors.text, fontSize: 21 },
  loading: {
    flex: 1,
    minHeight: 260,
    gap: spacing.md,
    alignItems: "center",
    justifyContent: "center",
  },
}));
