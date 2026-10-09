import { Text, View, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const FEATURES: { icon: IoniconName; title: string; description: string }[] = [
    {
        icon: 'albums-outline',
        title: 'Catálogo personal',
        description:
            'Registra qué paquetes y expansiones tienes físicamente para que la app conozca tu colección real.',
    },
    {
        icon: 'construct-outline',
        title: 'Construcción de mazos',
        description:
            'Monta mazos de héroe eligiendo entre las cartas que posees, con validación de las reglas de construcción.',
    },
    {
        icon: 'bookmark-outline',
        title: 'Mazos guardados',
        description:
            'Guarda tus mazos favoritos y recárgalos cuando empieces una nueva partida.',
    },
];

export default function CollectionScreen() {
    return (
        <ScrollView
            className="flex-1 bg-azul-noche"
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 56, paddingBottom: 48, gap: 20 }}
        >
            <View>
                <Text className="font-sans-semibold text-dorado text-xs uppercase tracking-widest">
                    Próximamente
                </Text>
                <Text className="font-display text-crema text-3xl mt-1">Colección</Text>
            </View>

            <View className="bg-crema/5 rounded-2xl p-5 gap-2">
                <Text className="font-sans-bold text-crema text-base">
                    Gestiona tu colección física
                </Text>
                <Text className="font-sans text-gris-pizarra text-sm">
                    Esta sección te permitirá llevar la cuenta de qué cartas tienes y construir tus mazos directamente desde la app.
                </Text>
            </View>

            <View className="gap-3">
                <Text className="font-sans-semibold text-gris-pizarra text-xs uppercase tracking-widest">
                    Qué incluirá
                </Text>
                {FEATURES.map((f) => (
                    <View key={f.title} className="bg-crema/5 rounded-2xl p-4 flex-row gap-3">
                        <View className="w-10 h-10 rounded-full bg-dorado/15 items-center justify-center">
                            <Ionicons name={f.icon} size={20} color="#D4A24C" />
                        </View>
                        <View className="flex-1 gap-1">
                            <Text className="font-sans-bold text-crema text-sm">{f.title}</Text>
                            <Text className="font-sans text-gris-pizarra text-xs">{f.description}</Text>
                        </View>
                    </View>
                ))}
            </View>

            <View className="bg-dorado/10 border border-dorado/30 rounded-2xl p-4">
                <Text className="font-sans text-crema text-xs italic">
                    Mientras tanto, puedes consultar las 20 cartas del escenario Rino desde la pestaña "Cartas".
                </Text>
            </View>
        </ScrollView>
    );
}