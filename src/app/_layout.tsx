import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppDataProvider } from '@/context/AppDataContext';
import { colors } from '@/theme';

export default function RootLayout() {
  return <AppDataProvider><StatusBar style="light" /><Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}><Stack.Screen name="(tabs)" /><Stack.Screen name="catalogue/[id]" /><Stack.Screen name="location" options={{ presentation: 'modal' }} /><Stack.Screen name="about" options={{ presentation: 'modal' }} /></Stack></AppDataProvider>;
}
