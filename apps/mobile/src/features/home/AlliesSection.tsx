import { View } from 'react-native';
import { Image } from 'expo-image';
import { colors } from '@oneimpact/ui-tokens';
import { SectionHeader } from '@/components/ui';
import { allies, alliesSection } from '@/data/home';

const BADGE_SHADOW = {
  shadowColor: colors.gray900,
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.05,
  shadowRadius: 2,
  elevation: 1,
} as const;

export interface AlliesSectionProps {
  /**
   * Fondo de la seccion. Default `'bg-neutral-100'`: el valor que Home ya
   * tiene entregado. "Quienes somos" (`pantallas-nuevas.md:20`) reutiliza esta
   * seccion con `bg-accent-light`.
   */
  bgClassName?: string;
}

/** Seccion 5 de Inicio: "Conoce a nuestros aliados" (`pantallas/inicio.md` #5). */
export function AlliesSection({ bgClassName = 'bg-neutral-100' }: AlliesSectionProps) {
  return (
    <View className={`items-center px-4 py-16 ${bgClassName}`}>
      <SectionHeader
        title={alliesSection.title}
        subtitle={alliesSection.subtitle}
        align="center"
        titleClassName="mb-4"
        subtitleClassName="text-sm text-gray-600"
      />
      <View className="mt-8 flex-row justify-center gap-8">
        {allies.map((ally) => (
          <View
            key={ally.id}
            className="h-24 w-24 items-center justify-center rounded-full bg-white"
            style={BADGE_SHADOW}
          >
            <Image
              source={ally.logo}
              contentFit="contain"
              accessibilityLabel={ally.name}
              accessibilityRole="image"
              style={{ width: 64, height: 64, opacity: 0.8 }}
            />
          </View>
        ))}
      </View>
    </View>
  );
}
