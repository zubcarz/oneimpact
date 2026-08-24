import { useState } from 'react';
import { Text, TextInput, View, type KeyboardTypeOptions, type TextInputProps } from 'react-native';
import { cx } from './cx';

export interface InputProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  error?: string;
  keyboardType?: KeyboardTypeOptions;
  secureTextEntry?: boolean;
  maxLength?: number;
  autoCapitalize?: TextInputProps['autoCapitalize'];
  testID?: string;
}

/**
 * Campo de formulario del flujo de auth (`pantallas-nuevas.md:26`). Controlado
 * y puramente presentacional: el estado del valor vive en el formulario que lo
 * usa, aca solo se guarda el foco para alternar el borde. Nunca loguea `value`
 * (puede ser el numero de tarjeta o una contrasena).
 */
export function Input({
  label,
  value,
  onChangeText,
  error,
  keyboardType,
  secureTextEntry,
  maxLength,
  autoCapitalize,
  testID,
}: InputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View>
      <Text className="mb-1.5 text-xs font-bold text-gray-700">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        maxLength={maxLength}
        autoCapitalize={autoCapitalize}
        accessibilityLabel={label}
        testID={testID}
        className={cx(
          'min-h-[44px] rounded-2xl border border-black/5 bg-white px-4 py-4 text-base text-gray-900',
          focused && 'border-dark-green',
          error && 'border-red-500',
        )}
      />
      {error ? <Text className="mt-1 text-xs text-red-500">{error}</Text> : null}
    </View>
  );
}
