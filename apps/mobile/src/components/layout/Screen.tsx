import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

export type ScreenProps = {
  children: ReactNode;
  statusBar?: 'light' | 'dark';
  bg?: string;
  scroll?: boolean;
  contentContainerClassName?: string;
};

export function Screen({
  children,
  statusBar = 'dark',
  bg = 'bg-cream',
  scroll = true,
  contentContainerClassName,
}: ScreenProps) {
  if (!scroll) {
    return (
      <View className={`flex-1 ${bg} ${contentContainerClassName ?? ''}`}>
        <StatusBar style={statusBar} />
        {children}
      </View>
    );
  }

  return (
    <ScrollView
      className={`flex-1 ${bg}`}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ flexGrow: 1 }}
      contentContainerClassName={contentContainerClassName}
    >
      <StatusBar style={statusBar} />
      {children}
    </ScrollView>
  );
}
