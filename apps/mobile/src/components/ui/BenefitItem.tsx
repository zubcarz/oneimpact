import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { cx } from './cx';

export interface BenefitItemProps {
  /** Icono decorativo de 40px, ya resuelto por el consumidor. */
  icon: ReactNode;
  /** Copia visible, en espanol. */
  title: string;
  /** Copia visible, en espanol. */
  description: string;
  className?: string;
  testID?: string;
}

/**
 * Fila de beneficio de la seccion 3 de Suscripcion (`pantallas/suscripcion.md`
 * #3): icono de 40px + bloque de texto. Recibe el icono como prop para no
 * acoplar este componente de UI al catalogo de beneficios (`BENEFITS`).
 */
export function BenefitItem({ icon, title, description, className, testID }: BenefitItemProps) {
  return (
    <View className={cx('flex-row items-start gap-4', className)} testID={testID}>
      <View className="h-10 w-10">{icon}</View>
      <View className="flex-1">
        <Text className="font-bold text-gray-900">{title}</Text>
        <Text className="text-gray-500">{description}</Text>
      </View>
    </View>
  );
}
