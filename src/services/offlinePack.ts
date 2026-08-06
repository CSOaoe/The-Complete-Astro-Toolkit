import AsyncStorage from "@react-native-async-storage/async-storage";
import { Directory, File, Paths } from "expo-file-system";
import { Platform } from "react-native";
import { EquipmentState, HorizonProfile, ImagingSession, ObserverLocation } from "@/types";
import { WeatherHour } from "@/services/weather";
import { collectOfflineTargets } from "@/utils/offlineTargets";
import { surveyImageUrl, targetImageFov } from "@/utils/surveyImages";

const KEY = "@astrotoolkit/offline-field-pack";
const DIRECTORY = "astrotoolkit-field-pack";

export interface OfflinePackTarget {
  id: string;
  name: string;
  catalogue: string;
  raHours: number;
  decDegrees: number;
  imageUri: string | null;
}

export interface OfflineFieldPack {
  createdAt: string;
  observer: ObserverLocation;
  equipment: EquipmentState;
  horizon: HorizonProfile;
  sessions: ImagingSession[];
  weather: WeatherHour[];
  targets: OfflinePackTarget[];
  imageCount: number;
  nativeFiles: boolean;
}

export async function createOfflineFieldPack({ observer, equipment, horizon, sessions, weather, favourites }: {
  observer: ObserverLocation;
  equipment: EquipmentState;
  horizon: HorizonProfile;
  sessions: ImagingSession[];
  weather: WeatherHour[];
  favourites: string[];
}) {
  const objects = collectOfflineTargets(favourites, sessions);
  let directory: Directory | null = null;
  if (Platform.OS !== "web") {
    directory = new Directory(Paths.document, DIRECTORY);
    directory.create({ idempotent: true, intermediates: true });
  }
  const targets: OfflinePackTarget[] = [];
  for (const target of objects) {
    let imageUri: string | null = null;
    if (directory) {
      const destination = new File(directory, `${target.id.replace(/[^a-z0-9-]/gi, "-")}.jpg`);
      try {
        const file = await File.downloadFileAsync(surveyImageUrl({
          raHours: target.raHours,
          decDegrees: target.decDegrees,
          fovDegrees: targetImageFov(target),
          width: 1000,
          height: 700,
        }), destination, { idempotent: true });
        imageUri = file.uri;
      } catch {
        imageUri = destination.exists ? destination.uri : null;
      }
    }
    targets.push({ id: target.id, name: target.name, catalogue: target.catalogue, raHours: target.raHours, decDegrees: target.decDegrees, imageUri });
  }
  const pack: OfflineFieldPack = {
    createdAt: new Date().toISOString(), observer, equipment, horizon,
    sessions: sessions.filter((item) => item.status === "Planned"), weather: weather.slice(0, 24), targets,
    imageCount: targets.filter((item) => item.imageUri).length, nativeFiles: Platform.OS !== "web",
  };
  await AsyncStorage.setItem(KEY, JSON.stringify(pack));
  if (directory) new File(directory, "manifest.json").write(JSON.stringify(pack));
  return pack;
}

export async function loadOfflineFieldPack() {
  const stored = await AsyncStorage.getItem(KEY);
  return stored ? JSON.parse(stored) as OfflineFieldPack : null;
}

export async function deleteOfflineFieldPack() {
  await AsyncStorage.removeItem(KEY);
  if (Platform.OS !== "web") {
    const directory = new Directory(Paths.document, DIRECTORY);
    if (directory.exists) directory.delete();
  }
}
