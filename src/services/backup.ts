import AsyncStorage from "@react-native-async-storage/async-storage";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";
import { isBackupKey, parseBackup, PortableBackup } from "@/utils/backup";

export async function shareBackup(text: string) {
  if (Platform.OS === "web") {
    const url = URL.createObjectURL(
      new Blob([text], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "AstroToolkit-backup.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }
  const file = new File(Paths.cache, "AstroToolkit-backup.json");
  file.write(text);
  if (!(await Sharing.isAvailableAsync()))
    throw new Error("File sharing is unavailable on this device.");
  await Sharing.shareAsync(file.uri, {
    mimeType: "application/json",
    dialogTitle: "Save AstroToolkit backup",
    UTI: "public.json",
  });
}
export async function makeBackup(defaultData: Record<string, string>) {
  const keys = (await AsyncStorage.getAllKeys()).filter(isBackupKey);
  const stored = await AsyncStorage.multiGet(keys);
  const data = {
    ...defaultData,
    ...Object.fromEntries(
      stored.filter((p): p is [string, string] => p[1] !== null),
    ),
  };
  return parseBackup(
    JSON.stringify({
      format: "AstroToolkit",
      version: 1,
      createdAt: new Date().toISOString(),
      data,
    }),
  );
}
export async function restoreBackup(backup: PortableBackup) {
  const checked = parseBackup(JSON.stringify(backup));
  const keys = Object.keys(checked.data);
  const previous = await AsyncStorage.multiGet(keys);
  // A recovery copy is kept before any replacement, including on successful import.
  await AsyncStorage.setItem(
    "@astrotoolkit/backup-recovery",
    JSON.stringify(previous),
  );
  try {
    await AsyncStorage.multiSet(Object.entries(checked.data));
  } catch (error) {
    await AsyncStorage.multiSet(
      previous.filter((p): p is [string, string] => p[1] !== null),
    );
    await AsyncStorage.multiRemove(
      previous.filter((p) => p[1] === null).map((p) => p[0]),
    );
    throw error;
  }
}
