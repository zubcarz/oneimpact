import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Role } from '@oneimpact/shared';

export interface ProfileMenuProps {
  role: Role;
  unreadNotifications: number;
  onSignOut: () => void;
  onAdminPress: () => void;
  testID?: string;
}

interface MenuRow {
  key: string;
  label: string;
  onPress: () => void;
}

/**
 * Menu del Perfil (`pantallas-nuevas.md`, "Perfil / iPass", linea ~49):
 * Notificaciones (atajo al Dashboard, no duplica `NotificationsSection`),
 * Cerrar sesion, y Panel admin solo para `role === 'ADMIN'`.
 */
export function ProfileMenu({
  role,
  unreadNotifications,
  onSignOut,
  onAdminPress,
  testID,
}: ProfileMenuProps) {
  const rows: MenuRow[] = [
    {
      key: 'notifications',
      label: unreadNotifications > 0 ? `Notificaciones (${unreadNotifications})` : 'Notificaciones',
      onPress: () => router.push('/(app)/dashboard'),
    },
    { key: 'sign-out', label: 'Cerrar sesión', onPress: onSignOut },
  ];
  if (role === Role.ADMIN) {
    rows.push({ key: 'admin', label: 'Panel admin', onPress: onAdminPress });
  }

  return (
    <View className="gap-3" testID={testID}>
      {rows.map((row) => (
        <Pressable
          key={row.key}
          accessibilityRole="button"
          accessibilityLabel={row.label}
          onPress={row.onPress}
          className="min-h-[44px] justify-center rounded-2xl bg-white px-5 py-4 active:opacity-80"
        >
          <Text className="text-base font-bold text-gray-900">{row.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}
