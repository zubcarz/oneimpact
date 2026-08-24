import { Pressable, Text, View } from 'react-native';

export interface PaymentDeclinedBannerProps {
  /** Copy de la API para este `402 PAYMENT_DECLINED` (`CARD_DECLINED` / `CARD_EXPIRED`). */
  message: string;
  onRetry: () => void;
  testID?: string;
}

/**
 * Rechazo de pago del paso de Pago simulado (`pantallas-nuevas.md:32`,
 * "rechazo -> banner rojo suave + reintentar"). El `message` que recibe ya
 * fue resuelto por quien llama a partir de `ApiError` una vez ramificado por
 * `code` (`30-api-event-driven.md`, "la UI ramifica por code, nunca por el
 * texto del message"): este componente solo lo muestra, nunca decide nada a
 * partir de el.
 */
export function PaymentDeclinedBanner({ message, onRetry, testID }: PaymentDeclinedBannerProps) {
  return (
    <View
      className="gap-3 rounded-2xl border border-red-200 bg-red-50 p-4"
      accessibilityRole="alert"
      testID={testID}
    >
      <Text className="text-sm font-bold text-red-600">{message}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Reintentar"
        onPress={onRetry}
        className="min-h-[44px] items-center justify-center self-start rounded-full border border-red-300 bg-white px-5 active:opacity-80"
      >
        <Text className="text-xs font-bold text-red-600">Reintentar</Text>
      </Pressable>
    </View>
  );
}
