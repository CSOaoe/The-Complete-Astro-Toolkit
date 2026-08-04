import { useMemo, useState } from "react";
import { Text, View } from "react-native";
import { Button, Card, ErrorBanner, Header, Input, Screen, SectionHeader, uiStyles } from "@/components/ui";
import { useAppData } from "@/context/AppDataContext";
import { analyseVCurve, criticalFocusZone } from "@/utils/focus";
import { createThemedStyles, spacing } from "@/theme";

export default function AutofocusScreen() {
  const { equipment } = useAppData(); const scope = equipment.telescopes[0]; const [ratio, setRatio] = useState(String(scope?.focalRatio ?? 5)); const [wavelength, setWavelength] = useState("550"); const [positions, setPositions] = useState("960,980,1000,1020,1040,1060,1080"); const [hfr, setHfr] = useState("4.2,3.3,2.6,2.1,2.5,3.2,4.1"); const [error, setError] = useState(""); const [curve, setCurve] = useState<ReturnType<typeof analyseVCurve> | null>(null);
  const cfz = useMemo(() => { try { return criticalFocusZone(Number(ratio), Number(wavelength)); } catch { return 0; } }, [ratio, wavelength]);
  const analyse = () => { try { setCurve(analyseVCurve(positions.split(",").map(Number), hfr.split(",").map(Number))); setError(""); } catch (reason) { setError(reason instanceof Error ? reason.message : "The curve could not be analysed."); setCurve(null); } };
  return <Screen><Header eyebrow="Focus engineering" title="Autofocus Assistant" /><SectionHeader title="Critical focus zone" subtitle="Approximate diffraction-limited focus tolerance" /><Card><View style={styles.row}><View style={{ flex: 1 }}><Input label="Focal ratio" value={ratio} onChangeText={setRatio} keyboardType="decimal-pad" /></View><View style={{ flex: 1 }}><Input label="Wavelength (nm)" value={wavelength} onChangeText={setWavelength} keyboardType="number-pad" /></View></View><Text style={styles.cfz}>{cfz.toFixed(1)} µm</Text><Text style={uiStyles.muted}>Total approximate critical focus zone. Real seeing, sampling and focuser mechanics can dominate this value.</Text></Card><SectionHeader title="V-curve review" subtitle="Paste matching comma-separated focuser positions and HFR measurements" /><Card><Input label="Focuser positions" value={positions} onChangeText={setPositions} /><Input label="HFR values" value={hfr} onChangeText={setHfr} />{error ? <ErrorBanner message={error} /> : null}<Button title="Analyse V-curve" onPress={analyse} /></Card>
    {curve ? <Card style={styles.result}><Text style={styles.best}>Best focus: {Math.round(curve.bestPosition)}</Text><Text style={uiStyles.body}>Predicted HFR {curve.predictedHfr.toFixed(2)} · slope symmetry {Math.round(curve.symmetry * 100)}%</Text><Text style={uiStyles.muted}>{curve.symmetry < 0.65 ? "The two sides are uneven. Check backlash, step size or star measurement consistency." : "The two sides are reasonably balanced for a useful autofocus run."}</Text></Card> : null}
  </Screen>;
}
const styles = createThemedStyles((colors) => ({ row: { flexDirection: "row", gap: spacing.sm }, cfz: { color: colors.gold, fontSize: 38, fontWeight: "900", textAlign: "center" }, result: { borderColor: colors.gold }, best: { color: colors.gold, fontSize: 24, fontWeight: "900" } }));
