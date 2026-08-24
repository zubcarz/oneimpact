import { Text, View } from 'react-native';
import { Bell } from 'lucide-react-native';
import { colors } from '@oneimpact/ui-tokens';

export interface DashboardHeaderProps {
  userName: string;
  unreadNotifications: number;
}

/**
 * Header del Dashboard: saludo + inicial en circulo + campana con badge lima
 * si hay notificaciones sin leer (`pantallas-nuevas.md`, "Dashboard", linea 39).
 */
export function DashboardHeader({ userName, unreadNotifications }: DashboardHeaderProps) {
  const initial = userName.charAt(0).toUpperCase();

  return (
    <View className="flex-row items-center justify-between px-5 pt-4">
      <View className="flex-row items-center gap-3">
        <View className="h-11 w-11 items-center justify-center rounded-full bg-dark-green">
          <Text className="text-base font-bold text-white">{initial}</Text>
        </View>
        <Text className="text-xl font-bold text-gray-900" accessibilityRole="header">
          {`Hola, ${userName}`}
        </Text>
      </View>
      <View className="h-11 w-11 items-center justify-center">
        <Bell color={colors.gray900} size={24} strokeWidth={2} />
        {unreadNotifications > 0 ? (
          <View
            className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-accent"
            testID="notifications-badge"
          />
        ) : null}
      </View>
    </View>
  );
}
