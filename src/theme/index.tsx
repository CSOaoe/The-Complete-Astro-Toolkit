import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SystemUI from "expo-system-ui";
import React, { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from "react";
import { ImageStyle, StyleSheet, TextStyle, ViewStyle } from "react-native";

export type ThemeMode = "light" | "dark" | "red";
export interface ThemeColors {
  background: string; surface: string; surfaceElevated: string; border: string;
  text: string; muted: string; gold: string; blue: string; success: string;
  danger: string; warning: string; input: string;
}

export const palettes: Record<ThemeMode, ThemeColors> = {
  dark: { background: "#050812", surface: "#0D1423", surfaceElevated: "#131D30", border: "#24314A", text: "#F7F8FC", muted: "#91A0B8", gold: "#D8B56A", blue: "#789BFF", success: "#67C7A1", danger: "#F07C86", warning: "#E8B96A", input: "#0A1020" },
  light: { background: "#F3F5FA", surface: "#FFFFFF", surfaceElevated: "#E9EDF5", border: "#CCD3E0", text: "#131927", muted: "#5D687A", gold: "#8B641B", blue: "#315FC5", success: "#187756", danger: "#B42335", warning: "#986A10", input: "#F0F2F7" },
  red: { background: "#070000", surface: "#120000", surfaceElevated: "#220000", border: "#4A1111", text: "#FF5B4D", muted: "#B83A32", gold: "#FF3024", blue: "#E34136", success: "#FF5549", danger: "#FF1F18", warning: "#FF463A", input: "#0D0000" },
};

let activeMode: ThemeMode = "dark";
export let colors: ThemeColors = palettes.dark;
function activate(mode: ThemeMode) { activeMode = mode; colors = palettes[mode]; }

type NamedStyles = Record<string, ViewStyle | TextStyle | ImageStyle>;
function adaptCustomColours<T extends NamedStyles>(styles: T, mode: ThemeMode): T {
  if (mode === "dark") return styles;
  const palette = palettes[mode];
  return Object.fromEntries(Object.entries(styles).map(([name, style]) => [name, Object.fromEntries(Object.entries(style).map(([property, value]) => {
    if (typeof value !== "string" || !property.toLowerCase().includes("color") || !value.startsWith("#")) return [property, value];
    if (Object.values(palette).includes(value)) return [property, value];
    if (mode === "light") return [property, property === "color" ? palette.text : palette.surfaceElevated];
    const raw = value.slice(1); const rgb = raw.length >= 6 ? [raw.slice(0, 2), raw.slice(2, 4), raw.slice(4, 6)].map((part) => Number.parseInt(part, 16)) : [80, 0, 0];
    const intensity = Math.max(18, Math.min(255, Math.round(rgb[0] * 0.3 + rgb[1] * 0.59 + rgb[2] * 0.11))); const alpha = raw.length === 8 ? raw.slice(6, 8) : "";
    return [property, `#${intensity.toString(16).padStart(2, "0")}0000${alpha}`];
  }))])) as T;
}
export function createThemedStyles<T extends NamedStyles>(factory: (theme: ThemeColors) => T): T {
  const cache = new Map<ThemeMode, T>();
  return new Proxy({} as T, {
    get(_target, property: string) {
      let sheet = cache.get(activeMode);
      if (!sheet) { sheet = StyleSheet.create(adaptCustomColours(factory(palettes[activeMode]), activeMode)) as T; cache.set(activeMode, sheet); }
      return sheet[property];
    },
  });
}

const KEY = "@astrotoolkit/theme";
const ThemeContext = createContext<{ mode: ThemeMode; setMode(mode: ThemeMode): Promise<void>; colors: ThemeColors } | null>(null);

export function ThemeProvider({ children }: PropsWithChildren) {
  const [mode, setModeState] = useState<ThemeMode>("dark");
  useEffect(() => { AsyncStorage.getItem(KEY).then((stored) => { if (stored === "light" || stored === "dark" || stored === "red") { activate(stored); setModeState(stored); } }); }, []);
  useEffect(() => { activate(mode); void SystemUI.setBackgroundColorAsync(palettes[mode].background); }, [mode]);
  const setMode = async (next: ThemeMode) => { activate(next); setModeState(next); await AsyncStorage.setItem(KEY, next); };
  const value = useMemo(() => ({ mode, setMode, colors: palettes[mode] }), [mode]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useTheme must be used inside ThemeProvider");
  return value;
}

export const spacing = { xs: 6, sm: 10, md: 16, lg: 24, xl: 32 } as const;
export const radius = { sm: 10, md: 16, lg: 22, pill: 999 } as const;
