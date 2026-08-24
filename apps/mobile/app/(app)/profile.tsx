import { Text } from 'react-native';
import { Screen } from '@/components/layout';

/**
 * TODO(Fase 4 del plan `20260824-mobile-dashboard-and-profile.plan.md`):
 * reemplazar por la pantalla real de Perfil/iPass (`02-Analisis-Visual/pantallas/pantallas-nuevas.md`,
 * seccion "Perfil / iPass (`/(app)/profile`)"). Este archivo solo existe para
 * que la tab "Perfil" (`./_layout.tsx`) tenga una ruta real que compile y
 * navegue.
 */
export default function ProfileScreen() {
  return (
    <Screen bg="bg-cream">
      <Text className="p-6 text-lg font-bold text-gray-900" accessibilityRole="header">
        Perfil
      </Text>
    </Screen>
  );
}
