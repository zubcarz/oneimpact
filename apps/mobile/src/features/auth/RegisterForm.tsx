import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, type RegisterInput } from '@oneimpact/shared';
import { Button, Input } from '@/components/ui';
import { useAuth } from '@/auth';
import { apiErrorCode, authErrorMessage } from './auth-errors';

export interface RegisterFormProps {
  /** Llamado despues de que `signUp` resuelve; la ruta decide a donde navegar. */
  onSuccess: () => void;
  /** `Href` de Login ya resuelto por la ruta (incluye el `returnTo` apropiado). */
  loginHref: Href;
  testID?: string;
}

/**
 * Form de Registro (`pantallas-nuevas.md:23-27`). Validacion con
 * `registerSchema` de `@oneimpact/shared` via `zodResolver`: los mensajes de
 * error mostrados bajo cada campo son los del schema, en espanol, sin
 * duplicarlos aca. El submit llama `signUp` del `AuthProvider` (no
 * `useRegister`): es el provider quien persiste los tokens en secure-store.
 */
export function RegisterForm({ onSuccess, loginHref, testID }: RegisterFormProps) {
  const { signUp } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await signUp(values);
      onSuccess();
    } catch (error) {
      // `409 EMAIL_TAKEN` va inline bajo el campo email, sin navegar y sin
      // tokens guardados (`signUp` ya no llego a persistir nada si fallo).
      // Cualquier otro `code` cae al banner generico.
      if (apiErrorCode(error) === 'EMAIL_TAKEN') {
        setError('email', { type: 'manual', message: authErrorMessage(error) });
        return;
      }
      setFormError(authErrorMessage(error));
    }
  });

  return (
    <View className="gap-4" testID={testID}>
      <Controller
        control={control}
        name="name"
        render={({ field: { value, onChange } }) => (
          <Input
            label="Nombre"
            value={value}
            onChangeText={onChange}
            error={errors.name?.message}
            autoCapitalize="words"
            testID="register-name-input"
          />
        )}
      />
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
            testID="register-email-input"
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
            testID="register-password-input"
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
        label="Continuar al pago"
        onPress={onSubmit}
        disabled={isSubmitting}
        testID="register-submit"
      />

      <Pressable
        accessibilityRole="link"
        accessibilityLabel="Inicia sesión"
        onPress={() => router.push(loginHref)}
        className="min-h-[44px] items-center justify-center"
      >
        <Text className="text-sm text-gray-700">
          ¿Ya tienes cuenta? <Text className="font-bold text-gray-900">Inicia sesión</Text>
        </Text>
      </Pressable>
    </View>
  );
}
