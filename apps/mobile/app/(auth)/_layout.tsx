import { Stack } from 'expo-router';

/**
 * Grupo publico del flujo Registro -> Pago -> Bienvenida -> Login
 * (`pantallas-nuevas.md:23-56`). Cada pantalla arma su propio header
 * (`AuthScreenHeader`), asi que este `Stack` no muestra el header nativo.
 */
export default function AuthGroupLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
