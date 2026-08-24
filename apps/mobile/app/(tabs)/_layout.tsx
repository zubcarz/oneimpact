import { Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { HandHeart, House, MapPin, Sprout } from 'lucide-react-native';
import { colors } from '@oneimpact/ui-tokens';
import { overlay } from '@/theme/overlays';
import { fontFamilies } from '@/theme/typography';

/**
 * Tab bar inferior Inicio - Zonas - Proyectos - Aportar
 * (`02-Analisis-Visual/README.md`, decision de adaptacion movil 1). Iconos
 * lucide con stroke 2 como el resto del sistema (`60-design-system.md`); sin
 * `tabBarIcon` react-navigation dibuja un placeholder.
 *
 * Proyectos entra a la barra porque `/projects` es un destino de primer nivel
 * del producto -- tiene su propio hero y su filtro por zona -- y hasta ahora
 * solo se alcanzaba abriendo el menu full-screen. Su detalle
 * (`app/projects/[id].tsx`) sigue **fuera** del grupo `(tabs)` a proposito:
 * una pantalla de lectura profunda no compite con la navegacion raiz.
 */
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: overlay.white60,
        tabBarStyle: {
          backgroundColor: colors.forest,
          borderTopColor: overlay.white10,
          /**
           * Solo web, y medido en el navegador. El renderer web de
           * react-navigation reserva parte del alto de la barra para su propio
           * contenedor y deja al item menos espacio del que declara: con el
           * alto por defecto la etiqueta se rendereaba con 1px de alto y
           * `overflow: hidden` -- es el corte que se ve en la barra del
           * preview. 84 es el primer valor con el que recibe sus 14px enteros.
           *
           * En nativo **no se toca**: alli el calculo de la libreria ya suma la
           * altura estandar mas el safe area inferior, y fijarlo a mano es
           * justamente lo que rompe el gesture bar.
           */
          ...(Platform.OS === 'web' ? { height: 84 } : null),
        },
        // Sin esto las etiquetas caen a la tipografia del sistema y rompen el
        // ritmo Geist del resto de la app (`60-design-system.md`).
        tabBarLabelStyle: {
          fontFamily: fontFamilies.bold,
          fontSize: 11,
          letterSpacing: 0.2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color, size }) => <House color={color} size={size} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="zones"
        options={{
          title: 'Zonas',
          tabBarIcon: ({ color, size }) => <MapPin color={color} size={size} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="projects"
        options={{
          title: 'Proyectos',
          tabBarIcon: ({ color, size }) => <Sprout color={color} size={size} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="subscription"
        options={{
          title: 'Aportar',
          tabBarIcon: ({ color, size }) => <HandHeart color={color} size={size} strokeWidth={2} />,
        }}
      />
    </Tabs>
  );
}
