import { Image } from 'expo-image';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { Screen } from '@/components/layout';
import { AuthScreenHeader, LoginForm } from '@/features/auth';

const DASHBOARD_PATH = '/(app)/dashboard';
const LOGO_SOURCE = require('@/assets/images/logo-black.png');

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Lista de destinos conocidos para `returnTo`: un valor arbitrario en la URL
 * no debe poder mandar la navegacion fuera de la app (`50-testing-and-verification.md`,
 * "casos negativos"). Cualquier valor fuera de esta lista cae al dashboard.
 */
const KNOWN_RETURN_PATHS = ['/(app)/dashboard', '/(auth)/payment'];

function resolveReturnTo(value: string | string[] | undefined): Href {
  const candidate = firstValue(value);
  if (candidate && KNOWN_RETURN_PATHS.some((path) => candidate.startsWith(path))) {
    return candidate as Href;
  }
  return DASHBOARD_PATH;
}

/**
 * `/(auth)/login?returnTo=` (`pantallas-nuevas.md:54-56`). `returnTo` es el
 * parametro que emite `loginHref` (`src/auth/routes.ts`), usado por
 * `useRequireAuth` cuando el guard de `(app)` expulsa a un invitado. Ruta
 * fina: resuelve el destino y compone las secciones de `@/features/auth`.
 */
export default function LoginScreen() {
  const params = useLocalSearchParams<{ returnTo?: string }>();
  const returnTo = resolveReturnTo(params.returnTo);

  /**
  * `replace` a la home publica, nunca `router.back()`.
  *
  * A esta pantalla se puede llegar por eleccion (el menu) o expulsado: cuando
  * `useRequireAuth` saca a un invitado de `(app)` lo hace con `replace`, o sea
  * que la entrada de la que venia ya no existe. Ahi `back()` no tiene a donde
  * volver, o vuelve a una pantalla de `(app)` que redirige otra vez aca: el
  * login quedaba sin salida. Mandar siempre a `/` es el unico destino que
  * existe en los dos casos, y ademas es lo que "volver" significa desde un
  * login: dejar de intentar entrar y seguir navegando.
  */
  const handleBack = () => router.replace('/');
  const handleSuccess = () => router.replace(returnTo);

  return (
    <Screen statusBar="dark" bg="bg-cream" contentContainerClassName="gap-8 px-5 pb-10">
      <AuthScreenHeader onBack={handleBack} title="Iniciar sesión" />
      <Image
        source={LOGO_SOURCE}
        contentFit="contain"
        style={{ width: 96, height: 38 }}
        accessibilityLabel="One Impact"
      />
      <LoginForm onSuccess={handleSuccess} testID="login-form" />
    </Screen>
  );
}
