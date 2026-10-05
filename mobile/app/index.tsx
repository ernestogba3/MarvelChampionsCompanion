import { useEffect, useState } from 'react';
import { Text, View, Pressable } from 'react-native';
import { router } from 'expo-router';
import { createSpiderManVsRhinoGame, serializeGameState } from 'engine';
import { initDatabase, saveGame, loadGame } from '../storage/gameStorage';

export default function HomeScreen() {
    const [hasSavedGame, setHasSavedGame] = useState<boolean | null>(null);

    useEffect(() => {
        async function checkSavedGame() {
            await initDatabase();
            const saved = await loadGame();
            setHasSavedGame(saved !== null);
        }
        checkSavedGame();
    }, []);

    async function handleNewGame() {
        const fresh = createSpiderManVsRhinoGame('player-1');
        await saveGame(serializeGameState(fresh));
        router.push('/game');
    }

    function handleContinue() {
        router.push('/game');
    }

    return (
        <View className="flex-1 bg-azul-noche items-center justify-center px-8 gap-4">
            <Text className="font-display text-crema text-6xl tracking-wider">
                PHASEKEEPER
            </Text>
            <Text className="font-sans-semibold text-dorado text-xs tracking-[3px] uppercase mb-2">
                Tu compañero en cada fase
            </Text>
            <Text className="font-sans text-gris-pizarra text-base mb-10">
                Spider-Man vs Rhino
            </Text>

            {hasSavedGame === null && (
                <Text className="font-sans text-crema">Cargando...</Text>
            )}

            {hasSavedGame === true && (
                <Pressable
                    onPress={handleContinue}
                    className="bg-dorado w-full py-4 rounded-xl items-center"
                >
                    <Text className="font-sans-bold text-azul-noche text-base">
                        Continuar partida
                    </Text>
                </Pressable>
            )}

            {hasSavedGame !== null && (
                <Pressable
                    onPress={handleNewGame}
                    className="border border-crema/30 w-full py-4 rounded-xl items-center mt-3"
                >
                    <Text className="font-sans-semibold text-crema text-base">
                        Nueva partida
                    </Text>
                </Pressable>
            )}
        </View>
    );
}