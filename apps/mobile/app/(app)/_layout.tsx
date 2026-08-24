import { Platform, Pressable, Text, View } from 'react-native';
import { router, usePathname } from 'expo-router';
import { Tabs, type BottomTabBarProps } from 'expo-router/js-tabs';
import { LayoutDashboard, MapPin, Sprout, User } from 'lucide-react-native';
import { colors } from '@oneimpact/ui-tokens';
import { useRequireAuth } from '@/auth';
import { overlay } from '@/theme/overlays';
import { fontFamilies } from '@/theme/typography';

type TabIcon = typeof LayoutDashboard;

interface RouteTabDef {
  kind: 'route';
  /** Debe coincidir con el nombre de archivo real bajo `(app)/`. */
  name: 'dashboard' | 'profile';
  label: string;
  Icon: TabIcon;
}

interface RedirectTabDef {
  kind: 'redirect';
  key: string;
  label: string;
  Icon: TabIcon;
  /** Ruta publica de `(tabs)/` a la que navega -- nunca se marca activa. */
  href: '/(tabs)/projects' | '/(tabs)/zones';
}

/**
 * Orden de la tab bar logueada (`pantallas-nuevas.md`, "Dashboard", linea 45:
 * "Tabs logueado: Dashboard - Proyectos - Zonas - Perfil"). Solo `dashboard` y
 * `profile` son pantallas propias de este grupo -- "Proyectos"/"Zonas" ya
 * existen como pantallas publicas en `(tabs)/` y no se duplican aca.
 */
const TAB_DEFS: (RouteTabDef | RedirectTabDef)[] = [
  { kind: 'route', name: 'dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { kind: 'redirect', key: 'projects', label: 'Proyectos', Icon: Sprout, href: '/(tabs)/projects' },
  { kind: 'redirect', key: 'zones', label: 'Zonas', Icon: MapPin, href: '/(tabs)/zones' },
  { kind: 'route', name: 'profile', label: 'Perfil', Icon: User },
];

/**
 * Tab bar renderizada a mano en vez de declarar 4 `<Tabs.Screen>`.
 *
 * `expo-router` exige que todo `<Tabs.Screen name="x">` tenga un archivo `x`
 * bajo `(app)/` respaldandolo: sin archivo, `getSortedChildren`
 * (`expo-router/build/useScreens.js`) descarta la entrada con un
 * `console.warn` y el tab desaparece de la barra en vez de quedar visible con
 * un listener interceptando el press. Como la tarea prohibe crear
 * `(app)/projects.tsx` y `(app)/zones.tsx` (son destinos publicos de
 * `(tabs)/`, no pantallas protegidas nuevas), la unica forma de mostrar los 4
 * items sin inventar archivos fantasma es tomar el control total del render
 * de la barra via la prop `tabBar` (publica, re-exportada por
 * `expo-router/js-tabs` junto a `BottomTabBarProps`). "Dashboard" y "Perfil"
 * navegan dentro de este mismo grupo de tabs (`navigation.navigate`,
 * replicando el evento `tabPress` que emite el boton nativo por defecto);
 * "Proyectos" y "Zonas" hacen `router.push` a la pantalla publica
 * correspondiente y nunca se pintan como activos, porque no son parte del
 * estado de navegacion de este grupo.
 */
function AppTabBar({ state, descriptors, navigation, insets }: BottomTabBarProps) {
  return (
    <View
      className="flex-row border-t border-white/10 bg-forest"
      style={{
        paddingBottom: Math.max(insets.bottom, 8),
        ...(Platform.OS === 'web' ? { height: 84 } : null),
      }}
    >
      {TAB_DEFS.map((tab) => {
        if (tab.kind === 'redirect') {
          return (
            <Pressable
              key={tab.key}
              accessibilityRole="button"
              accessibilityLabel={tab.label}
              onPress={() => router.push(tab.href)}
              className="min-h-[44px] flex-1 items-center justify-center gap-1 py-2 active:opacity-80"
            >
              <tab.Icon color={overlay.white60} size={24} strokeWidth={2} />
              <Text
                style={{ fontFamily: fontFamilies.bold, fontSize: 11, letterSpacing: 0.2 }}
                className="text-white/60"
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        }

        const routeIndex = state.routes.findIndex((route) => route.name === tab.name);
        if (routeIndex === -1) {
          // No deberia pasar: `dashboard` y `profile` siempre existen como
          // archivos de `(app)/`. Defensivo, no un caso de uso real.
          return null;
        }
        const route = state.routes[routeIndex];
        const { options } = descriptors[route.key];
        const isFocused = state.index === routeIndex;
        const tintColor = isFocused ? colors.accent : overlay.white60;
        const label = options.title ?? tab.label;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <Pressable
            key={route.key}
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityState={{ selected: isFocused }}
            onPress={onPress}
            className="min-h-[44px] flex-1 items-center justify-center gap-1 py-2 active:opacity-80"
          >
            <tab.Icon color={tintColor} size={24} strokeWidth={2} />
            <Text
              style={{
                fontFamily: fontFamilies.bold,
                fontSize: 11,
                letterSpacing: 0.2,
                color: tintColor,
              }}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * Guard for every screen under `(app)`. This is the "decide the destination"
 * half of the auth navigation split: `useRequireAuth` is the only place that
 * calls `router.replace` for a guest (see its own comment for why), so the
 * root layout (`app/_layout.tsx`) only ever blocks rendering while the
 * session is bootstrapping -- it never redirects. That split is what keeps
 * this guard and the root layout from racing each other into a navigation
 * loop.
 *
 * `(tabs)` has no guard of its own, so a signed-in user is never expelled
 * from the public screens (`arquitectura-mobile.md:40`).
 */
export default function AppGroupLayout() {
  const pathname = usePathname();
  const status = useRequireAuth(pathname);

  // `status` is only ever `'loading'` during the very first bootstrap, which
  // the root layout already blocks on before this layout can mount. It shows
  // up here as `'guest'` while `useRequireAuth`'s effect is redirecting away
  // -- render nothing rather than flash protected content in that window.
  if (status !== 'authed') {
    return null;
  }

  return (
    <Tabs tabBar={(props) => <AppTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="dashboard" options={{ title: 'Dashboard' }} />
      <Tabs.Screen name="profile" options={{ title: 'Perfil' }} />
    </Tabs>
  );
}
