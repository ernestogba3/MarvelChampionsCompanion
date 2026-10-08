import { Text, View, Pressable, ScrollView, Alert, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { clearGame } from '../../storage/gameStorage';

const RULES_URL = 'https://rulespal.com/game/marvel-champions-the-card-game-rulebook';
const APP_VERSION = '1.0.0';

export default function MoreScreen() {
    const router = useRouter();

    function handleReset() {
        Alert.alert(
            'Reiniciar partida',
            '¿Seguro que quieres borrar la partida actual? Esta acción no se puede deshacer.',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Reiniciar',
                    style: 'destructive',
                    onPress: async () => {
                        await clearGame();
                        router.replace('/');
                    },
                },
            ],
        );
    }

    function handleOpenRules() {
        Linking.openURL(RULES_URL);
    }

    return (
        <ScrollView
            className="flex-1 bg-azul-noche"
            contentContainerStyle={{ padding: 20, paddingTop: 56, gap: 20 }}
        >
            <Text className="font-display text-crema text-3xl">Más</Text>

            <View className="gap-2">
                <Text className="font-sans-semibold text-gris-pizarra text-xs uppercase tracking-widest">
                    Partida
                </Text>
                <View className="bg-crema/5 rounded-2xl overflow-hidden">
                    <Pressable onPress={handleReset} className="p-4">
                        <Text className="font-sans-bold text-rojo-acento text-base">
                            Reiniciar partida
                        </Text>
                        <Text className="font-sans text-gris-pizarra text-xs mt-1">
                            Borra la partida guardada y vuelve al inicio.
                        </Text>
                    </Pressable>
                </View>
            </View>

            <View className="gap-2">
                <Text className="font-sans-semibold text-gris-pizarra text-xs uppercase tracking-widest">
                    Recursos
                </Text>
                <View className="bg-crema/5 rounded-2xl overflow-hidden">
                    <Pressable onPress={handleOpenRules} className="p-4">
                        <Text className="font-sans-bold text-crema text-base">
                            Reglas oficiales
                        </Text>
                        <Text className="font-sans text-gris-pizarra text-xs mt-1">
                            Abrir el reglamento de Marvel Champions.
                        </Text>
                    </Pressable>
                </View>
            </View>

            <View className="gap-2">
                <Text className="font-sans-semibold text-gris-pizarra text-xs uppercase tracking-widest">
                    Acerca de
                </Text>
                <View className="bg-crema/5 rounded-2xl p-4 gap-2">
                    <Text className="font-sans text-crema text-sm">
                        Phasekeeper es una app compañera para Marvel Champions: The Card Game. No simula tu mano ni tus recursos — tú juegas con tus cartas físicas y la app controla al villano, los esbirros, los planes y las fases de la ronda.
                    </Text>
                    <Text className="font-sans text-gris-pizarra text-xs">
                        Versión {APP_VERSION}
                    </Text>
                    <Text className="font-sans text-gris-pizarra text-xs italic">
                        Esta aplicación no está afiliada a Fantasy Flight Games ni a Marvel. Todas las marcas pertenecen a sus respectivos propietarios.
                    </Text>
                </View>
            </View>
        </ScrollView>
    );
}