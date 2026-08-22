import { Tabs } from 'expo-router';
import { colors } from '@oneimpact/ui-tokens';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: 'rgba(255,255,255,0.6)',
        tabBarStyle: { backgroundColor: colors.forest, borderTopColor: 'rgba(255,255,255,0.1)' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Inicio' }} />
      <Tabs.Screen name="zones" options={{ title: 'Zonas' }} />
      <Tabs.Screen name="subscription" options={{ title: 'Aportar' }} />
    </Tabs>
  );
}
