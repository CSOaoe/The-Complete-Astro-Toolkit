import { useRef, useState } from "react";
import { Text } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import {
  Button,
  Card,
  Input,
  Screen,
  SectionHeader,
  uiStyles,
} from "@/components/ui";
import { useAppData } from "@/context/AppDataContext";
import { useTheme } from "@/theme";
import { makeBackup, restoreBackup, shareBackup } from "@/services/backup";
import { parseBackup, PortableBackup } from "@/utils/backup";

export default function BackupScreen() {
  const data = useAppData();
  const { setMode } = useTheme();
  const [preview, setPreview] = useState<PortableBackup | null>(null);
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const run = async (job: () => Promise<void>) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    try {
      await job();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Backup operation failed.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const exportFile = () =>
    run(async () => {
      const defaults = Object.fromEntries(
        Object.entries({
          projects: data.projects,
          equipment: data.equipment,
          favourites: data.favourites,
          observer: data.observer,
          sessions: data.sessions,
          horizon: data.horizon,
          calibration: data.calibrationFrames,
        }).map(([k, v]) => [`@astrotoolkit/${k}`, JSON.stringify(v)]),
      );
      await shareBackup(JSON.stringify(await makeBackup(defaults), null, 2));
      setStatus("Backup prepared. Save it using your device’s share options.");
    });
  const pick = () =>
    run(async () => {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/json", "text/plain"],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      if ((asset.size ?? 0) > 10_000_000)
        throw new Error("Backup exceeds the 10 MB limit.");
      const text = asset.file
        ? await asset.file.text()
        : await new File(asset.uri).text();
      setPreview(parseBackup(text));
      setConfirm("");
      setStatus("File checked. Review the contents before restoring.");
    });
  return (
    <Screen>
      <SectionHeader
        title="Backup & restore"
        subtitle="Portable observing data, without an account"
      />
      <Card>
        <Text style={uiStyles.body}>
          Includes equipment, journals, sessions, favourites, horizon,
          calibration records, saved compositions and supported settings.
          Downloaded survey images and local photo overlays must be downloaded
          or selected again on another device.
        </Text>
      </Card>
      <Button
        title="Export backup file"
        disabled={busy || data.loading}
        onPress={() => void exportFile()}
      />
      <Button
        title="Choose backup to preview"
        variant="secondary"
        disabled={busy}
        onPress={() => void pick()}
      />
      {preview ? (
        <Card>
          <Text style={uiStyles.h3}>
            Backup from {new Date(preview.createdAt).toLocaleString()}
          </Text>
          {Object.entries(preview.data).map(([key, raw]) => {
            const v = key.endsWith("/theme") ? raw : JSON.parse(raw);
            return (
              <Text key={key} style={uiStyles.body}>
                {key.replace("@astrotoolkit/", "")}:{" "}
                {Array.isArray(v)
                  ? `${v.length} records`
                  : key.endsWith("/equipment")
                    ? `${v.telescopes.length} telescopes, ${v.cameras.length} cameras, ${v.rigs.length} rigs`
                    : "included"}
              </Text>
            );
          })}
          <Text style={uiStyles.muted}>
            Restoring replaces the categories listed above on this device.
            Export a backup of your current data first.
          </Text>
          <Input
            label="Type RESTORE to confirm replacement"
            value={confirm}
            onChangeText={setConfirm}
            autoCapitalize="characters"
          />
          <Button
            title="Restore these records"
            variant="danger"
            disabled={busy || confirm !== "RESTORE"}
            onPress={() =>
              void run(async () => {
                await restoreBackup(preview);
                data.reloadData();
                const theme = preview.data["@astrotoolkit/theme"];
                if (theme === "light" || theme === "dark" || theme === "red")
                  await setMode(theme);
                setPreview(null);
                setStatus("Backup restored.");
              })
            }
          />
          <Button
            title="Cancel restore"
            variant="secondary"
            disabled={busy}
            onPress={() => setPreview(null)}
          />
        </Card>
      ) : null}
      <Text style={uiStyles.muted} accessibilityLiveRegion="polite">
        {status}
      </Text>
    </Screen>
  );
}
