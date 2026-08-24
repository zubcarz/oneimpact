import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { publishUpdateSchema, type PublishUpdateInput } from '@oneimpact/shared';
import { Button, Input, ProgressBar } from '@/components/ui';
import { usePublishUpdate } from '@/api/hooks';

export interface PublishUpdateFormProps {
  projectId: string;
  /** Llamado despues de que la mutation resuelve; el padre decide (colapsar el form). */
  onSuccess: () => void;
  testID?: string;
}

/** Pasos de 10 en 10 (`pantallas-nuevas.md:52`, "form corto ... progreso slider"). */
const PROGRESS_STEPS = Array.from({ length: 11 }, (_, index) => index * 10);

const GENERIC_ERROR_MESSAGE = 'No pudimos publicar el avance. Inténtalo de nuevo.';

/**
 * Form corto de "Publicar avance" del atajo admin
 * (`02-Analisis-Visual/pantallas/pantallas-nuevas.md`, "Admin (mobile, solo
 * rol admin)"): titulo, texto y progreso. Mismo patron que `RegisterForm.tsx`
 * (`Controller` + `Input` + `error={errors.x?.message}`), validado con
 * `publishUpdateSchema` de `@oneimpact/shared` via `zodResolver`.
 *
 * No hay libreria de slider instalada en el repo (ver plan, "Contexto",
 * punto 5): el progreso se elige con una fila de pildoras en pasos de 10
 * (`PROGRESS_STEPS`) integrada al form via `Controller`, con `ProgressBar`
 * como preview en vivo debajo -- sin gestos de arrastre, pero sin agregar una
 * dependencia nativa nueva el mismo dia de entrega.
 */
export function PublishUpdateForm({ projectId, onSuccess, testID }: PublishUpdateFormProps) {
  const baseTestID = testID ?? 'publish-update-form';
  const [formError, setFormError] = useState<string | null>(null);
  const publishUpdate = usePublishUpdate();
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<PublishUpdateInput>({
    resolver: zodResolver(publishUpdateSchema),
    defaultValues: { title: '', body: '', progress: 0 },
  });

  const onSubmit = handleSubmit((values) => {
    setFormError(null);
    publishUpdate.mutate(
      { id: projectId, input: values },
      {
        onSuccess: () => onSuccess(),
        onError: () => setFormError(GENERIC_ERROR_MESSAGE),
      },
    );
  });

  return (
    <View className="gap-4" testID={testID}>
      <Controller
        control={control}
        name="title"
        render={({ field: { value, onChange } }) => (
          <Input
            label="Título"
            value={value}
            onChangeText={onChange}
            error={errors.title?.message}
            testID={`${baseTestID}-title-input`}
          />
        )}
      />
      <Controller
        control={control}
        name="body"
        render={({ field: { value, onChange } }) => (
          <Input
            label="Texto"
            value={value}
            onChangeText={onChange}
            error={errors.body?.message}
            testID={`${baseTestID}-body-input`}
          />
        )}
      />
      <Controller
        control={control}
        name="progress"
        render={({ field: { value, onChange } }) => (
          <View>
            <Text className="mb-1.5 text-xs font-bold text-gray-700">Progreso</Text>
            <View className="flex-row flex-wrap gap-2">
              {PROGRESS_STEPS.map((step) => {
                const selected = value === step;
                return (
                  <Pressable
                    key={step}
                    accessibilityRole="button"
                    accessibilityLabel={`${step}%`}
                    accessibilityState={{ selected }}
                    onPress={() => onChange(step)}
                    testID={`${baseTestID}-progress-${step}`}
                    className={`h-11 w-11 items-center justify-center rounded-full ${
                      selected ? 'bg-accent' : 'bg-cream'
                    }`}
                  >
                    <Text
                      className={`text-xs font-bold ${selected ? 'text-gray-900' : 'text-gray-600'}`}
                    >
                      {step}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <ProgressBar value={value} className="mt-3" testID={`${baseTestID}-progress-preview`} />
            {errors.progress ? (
              <Text className="mt-1 text-xs text-red-500">{errors.progress.message}</Text>
            ) : null}
          </View>
        )}
      />

      {formError ? (
        <Text accessibilityRole="alert" className="text-center text-xs text-red-500">
          {formError}
        </Text>
      ) : null}

      <Button
        variant="dark"
        fullWidth
        label="Publicar avance"
        onPress={onSubmit}
        disabled={publishUpdate.isPending}
        testID={`${baseTestID}-submit`}
      />
    </View>
  );
}
