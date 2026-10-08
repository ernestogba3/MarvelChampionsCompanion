import { useEffect, useState, useCallback } from 'react';
import { Text, View, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import {
    loadGame,
    saveGame,
    initDatabase,
} from '../storage/gameStorage';
import {
    createSpiderManVsRhinoGame,
    serializeGameState,
    deserializeGameState,
} from 'engine';
import type { GameState } from 'engine';

export default function IndexScreen() {
    const router = useRouter();
    const [savedGame, setSavedGame] = useState<GameState | null>(null);
    const [ready, setReady] = useState(false);

    async function refresh() {
        const saved = await loadGame();
        if (saved) {
            try {
                setSavedGame(deserializeGameState(saved));
            } catch {
                setSavedGame(null);
            }
        } else {
            setSavedGame(null);
        }
    }

    useEffect(() => {
        async function init() {
            await initDatabase();
            await refresh();
            setReady(true);
        }
        init();
    }, []);

    useFocusEffect(
        useCallback(() => {
            // Solo refrescamos cuando ya hemos pasado el init inicial;
            // así evitamos que esta llamada corra en paralelo con initDatabase.
            if (ready) {
                refresh();
            }
        }, [ready]),
    );

    async function startNew() {
        const state = createSpiderManVsRhinoGame();
        await saveGame(serializeGameState(state));
        router.push('/game');
    }

    function handleNewGame() {
        if (savedGame) {
            Alert.alert(
                'Nueva partida',
                'Esto sobrescribirá la partida en curso. ¿Continuar?',
                [
                    { text: 'Cancelar', style: 'cancel' },
                    {
                        text: 'Nueva partida',
                        style: 'destructive',
                        onPress: startNew,
                    },
                ],
            );
            return;
        }
        startNew();
    }

    function handleContinue() {
        router.push('/game');
    }

    if (!ready) {
        return (
            <View className="flex-1 bg-azul-noche items-center justify-center">
                <Text className="font-sans text-crema">Cargando...</Text>
            </View>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-azul-noche" edges={['top', 'bottom']}>
            <View className="flex-1 px-6 justify-between py-12">
                <View className="items-center mt-10">
                    <Text className="font-sans-semibold text-dorado text-xs uppercase tracking-widest">
                        Compañero de juego
                    </Text>
                    <Text className="font-display text-crema text-6xl mt-4">
                        PHASEKEEPER
                    </Text>
                    <Text className="font-sans text-gris-pizarra text-sm text-center mt-3 px-4">
                        Árbitro y guía para Marvel Champions: The Card Game
                    </Text>
                </View>

                <View className="gap-3">
                    {savedGame && (
                        <View className="bg-crema/5 rounded-2xl p-4 gap-2">
                            <Text className="font-sans-semibold text-gris-pizarra text-xs uppercase tracking-widest">
                                Partida en curso
                            </Text>
                            <Text className="font-sans-bold text-crema text-base">
                                {savedGame.players[0].heroName} vs {savedGame.villain.name}
                            </Text>
                            <Text className="font-sans text-gris-pizarra text-xs">
                                Ronda {savedGame.round} · Rino {savedGame.villain.stage} ·{' '}
                                {savedGame.villain.health}/{savedGame.villain.maxHealth} VIDA
                            </Text>
                            <Pressable
                                onPress={handleContinue}
                                className="bg-dorado rounded-xl py-3 items-center mt-2"
                            >
                                <Text className="font-sans-bold text-azul-noche text-base">
                                    Continuar partida
                                </Text>
                            </Pressable>
                        </View>
                    )}

                    <Pressable
                        onPress={handleNewGame}
                        className={`rounded-xl py-4 items-center ${savedGame ? 'border border-crema/30' : 'bg-dorado'
                            }`}
                    >
                        <Text
                            className={`font-sans-bold text-base ${savedGame ? 'text-crema' : 'text-azul-noche'
                                }`}
                        >
                            Nueva partida
                        </Text>
                    </Pressable>

                    <Text className="font-sans text-gris-pizarra text-xs text-center mt-2">
                        Spider-Man vs. Rino · Dificultad estándar
                    </Text>
                </View>

                <View />
            </View>
        </SafeAreaView>
    );
}