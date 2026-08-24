import { Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

export interface IPassCardProps {
  name: string;
  shortId: string;
  testID?: string;
}

/**
 * Tarjeta iPass del Perfil (`02-Analisis-Visual/pantallas/pantallas-nuevas.md`,
 * "Perfil / iPass", linea ~47): fondo forest, "logo" en texto blanco, nombre,
 * id corto y QR decorativo con el mismo id. `shortId` llega ya calculado
 * (`app/(app)/profile.tsx`) -- este componente es puramente presentacional.
 */
export function IPassCard({ name, shortId, testID }: IPassCardProps) {
  return (
    <View className="rounded-3xl bg-forest p-6" testID={testID}>
      <Text className="text-sm font-bold uppercase tracking-widest text-white">One Impact</Text>
      <View className="mt-6 flex-row items-center justify-between">
        <View className="flex-1 pr-4">
          <Text className="text-2xl font-bold text-white">{name}</Text>
          <Text className="mt-1 text-sm text-white/60">{shortId}</Text>
        </View>
        <View className="rounded-2xl bg-forest p-2">
          <QRCode value={shortId} size={72} backgroundColor="transparent" color="white" />
        </View>
      </View>
    </View>
  );
}
