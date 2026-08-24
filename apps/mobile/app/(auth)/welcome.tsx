import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { Screen } from '@/components/layout';
import { Button } from '@/components/ui';
import { WelcomeCheck } from '@/features/auth';

/**
 * `/(auth)/welcome` (`pantallas-nuevas.md:35-37`): pantalla lima full,
 * check animado, copy fijo del spec. `router.replace`, no `push`: el back no
 * debe volver al pago (la suscripcion ya quedo activa del lado del servidor).
 */
export default function WelcomeScreen() {
  const handleContinue = () => router.replace('/(app)/dashboard');

  return (
    <Screen statusBar="dark" bg="bg-accent" scroll={false} contentContainerClassName="px-8">
      <View className="flex-1 items-center justify-center gap-6">
        <WelcomeCheck testID="welcome-check" />
        <Text accessibilityRole="header" className="text-center font-black text-3xl text-gray-900">
          ¡Bienvenido a tu travesía!
        </Text>
        <Text className="text-center text-base text-gray-800">
          Tu primer punto ya está registrado
        </Text>
      </View>
      <View className="pb-10">
        <Button
          variant="dark"
          size="lg"
          fullWidth
          label="Ir a mi dashboard"
          onPress={handleContinue}
          testID="welcome-continue"
        />
      </View>
    </Screen>
  );
}
