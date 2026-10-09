import { Text, View, Pressable, ScrollView, Alert, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { clearGame } from '../../storage/gameStorage';

const RULES_URL = 'https://rulespal.com/game/marvel-champions-the-card-game-rulebook';
const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

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
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 56, paddingBottom: 48, gap: 20 }}
        >
            <View>
                <Text className="font-sans-semibold text-dorado text-xs uppercase tracking-widest">
                    Ajustes y recursos
                </Text>
                <Text className="font-display text-crema text-3xl mt-1">Más</Text>
            </View>

            <View className="gap-2">
                <Text className="font-sans-semibold text-gris-pizarra text-xs uppercase tracking-widest">
                    Partida
                </Text>
                <View className="bg-crema/5 rounded-2xl overflow-hidden">
                    <Pressable
                        onPress={handleReset}
                        style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
                        className="p-4 flex-row items-center gap-3"
                    >
                        <View className="flex-1">
                            <Text className="font-sans-bold text-rojo-acento text-base">
                                Reiniciar partida
                            </Text>
                            <Text className="font-sans text-gris-pizarra text-xs mt-1">
                                Borra la partida guardada y vuelve al inicio.
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color="#D4A24C" />
                    </Pressable>
                </View>
            </View>

            <View className="gap-2">
                <Text className="font-sans-semibold text-gris-pizarra text-xs uppercase tracking-widest">
                    Recursos
                </Text>
                <View className="bg-crema/5 rounded-2xl overflow-hidden">
                    <Pressable
                        onPress={handleOpenRules}
                        style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
                        className="p-4 flex-row items-center gap-3"
                    >
                        <View className="flex-1">
                            <Text className="font-sans-bold text-crema text-base">
                                Reglas oficiales
                            </Text>
                            <Text className="font-sans text-gris-pizarra text-xs mt-1">
                                Abrir el reglamento de Marvel Champions.
                            </Text>
                        </View>
                        <Ionicons name="open-outline" size={18} color="#D4A24C" />
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