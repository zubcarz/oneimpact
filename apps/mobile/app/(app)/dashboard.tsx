import { Text } from 'react-native';
import { Screen } from '@/components/layout';
import { useAuth } from '@/auth';

/**
 * TODO(item 10): replace this placeholder entirely with the real dashboard
 * screen (JourneyPoints, followed projects, notifications --
 * `02-Analisis-Visual/pantallas/pantallas-nuevas.md`). This file only exists
 * to prove the `(app)` guard (`./_layout.tsx`) actually protects a route.
 */
export default function DashboardScreen() {
  const { user } = useAuth();

  return (
    <Screen bg="bg-cream">
      <Text className="p-6 text-lg font-bold text-gray-900" accessibilityRole="header">
        Hola, {user?.name ?? ''}
      </Text>
    </Screen>
  );
}
