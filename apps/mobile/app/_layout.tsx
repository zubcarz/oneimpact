import '../global.css';
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/api/queryClient';
import { fontAssets } from '@/theme/typography';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    // `EXPO_PUBLIC_API_URL` empty means "no API to talk to" -- the demo's
    // safety net (`arquitectura-mobile.md:69`); `EXPO_PUBLIC_USE_MSW=1` forces
    // mocks even with a URL configured, for working on the app without the API
    // running. A dynamic import keeps `msw/native`, its polyfills and the
    // shared seed out of this file's static module graph -- they only load
    // when this branch actually runs, so a build talking to a real API never
    // pays for them.
    const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? '';
    const useMsw = process.env.EXPO_PUBLIC_USE_MSW === '1';
    if (apiUrl === '' || useMsw) {
      import('@/api/msw/server')
        .then(({ startMockServer }) => startMockServer())
        .catch((error: unknown) => {
          // Never let a mock-server failure blank the app: a demo without
          // mocks (falling through to real network calls, which will then
          // fail on their own terms) beats a white screen.
          console.warn('[msw] failed to start the mock server', error);
        });
    }
  }, []);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="light" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
          </Stack>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
