import { Alert, Text, View } from 'react-native';
import type { Plan, SubscriptionStatus } from '@oneimpact/shared';
import { Button } from '@/components/ui';

export interface SubscriptionRowProps {
  plan: Plan | null;
  status: SubscriptionStatus | null;
  onCancel: () => void;
  isCanceling: boolean;
  testID?: string;
}

/**
 * Fila "Mi suscripcion" del Perfil (`pantallas-nuevas.md`, "Perfil / iPass",
 * linea ~48). Sin plan activo muestra el estado vacio sin boton; con plan
 * activo (`status === 'ACTIVE'`) muestra "Cancelar" con confirmacion, que
 * aclara -- criterio de aceptacion del spec -- que los puntos permanentes no
 * se pierden.
 */
export function SubscriptionRow({
  plan,
  status,
  onCancel,
  isCanceling,
  testID,
}: SubscriptionRowProps) {
  const handleCancelPress = () => {
    Alert.alert(
      'Cancelar suscripción',
      '¿Seguro que querés cancelar tu suscripción? Vas a dejar de sumar meses activos, pero tus puntos permanentes no se pierden.',
      [
        { text: 'Volver', style: 'cancel' },
        { text: 'Cancelar suscripción', style: 'destructive', onPress: onCancel },
      ],
    );
  };

  return (
    <View className="rounded-2xl bg-white p-5" testID={testID}>
      <Text className="text-base font-bold text-gray-900">Mi suscripción</Text>
      {plan === null ? (
        <Text className="mt-1 text-sm text-gray-500">No tenés un plan activo.</Text>
      ) : (
        <>
          <Text className="mt-1 text-sm text-gray-600">
            {status === 'CANCELED' ? `${plan.name} · Cancelada` : plan.name}
          </Text>
          {status === 'ACTIVE' ? (
            <Button
              label="Cancelar"
              variant="ink"
              onPress={handleCancelPress}
              disabled={isCanceling}
              className="mt-4 self-start"
            />
          ) : null}
        </>
      )}
    </View>
  );
}
