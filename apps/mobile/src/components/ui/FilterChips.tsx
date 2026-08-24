import { Pressable, ScrollView, Text } from 'react-native';
import { cx } from './cx';

export interface FilterChipItem {
  value: string;
  label: string;
}

export interface FilterChipsProps {
  items: FilterChipItem[];
  value: string | null;
  onChange: (value: string) => void;
  className?: string;
  testID?: string;
}

/** Selector horizontal de pildoras para filtrar listas (proyectos, zonas). */
export function FilterChips({ items, value, onChange, className, testID }: FilterChipsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className={className}
      testID={testID}
    >
      {items.map((item) => {
        const selected = item.value === value;

        return (
          <Pressable
            key={item.value}
            accessibilityRole="button"
            accessibilityLabel={item.label}
            accessibilityState={{ selected }}
            onPress={() => onChange(item.value)}
            className={cx(
              'mr-2 items-center justify-center rounded-full py-3 px-5 active:opacity-90',
              selected ? 'bg-gray-900' : 'bg-white',
            )}
          >
            <Text
              className={cx(
                'text-sm font-bold',
                selected ? 'text-white' : 'text-gray-700',
              )}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
