import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { colors } from '@oneimpact/ui-tokens';

export interface AuthScreenHeaderProps {
  onBack: () => void;
  testID?: string;
}

/**
 * Header compartido por Registro, Pago simulado y Login
 * (`pantallas-nuevas.md:24,29,54`): un boton de volver sobre el fondo crema de
 * esas tres pantallas. A diferencia de `components/layout/Header` (logo +
 * menu, absoluto sobre una foto), este vive en el flujo normal del contenido,
 * arriba del `Stepper`. Sin padding horizontal propio: la pantalla que lo usa
 * ya envuelve todo su contenido en el mismo `px-5` (`pantallas-nuevas.md`
 * fija 20 de padding de pagina para estas pantallas).
 */
export function AuthScreenHeader({ onBack, testID }: AuthScreenHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ paddingTop: insets.top + 12 }} testID={testID}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Volver"
        onPress={onBack}
        className="h-11 w-11 items-center justify-center rounded-full border border-black/5 bg-white active:opacity-80"
      >
        <ChevronLeft size={22} color={colors.gray900} />
      </Pressable>
    </View>
  );
}
