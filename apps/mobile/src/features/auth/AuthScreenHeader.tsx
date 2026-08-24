import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackButton } from '@/components/ui';

export interface AuthScreenHeaderProps {
  onBack: () => void;
  /**
   * Titulo corto de la pantalla, en espanol. Opcional pero recomendado: un
   * chevron solo no dice donde esta uno ni a donde vuelve, y estas tres
   * pantallas son pasos de un flujo (`pantallas-nuevas.md:23-56`).
   */
  title?: string;
  testID?: string;
}

/**
 * Header compartido por Registro, Pago simulado y Login
 * (`pantallas-nuevas.md:24,29,54`): `BackButton` en tono `solid` sobre el fondo
 * crema de esas tres pantallas, con el titulo del paso al lado. A diferencia de
 * `components/layout/Header` (logo + menu, absoluto sobre una foto), este vive
 * en el flujo normal del contenido, arriba del `Stepper`. Sin padding
 * horizontal propio: la pantalla que lo usa ya envuelve todo su contenido en el
 * mismo `px-5` (`pantallas-nuevas.md` fija 20 de padding de pagina para estas
 * pantallas).
 */
export function AuthScreenHeader({ onBack, title, testID }: AuthScreenHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      className="flex-row items-center gap-3"
      style={{ paddingTop: insets.top + 12 }}
      testID={testID}
    >
      <BackButton onPress={onBack} tone="solid" />
      {title !== undefined ? (
        <Text className="text-base font-bold text-gray-900" accessibilityRole="header">
          {title}
        </Text>
      ) : null}
    </View>
  );
}
