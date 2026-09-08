import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Brightness from "expo-brightness";
import * as Haptics from "expo-haptics";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import React, { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Platform, Pressable, Text } from "react-native";
import { createThemedStyles, ThemeMode, useTheme } from "@/theme";

const KEY = "@astrotoolkit/field-mode";
const WAKE_TAG = "astrotoolkit-field-mode";

interface SavedFieldMode {
  active: boolean;
  previousTheme: ThemeMode;
  previousBrightness: number | null;
}

interface FieldModeValue {
  active: boolean;
  ready: boolean;
  toggle(): Promise<void>;
}

const FieldModeContext = createContext<FieldModeValue | null>(null);

export function FieldModeProvider({ children }: PropsWithChildren) {
  const { mode, setMode } = useTheme();
  const [active, setActive] = useState(false);
  const [ready, setReady] = useState(false);
  const toggling = useRef(false);
  const previousTheme = useRef<ThemeMode>("dark");
  const previousBrightness = useRef<number | null>(null);

  useEffect(() => {
    let mounted = true;
    void AsyncStorage.getItem(KEY)
      .then(async (stored) => {
        if (!stored || !mounted) return;
        const saved = JSON.parse(stored) as SavedFieldMode;
        if (!saved || typeof saved !== "object") return;
        previousTheme.current = ["light", "dark", "red"].includes(saved.previousTheme) ? saved.previousTheme : "dark";
        previousBrightness.current = typeof saved.previousBrightness === "number" && Number.isFinite(saved.previousBrightness) && saved.previousBrightness >= 0 && saved.previousBrightness <= 1 ? saved.previousBrightness : null;
        if (saved.active === true) {
          setActive(true);
          await setMode("red");
        }
      })
      .catch(() => undefined)
      .finally(() => { if (mounted) setReady(true); });
    return () => { mounted = false; };
  }, [setMode]);

  useEffect(() => {
    if (!ready) return;
    if (active) {
      if (Platform.OS !== "web") {
        void activateKeepAwakeAsync(WAKE_TAG).catch(() => undefined);
        void Brightness.setBrightnessAsync(0.05).catch(() => undefined);
      }
    } else if (Platform.OS !== "web") {
      void deactivateKeepAwake(WAKE_TAG).catch(() => undefined);
    }
  }, [active, ready]);

  const toggle = useCallback(async () => {
    if (!ready || toggling.current) return;
    toggling.current = true;
    try {
      if (!active) {
        previousTheme.current = mode;
        if (Platform.OS !== "web") {
          previousBrightness.current = await Brightness.getBrightnessAsync().catch(() => null);
        }
        setActive(true);
        await setMode("red").catch(() => undefined);
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
        await AsyncStorage.setItem(KEY, JSON.stringify({
          active: true,
          previousTheme: previousTheme.current,
          previousBrightness: previousBrightness.current,
        } satisfies SavedFieldMode));
        return;
      }
      setActive(false);
      await setMode(previousTheme.current).catch(() => undefined);
      if (Platform.OS !== "web" && previousBrightness.current !== null) {
        await Brightness.setBrightnessAsync(previousBrightness.current).catch(() => undefined);
      }
      if (Platform.OS !== "web") await deactivateKeepAwake(WAKE_TAG).catch(() => undefined);
      await Haptics.selectionAsync().catch(() => undefined);
      await AsyncStorage.setItem(KEY, JSON.stringify({
        active: false,
        previousTheme: previousTheme.current,
        previousBrightness: previousBrightness.current,
      } satisfies SavedFieldMode));
    } catch {
      Alert.alert("Field Mode settings", "Your screen setting changed, but it could not be saved for the next launch. Please try again.");
    } finally {
      toggling.current = false;
    }
  }, [active, mode, ready, setMode]);

  const value = useMemo(() => ({ active, ready, toggle }), [active, ready, toggle]);
  return <FieldModeContext.Provider value={value}>{children}</FieldModeContext.Provider>;
}

export function useFieldMode() {
  const value = useContext(FieldModeContext);
  if (!value) throw new Error("useFieldMode must be used inside FieldModeProvider");
  return value;
}

export function FieldModeQuickControl() {
  const { active, ready, toggle } = useFieldMode();
  if (!ready) return null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={active ? "Turn off field mode" : "Turn on field mode"}
      onPress={() => void toggle()}
      style={({ pressed }) => [styles.quick, active && styles.quickActive, pressed && styles.pressed]}
    >
      <Text style={[styles.quickIcon, active && styles.quickIconActive]}>◐</Text>
      <Text style={[styles.quickText, active && styles.quickTextActive]}>{active ? "FIELD ON" : "FIELD"}</Text>
    </Pressable>
  );
}

const styles = createThemedStyles((colors) => ({
  quick: {
    position: "absolute",
    right: 14,
    bottom: 91,
    minWidth: 68,
    minHeight: 48,
    paddingHorizontal: 10,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 8,
  },
  quickActive: { borderColor: colors.gold, backgroundColor: colors.input },
  quickIcon: { color: colors.gold, fontSize: 15, lineHeight: 16 },
  quickIconActive: { color: colors.text },
  quickText: { color: colors.text, fontSize: 8, fontWeight: "900", letterSpacing: 0.5 },
  quickTextActive: { color: colors.gold },
  pressed: { opacity: 0.72 },
}));
