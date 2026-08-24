import { useState } from 'react';
import { Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { ApiError } from '@oneimpact/api-client';
import {
  detectCardBrand,
  isValidLuhn,
  type Billing,
  type CreateSubscriptionInput,
  type PlanId,
} from '@oneimpact/shared';
import { Button, CardPreview, Input } from '@/components/ui';
import { useCreateSubscription } from '@/api/hooks';
import { apiErrorCode } from './auth-errors';
import { formatExpiry, formatPan, parseExpiry } from './card-format';
import { PaymentDeclinedBanner } from './PaymentDeclinedBanner';

export interface CardFormProps {
  planId: PlanId;
  billing: Billing;
  /** `$10` etc, ya resuelto por la ruta con `formatMonthlyPrice` -- no se recalcula aca. */
  priceLabel: string;
  /** Pago aprobado, o `409 SUBSCRIPTION_EXISTS`: misma pantalla de destino en ambos casos. */
  onSuccess: () => void;
  /** `401`: la sesion murio entre registro y pago. */
  onSessionExpired: () => void;
  testID?: string;
}

interface CardFormValues {
  pan: string;
  holder: string;
  expiry: string;
  cvc: string;
}

const DEFAULT_VALUES: CardFormValues = { pan: '', holder: '', expiry: '', cvc: '' };
const GENERIC_PAYMENT_ERROR = 'No se pudo procesar el pago. Intentalo de nuevo.';

/**
 * Form de Pago simulado (`pantallas-nuevas.md:29-33`). Es el unico lugar del
 * producto donde se demuestra el invariante "el PAN completo nunca llega al
 * servidor ni a un log":
 *
 * - El numero de tarjeta y el CVC son estado local de este `useForm` y nada
 *   mas -- no van a un context, no a `queryClient`, no a secure-store, no a
 *   un parametro de ruta, no se loguean.
 * - El payload que sale hacia `useCreateSubscription` se arma **campo por
 *   campo**, nunca con un spread del estado del form (eso es exactamente
 *   como se filtraria el PAN).
 * - `brand`/`last4` salen de `detectCardBrand`/`pan.slice(-4)`
 *   (`@oneimpact/shared`); el Luhn que bloquea el submit tambien viene de
 *   ahi. Cero validacion duplicada.
 */
export function CardForm({
  planId,
  billing,
  priceLabel,
  onSuccess,
  onSessionExpired,
  testID,
}: CardFormProps) {
  const [declinedMessage, setDeclinedMessage] = useState<string | null>(null);
  const mutation = useCreateSubscription();
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<CardFormValues>({
    mode: 'onChange',
    defaultValues: DEFAULT_VALUES,
  });

  const watchedPan = useWatch({ control, name: 'pan' }) ?? '';
  const watchedHolder = useWatch({ control, name: 'holder' }) ?? '';
  const watchedExpiry = useWatch({ control, name: 'expiry' }) ?? '';
  const watchedCvc = useWatch({ control, name: 'cvc' }) ?? '';
  const [expMonthPart = '', expYearPart = ''] = watchedExpiry.split('/');

  // Derivado directo de los valores observados, no de `formState.isValid`:
  // RHF solo corre la validacion de un campo despues de su primer evento, asi
  // que `isValid` puede quedar desactualizado justo en el mount inicial. El
  // verdadero gate contra el envio sigue siendo la validacion de
  // `handleSubmit` de mas abajo; esto solo decide si el CTA se ve habilitado.
  const canSubmit =
    isValidLuhn(watchedPan) &&
    watchedHolder.trim().length >= 2 &&
    parseExpiry(watchedExpiry) !== null &&
    /^\d{3,4}$/.test(watchedCvc);

  const onSubmit = handleSubmit((values) => {
    const expiry = parseExpiry(values.expiry);
    // Guardado por la regla `validate` del campo; si el CTA se pudo presionar
    // es porque `expiry` ya es un "MM/AA" completo. Sale sin enviar nada si
    // no lo es, en vez de arriesgar un payload a medio construir.
    if (!expiry) return;

    setDeclinedMessage(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);

    const payload: CreateSubscriptionInput = {
      planId,
      billing,
      card: {
        brand: detectCardBrand(values.pan),
        last4: values.pan.replace(/\D/g, '').slice(-4),
        holder: values.holder.trim(),
        expMonth: expiry.expMonth,
        expYear: expiry.expYear,
      },
    };

    mutation.mutate(payload, {
      onSuccess: () => onSuccess(),
      onError: (error) => {
        const code = apiErrorCode(error);
        if (code === 'PAYMENT_DECLINED') {
          setDeclinedMessage(error instanceof ApiError ? error.message : GENERIC_PAYMENT_ERROR);
          return;
        }
        if (code === 'SUBSCRIPTION_EXISTS') {
          onSuccess();
          return;
        }
        if (error instanceof ApiError && error.status === 401) {
          onSessionExpired();
          return;
        }
        setDeclinedMessage(GENERIC_PAYMENT_ERROR);
      },
    });
  });

  return (
    <View className="gap-5" testID={testID}>
      <CardPreview
        pan={watchedPan}
        holder={watchedHolder}
        expMonth={expMonthPart}
        expYear={expYearPart}
        pulsing={mutation.isPending}
      />

      <View className="gap-4">
        <Controller
          control={control}
          name="pan"
          rules={{ validate: (value) => isValidLuhn(value) || 'Numero de tarjeta invalido' }}
          render={({ field: { value, onChange } }) => (
            <Input
              label="Numero de tarjeta"
              value={value}
              onChangeText={(text) => onChange(formatPan(text))}
              error={errors.pan?.message}
              keyboardType="number-pad"
              maxLength={19}
              testID="card-number-input"
            />
          )}
        />

        <Controller
          control={control}
          name="holder"
          rules={{
            validate: (value) => value.trim().length >= 2 || 'El nombre del titular es requerido',
          }}
          render={({ field: { value, onChange } }) => (
            <Input
              label="Titular"
              value={value}
              onChangeText={onChange}
              error={errors.holder?.message}
              autoCapitalize="words"
              testID="card-holder-input"
            />
          )}
        />

        <View className="flex-row gap-4">
          <View className="flex-1">
            <Controller
              control={control}
              name="expiry"
              rules={{ validate: (value) => parseExpiry(value) !== null || 'Formato invalido' }}
              render={({ field: { value, onChange } }) => (
                <Input
                  label="Vencimiento (MM/AA)"
                  value={value}
                  onChangeText={(text) => onChange(formatExpiry(text))}
                  error={errors.expiry?.message}
                  keyboardType="number-pad"
                  maxLength={5}
                  testID="card-expiry-input"
                />
              )}
            />
          </View>
          <View className="flex-1">
            <Controller
              control={control}
              name="cvc"
              rules={{ pattern: { value: /^\d{3,4}$/, message: 'CVC invalido' } }}
              render={({ field: { value, onChange } }) => (
                <Input
                  label="CVC"
                  value={value}
                  onChangeText={(text) => onChange(text.replace(/\D/g, '').slice(0, 4))}
                  error={errors.cvc?.message}
                  keyboardType="number-pad"
                  maxLength={4}
                  testID="card-cvc-input"
                />
              )}
            />
          </View>
        </View>
      </View>

      <Text className="text-center text-xs font-bold text-gray-700">
        Pago simulado — no se realiza ningún cargo
      </Text>
      <Text className="text-center text-xs text-gray-500">
        Tarjeta de prueba: 4242 4242 4242 4242 aprueba el pago. Terminada en 0000 fuerza un
        rechazo.
      </Text>

      {declinedMessage ? (
        <PaymentDeclinedBanner
          message={declinedMessage}
          onRetry={() => setDeclinedMessage(null)}
          testID="payment-declined-banner"
        />
      ) : null}

      <Button
        variant="accent"
        size="lg"
        fullWidth
        label={`Confirmar ${priceLabel}/mes`}
        onPress={onSubmit}
        disabled={!canSubmit || mutation.isPending}
        testID="card-submit"
      />
    </View>
  );
}
