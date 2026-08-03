import * as Location from 'expo-location';
import { Href, useRouter } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Input, Screen, uiStyles } from '@/components/ui';
import { useAppData } from '@/context/AppDataContext';
import { colors, spacing } from '@/theme';

function coordinate(value: number, positive: string, negative: string) { return `${Math.abs(value).toFixed(4)}° ${value >= 0 ? positive : negative}`; }

export default function LocationScreen() {
  const router = useRouter(); const { observer, saveObserver } = useAppData();
  const [label, setLabel] = useState(observer.source === 'default' ? '' : observer.label);
  const [latitude, setLatitude] = useState(String(observer.latitude)); const [longitude, setLongitude] = useState(String(observer.longitude));
  const [errors, setErrors] = useState<Record<string, string>>({}); const [locating, setLocating] = useState(false); const [message, setMessage] = useState<string | null>(null);

  const locateDevice = async () => {
    setLocating(true); setMessage(null);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') { setMessage('Location permission was not granted. You can enter coordinates manually below.'); return; }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      let place = 'Current device location';
      if (Platform.OS !== 'web') {
        try { const [address] = await Location.reverseGeocodeAsync(position.coords); place = [address?.city, address?.region, address?.country].filter(Boolean).join(', ') || place; } catch { /* Coordinates remain sufficient for sky calculations. */ }
      }
      const next = { latitude: position.coords.latitude, longitude: position.coords.longitude, label: place, source: 'device' as const, updatedAt: new Date().toISOString() };
      await saveObserver(next); setLatitude(String(next.latitude)); setLongitude(String(next.longitude)); setLabel(next.label); setMessage('Device location saved. Tonight’s recommendations have been recalculated.');
    } catch { setMessage('Your position could not be determined. Check location services or enter coordinates manually.'); }
    finally { setLocating(false); }
  };

  const saveManual = async () => {
    const lat = Number(latitude); const lon = Number(longitude); const next: Record<string, string> = {};
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) next.latitude = 'Enter a latitude from −90 to 90';
    if (!Number.isFinite(lon) || lon < -180 || lon > 180) next.longitude = 'Enter a longitude from −180 to 180';
    if (!label.trim()) next.label = 'Give this observing location a name';
    setErrors(next); if (Object.keys(next).length) return;
    await saveObserver({ latitude: lat, longitude: lon, label: label.trim(), source: 'manual', updatedAt: new Date().toISOString() });
    router.replace('/(tabs)/tonight' as Href);
  };

  return <Screen><View style={styles.nav}><Pressable onPress={() => router.back()}><Text style={styles.close}>Close</Text></Pressable></View><View><Text style={styles.eyebrow}>OBSERVING SITE</Text><Text style={uiStyles.title}>Your night sky</Text><Text style={uiStyles.muted}>AstroToolkit uses latitude, longitude, date and time to rank targets and calculate their altitude from your horizon.</Text></View>
    <Card><Text style={uiStyles.h3}>Current location</Text><Text style={styles.locationName}>{observer.label}</Text><Text style={uiStyles.muted}>{coordinate(observer.latitude, 'N', 'S')} · {coordinate(observer.longitude, 'E', 'W')}</Text><Text style={styles.source}>{observer.source === 'default' ? 'DEFAULT LOCATION — UPDATE RECOMMENDED' : `${observer.source.toUpperCase()} LOCATION`}</Text></Card>
    <Button title={locating ? 'Finding your location…' : 'Use my device location'} disabled={locating} onPress={() => void locateDevice()} />{message ? <Card style={styles.message}><Text style={uiStyles.body}>{message}</Text></Card> : null}
    <View style={styles.divider}><View style={styles.line} /><Text style={styles.or}>OR ENTER A SITE</Text><View style={styles.line} /></View>
    <Card><Input label="Location name" value={label} onChangeText={setLabel} error={errors.label} placeholder="e.g. Kielder Observatory" /><Input label="Latitude" keyboardType="numbers-and-punctuation" value={latitude} onChangeText={setLatitude} error={errors.latitude} placeholder="55.0" /><Input label="Longitude" keyboardType="numbers-and-punctuation" value={longitude} onChangeText={setLongitude} error={errors.longitude} placeholder="−2.6" /><Button title="Save observing site" onPress={() => void saveManual()} /></Card>
    <Card><Text style={uiStyles.h3}>Private and local</Text><Text style={uiStyles.muted}>Your coordinates are stored only on this device. Location is requested only while you use the app; background tracking is not enabled.</Text></Card>
  </Screen>;
}
const styles = StyleSheet.create({ nav: { alignItems: 'flex-end' }, close: { color: colors.blue, fontSize: 16, fontWeight: '600' }, eyebrow: { color: colors.gold, fontSize: 11, letterSpacing: 1.5, fontWeight: '800', marginBottom: 6 }, locationName: { color: colors.text, fontSize: 20, fontWeight: '700' }, source: { color: colors.gold, fontSize: 10, fontWeight: '800', letterSpacing: 1, marginTop: 4 }, message: { borderLeftColor: colors.gold, borderLeftWidth: 3 }, divider: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm }, line: { height: 1, backgroundColor: colors.border, flex: 1 }, or: { color: colors.muted, fontSize: 10, fontWeight: '700', letterSpacing: 1 } });
