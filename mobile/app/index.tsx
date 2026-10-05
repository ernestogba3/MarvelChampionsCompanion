import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
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
        <View style={styles.container}>
            <Text style={styles.title}>Phasekeeper</Text>
            <Text style={styles.subtitle}>Spider-Man vs Rhino</Text>

            {hasSavedGame === null && <Text>Cargando...</Text>}

            {hasSavedGame === true && (
                <Pressable style={styles.button} onPress={handleContinue}>
                    <Text style={styles.buttonText}>Continuar partida</Text>
                </Pressable>
            )}

            {hasSavedGame !== null && (
                <Pressable style={styles.buttonSecondary} onPress={handleNewGame}>
                    <Text style={styles.buttonText}>Nueva partida</Text>
                </Pressable>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        marginBottom: 24,
    },
    button: {
        backgroundColor: '#1a73e8',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
    },
    buttonSecondary: {
        backgroundColor: '#888',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
    },
    buttonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
});