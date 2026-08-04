import AsyncStorage from "@react-native-async-storage/async-storage";
import { parseTle } from "@/utils/satelliteTrails";

const URL = "https://celestrak.org/NORAD/elements/gp.php?GROUP=visual&FORMAT=TLE";
const CACHE_KEY = "@astrotoolkit/visual-satellites";

export async function fetchVisualSatellites() {
  try {
    const response = await fetch(URL);
    if (!response.ok) throw new Error("CelesTrak is unavailable.");
    const text = await response.text();
    const value = { fetchedAt: new Date().toISOString(), text };
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(value));
    return { tles: parseTle(text), fetchedAt: value.fetchedAt, cached: false };
  } catch (error) {
    const stored = await AsyncStorage.getItem(CACHE_KEY);
    if (!stored) throw error;
    const value = JSON.parse(stored) as { fetchedAt: string; text: string };
    return { tles: parseTle(value.text), fetchedAt: value.fetchedAt, cached: true };
  }
}
