import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginInput } from '@oneimpact/shared';
import { Button, Input } from '@/components/ui';
import { useAuth } from '@/auth';
import { authErrorMessage } from './auth-errors';

export interface LoginFormProps {
  /** Llamado despues de que `signIn` resuelve; la ruta decide a donde navegar. */
  onSuccess: () => void;
  testID?: string;
}

const REGISTER_HREF = '/subscription';

// Credenciales del seed (`apps/api/prisma/seed.ts:26-33`), solo para la demo
// en desarrollo. **Nunca** la del admin en una pantalla de usuario, y nunca
// visible fuera de `__DEV__`.
const SEED_HINT = 'ana@oneimpact.org / User123!';

/**
 * Form de Login (`pantallas-nuevas.md:54-56`). Validacion con `loginSchema` de
 * `@oneimpact/shared` via `zodResolver`. Un `401 INVALID_CREDENTIALS` cae al
 * banner generico (`auth-errors.ts`): nunca se marca uno de los dos campos en
 * particular, para no revelar cual de los dos fallo.
 */
export function LoginForm({ onSuccess, testID }: LoginFormProps) {
  const { signIn } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await signIn(values);
      onSuccess();
    } catch (error) {
      // `code` decide el copy (`auth-errors.ts`); nunca el `message` crudo del
      // servidor. `INVALID_CREDENTIALS` ya tiene el mensaje generico ahi.
      setFormError(authErrorMessage(error));
    }
  });

  return (
    <View className="gap-4" testID={testID}>
      <Controller
        control={control}
        name="email"
        render={({ field: { value, onChange } }) => (
          <Input
            label="Email"
            value={value}
            onChangeText={onChange}
            error={errors.email?.message}
            keyboardType="email-address"
            autoCapitalize="none"
            testID="login-email-input"
          />
        )}
      />
      <Controller
        control={control}
        name="password"
        render={({ field: { value, onChange } }) => (
          <Input
            label="Contraseña"
            value={value}
            onChangeText={onChange}
            error={errors.password?.message}
            secureTextEntry
            autoCapitalize="none"
            testID="login-password-input"
          />
        )}
      />

      {formError ? (
        <Text accessibilityRole="alert" className="text-center text-xs text-red-500">
          {formError}
        </Text>
      ) : null}

      <Button
        variant="dark"
        size="lg"
        fullWidth
        label="Iniciar sesión"
        onPress={onSubmit}
        disabled={isSubmitting}
        testID="login-submit"
      />

      <Pressable
        accessibilityRole="link"
        accessibilityLabel="Crear cuenta"
        onPress={() => router.push(REGISTER_HREF as Href)}
        className="min-h-[44px] items-center justify-center"
      >
        <Text className="text-sm text-gray-700">
          ¿No tienes cuenta? <Text className="font-bold text-gray-900">Crear cuenta</Text>
        </Text>
      </Pressable>

      {__DEV__ ? (
        <Text
          accessibilityLabel="Credenciales de prueba"
          className="text-center text-xs text-gray-400"
        >
          Demo: {SEED_HINT}
        </Text>
      ) : null}
    </View>
  );
}
