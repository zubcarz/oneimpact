import { Pressable, Text, View } from 'react-native';
import type { NotificationItem as NotificationItemType } from '@oneimpact/shared';
import { cx } from './cx';

export interface NotificationItemProps {
  notification: NotificationItemType;
  onPress?: () => void;
  testID?: string;
}

/** Hora corta en espanol, ej. "14:05" (`pantallas-nuevas.md`, "Dashboard", linea 44). */
function formatTime(createdAt: string): string {
  return new Date(createdAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Fila de notificacion del Dashboard: punto lima si no esta leida, titulo,
 * cuerpo y hora. Presentacional pura, la marca como leida la corre el caller
 * via `onPress` (`useMarkNotificationRead`, `app/(app)/dashboard.tsx`).
 */
export function NotificationItem({ notification, onPress, testID }: NotificationItemProps) {
  const isUnread = !notification.readAt;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={notification.title}
      onPress={onPress}
      testID={testID}
      className="min-h-[44px] flex-row items-start gap-3 py-3 active:opacity-80"
    >
      <View
        className={cx('mt-1.5 h-2 w-2 rounded-full', isUnread ? 'bg-accent' : 'bg-transparent')}
      />
      <View className="flex-1">
        <Text className="text-sm font-bold text-gray-900">{notification.title}</Text>
        <Text className="mt-0.5 text-sm text-gray-500">{notification.body}</Text>
      </View>
      <Text className="text-xs text-gray-400">{formatTime(notification.createdAt)}</Text>
    </Pressable>
  );
}
