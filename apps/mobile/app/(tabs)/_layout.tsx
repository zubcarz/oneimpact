import { Tabs } from 'expo-router';
import { HandHeart, House, MapPin } from 'lucide-react-native';
import { colors } from '@oneimpact/ui-tokens';

/**
 * Tab bar inferior Inicio - Zonas - Aportar (`02-Analisis-Visual/README.md`,
 * decision de adaptacion movil 1). Iconos lucide con stroke 2 como el resto del
 * sistema (`60-design-system.md`); sin `tabBarIcon` react-navigation dibuja un
 * placeholder.
 */
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
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color, size }) => <House color={color} size={size} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="zones"
        options={{
          title: 'Zonas',
          tabBarIcon: ({ color, size }) => <MapPin color={color} size={size} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="subscription"
        options={{
          title: 'Aportar',
          tabBarIcon: ({ color, size }) => <HandHeart color={color} size={size} strokeWidth={2} />,
        }}
      />
    </Tabs>
  );
}
