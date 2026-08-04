import { Tabs } from "expo-router";
import { Text } from "react-native";
import { useTheme } from "@/theme";

const icons: Record<string, string> = {
  tonight: "☾",
  catalogue: "✦",
  calculate: "⌁",
  journal: "▤",
  equipment: "⌾",
};
export default function TabLayout() {
  const { colors } = useTheme();
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.gold,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 78,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600", marginBottom: 8 },
        tabBarIcon: ({ color }) => (
          <Text style={{ color, fontSize: 21 }}>
            {icons[route.name] ?? "•"}
          </Text>
        ),
      })}
    >
      <Tabs.Screen name="tonight" options={{ title: "Tonight" }} />
      <Tabs.Screen name="catalogue" options={{ title: "Catalogue" }} />
      <Tabs.Screen name="calculate" options={{ title: "Calculate" }} />
      <Tabs.Screen name="journal" options={{ title: "Journal" }} />
      <Tabs.Screen name="equipment" options={{ title: "Equipment" }} />
    </Tabs>
  );
}
