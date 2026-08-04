import { useState } from "react";
import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import { Text, View } from "react-native";
import { Button, Card, ErrorBanner, Header, Screen, SectionHeader, uiStyles } from "@/components/ui";
import { analysePhd2Log, GuidingAnalysis } from "@/utils/phd2";
import { createThemedStyles, spacing } from "@/theme";

export default function Phd2LogScreen() {
  const [result, setResult] = useState<GuidingAnalysis | null>(null); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const choose = async () => { setError(""); const picked = await DocumentPicker.getDocumentAsync({ type: ["text/plain", "text/csv", "*/*"], copyToCacheDirectory: true }); if (picked.canceled) return; setBusy(true); try { setResult(analysePhd2Log(await new File(picked.assets[0].uri).text())); } catch (reason) { setError(reason instanceof Error ? reason.message : "This PHD2 log could not be analysed."); } finally { setBusy(false); } };
  return <Screen><Header eyebrow="Guiding diagnostics" title="PHD2 Log Analyser" /><Text style={uiStyles.muted}>Import a PHD2 guide log for a local RMS, drift and excursion review. No log leaves the device.</Text>{error ? <ErrorBanner message={error} /> : null}<Button title={busy ? "Analysing guide samples…" : "Choose PHD2 guide log"} onPress={() => void choose()} disabled={busy} />
    {result ? <><Card style={styles.hero}><Text style={styles.verdict}>{result.verdict}</Text><Text style={styles.total}>{result.totalRms.toFixed(2)}{result.unit} total RMS</Text><Text style={uiStyles.muted}>{result.samples.toLocaleString()} guide samples analysed</Text></Card><View style={styles.grid}><Metric label="RA RMS" value={`${result.raRms.toFixed(2)}${result.unit}`} /><Metric label="DEC RMS" value={`${result.decRms.toFixed(2)}${result.unit}`} /><Metric label="PEAK ERROR" value={`${result.peakError.toFixed(2)}${result.unit}`} /><Metric label="ERROR SAMPLES" value={`${result.lostFrames}`} /></View><SectionHeader title="What the log suggests" /><Card>{result.notes.map((note) => <Text key={note} style={uiStyles.body}>• {note}</Text>)}</Card><Text style={styles.note}>RMS alone cannot diagnose every mount problem. Confirm suspicious results against PHD2 Calibration Review and Guiding Assistant.</Text></> : null}
  </Screen>;
}
function Metric({ label, value }: { label: string; value: string }) { return <Card style={styles.metric}><Text style={styles.label}>{label}</Text><Text style={styles.value}>{value}</Text></Card>; }
const styles = createThemedStyles((colors) => ({ hero: { alignItems: "center", borderColor: colors.gold }, verdict: { color: colors.success, fontWeight: "900", letterSpacing: 1.5 }, total: { color: colors.gold, fontSize: 30, fontWeight: "900" }, grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }, metric: { width: "47%", flexGrow: 1 }, label: { color: colors.muted, fontSize: 9, fontWeight: "900" }, value: { color: colors.text, fontSize: 20, fontWeight: "800" }, note: { color: colors.muted, fontSize: 11, lineHeight: 17, textAlign: "center" } }));
