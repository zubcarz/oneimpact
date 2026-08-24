import { Text, View } from 'react-native';
import type { NotificationItem as NotificationItemType } from '@oneimpact/shared';
import { NotificationItem, SectionHeader } from '@/components/ui';

export interface NotificationsSectionProps {
  notifications: NotificationItemType[];
  onPressNotification: (id: string) => void;
}

/**
 * Seccion "Notificaciones" del Dashboard: lista simple, sin leer con punto
 * lima (`pantallas-nuevas.md`, "Dashboard", linea 44).
 */
export function NotificationsSection({
  notifications,
  onPressNotification,
}: NotificationsSectionProps) {
  return (
    <View className="px-5 py-6">
      <SectionHeader title="Notificaciones" weight="bold" titleClassName="text-2xl mb-4" />
      {notifications.length === 0 ? (
        <Text className="text-sm text-gray-500">No tenés notificaciones todavía</Text>
      ) : (
        <View className="gap-1">
          {notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onPress={() => onPressNotification(notification.id)}
            />
          ))}
        </View>
      )}
    </View>
  );
}
