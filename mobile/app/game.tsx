import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, Pressable, ScrollView, TextInput } from 'react-native';
import {
    deserializeGameState,
    serializeGameState,
    advanceToNextStep,
    addThreatStep,
    resolveVillainActivation,
    dealPendingEncounterCards,
    revealPendingCardsForPlayer,
    attackVillain,
    attackMinion,
    checkGameOutcome,
    describeCurrentStep,
    explainRecentEvents,
    runAndLog,
} from 'engine';
import type { GameState } from 'engine';
import { loadGame, saveGame } from '../storage/gameStorage';

export default function GameScreen() {
    const [state, setState] = useState<GameState | null>(null);
    const [damageInput, setDamageInput] = useState('');
    const [minionDamageInputs, setMinionDamageInputs] = useState<Record<string, string>>({});

    useEffect(() => {
        async function load() {
            const saved = await loadGame();
            if (saved) {
                setState(deserializeGameState(saved));
            }
        }
        load();
    }, []);

    async function persist(next: GameState) {
        await saveGame(serializeGameState(next));
        setState(next);
    }

    async function toggleForm() {
        if (!state) return;
        const player = state.players[0];
        const next: GameState = {
            ...state,
            players: [{ ...player, form: player.form === 'HERO' ? 'ALTER_EGO' : 'HERO' }],
        };
        await persist(next);
    }

    async function handleAttack() {
        if (!state) return;
        const amount = parseInt(damageInput, 10);
        if (!amount || amount <= 0) return;
        const { state: next } = runAndLog(attackVillain, state, amount);
        setDamageInput('');
        await persist(next);
    }

    async function handleAttackMinion(minionId: string) {
        if (!state) return;
        const amount = parseInt(minionDamageInputs[minionId] ?? '', 10);
        if (!amount || amount <= 0) return;
        const { state: next } = runAndLog(attackMinion, state, minionId, amount);
        setMinionDamageInputs((prev) => ({ ...prev, [minionId]: '' }));
        await persist(next);
    }

    async function handleConfirm() {
        if (!state) return;
        let next = state;

        if (state.phase.name === 'VILLAIN_PHASE') {
            if (state.phase.step === 'ADD_THREAT') {
                next = runAndLog(addThreatStep, state).state;
            } else if (state.phase.step === 'VILLAIN_ACTIVATION') {
                next = runAndLog(resolveVillainActivation, state, state.players[0].id).state;
            } else if (state.phase.step === 'DEAL_ENCOUNTER_CARDS') {
                next = runAndLog(dealPendingEncounterCards, state).state;
            } else if (state.phase.step === 'REVEAL_ENCOUNTER_CARDS') {
                next = runAndLog(revealPendingCardsForPlayer, state, state.players[0].id).state;
            }
        }

        next = advanceToNextStep(next);
        await persist(next);
    }

    if (!state) {
        return (
            <View style={styles.container}>
                <Text>Cargando partida...</Text>
            </View>
        );
    }

    const outcome = checkGameOutcome(state);

    if (outcome !== 'ONGOING') {
        return (
            <View style={styles.container}>
                <Text style={styles.outcomeTitle}>
                    {outcome === 'WIN' ? '¡Has ganado!' : 'Has perdido'}
                </Text>
                <Text style={styles.outcomeDescription}>
                    {outcome === 'WIN' ? 'Has derrotado a Rino.' : 'El plan principal se ha completado.'}
                </Text>
            </View>
        );
    }

    const player = state.players[0];
    const step = describeCurrentStep(state);
    const recent = explainRecentEvents(state, 3);
    const isPlayerPhase = state.phase.name === 'PLAYER_PHASE';

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.round}>Ronda {state.round}</Text>

            <View style={styles.row}>
                <Text style={styles.label}>Rino ({state.villain.stage})</Text>
                <Text>
                    {state.villain.health} / {state.villain.maxHealth}
                </Text>
            </View>

            <View style={styles.row}>
                <Text style={styles.label}>{player.heroName}</Text>
                <Text>
                    {player.health} / {player.maxHealth} — {player.form === 'HERO' ? 'Héroe' : 'Alter ego'}
                </Text>
            </View>

            {state.minions.length > 0 && (
                <View style={styles.minionsBox}>
                    <Text style={styles.label}>Esbirros</Text>
                    {state.minions.map((minion) => (
                        <View key={minion.id} style={styles.minionRow}>
                            <Text style={styles.minionItem}>
                                {minion.name} — {minion.health}/{minion.maxHealth}
                                {minion.guard ? ' (Guardia)' : ''}
                            </Text>
                            {isPlayerPhase && (
                                <View style={styles.attackRow}>
                                    <TextInput
                                        style={styles.inputSmall}
                                        keyboardType="number-pad"
                                        value={minionDamageInputs[minion.id] ?? ''}
                                        onChangeText={(text) =>
                                            setMinionDamageInputs((prev) => ({ ...prev, [minion.id]: text }))
                                        }
                                        placeholder="Daño"
                                    />
                                    <Pressable style={styles.buttonSmall} onPress={() => handleAttackMinion(minion.id)}>
                                        <Text style={styles.buttonText}>Aplicar</Text>
                                    </Pressable>
                                </View>
                            )}
                        </View>
                    ))}
                </View>
            )}

            <Pressable style={styles.buttonSecondary} onPress={toggleForm}>
                <Text style={styles.buttonText}>
                    Cambiar a {player.form === 'HERO' ? 'alter ego' : 'héroe'}
                </Text>
            </Pressable>

            {isPlayerPhase && (
                <View style={styles.attackBox}>
                    <Text style={styles.label}>Atacar a Rino</Text>
                    <View style={styles.attackRow}>
                        <TextInput
                            style={styles.input}
                            keyboardType="number-pad"
                            value={damageInput}
                            onChangeText={setDamageInput}
                            placeholder="Daño"
                        />
                        <Pressable style={styles.buttonSmall} onPress={handleAttack}>
                            <Text style={styles.buttonText}>Aplicar</Text>
                        </Pressable>
                    </View>
                </View>
            )}

            <View style={styles.stepBox}>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepDescription}>{step.description}</Text>
                {step.nextStep ? <Text style={styles.stepNext}>{step.nextStep}</Text> : null}
            </View>

            <Pressable style={styles.button} onPress={handleConfirm}>
                <Text style={styles.buttonText}>Confirmar y continuar</Text>
            </Pressable>

            {recent.length > 0 && (
                <View style={styles.recentBox}>
                    <Text style={styles.recentTitle}>Lo que acaba de pasar</Text>
                    {recent.map((explanation, index) => (
                        <Text key={index} style={styles.recentItem}>
                            {explanation.title}: {explanation.description}
                        </Text>
                    ))}
                </View>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        backgroundColor: '#fff',
        alignItems: 'stretch',
        justifyContent: 'flex-start',
        padding: 24,
        gap: 12,
    },
    round: {
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 12,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    label: {
        fontWeight: 'bold',
    },
    minionsBox: {
        gap: 8,
    },
    minionRow: {
        gap: 4,
    },
    minionItem: {
        fontSize: 13,
        color: '#444',
    },
    button: {
        backgroundColor: '#1a73e8',
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 12,
    },
    buttonSecondary: {
        backgroundColor: '#888',
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: 'center',
    },
    buttonSmall: {
        backgroundColor: '#1a73e8',
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 8,
        justifyContent: 'center',
    },
    buttonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    attackBox: {
        gap: 8,
    },
    attackRow: {
        flexDirection: 'row',
        gap: 8,
        alignItems: 'center',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        flex: 1,
    },
    inputSmall: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 6,
        width: 70,
    },
    stepBox: {
        backgroundColor: '#f0f4ff',
        padding: 16,
        borderRadius: 8,
        marginTop: 12,
    },
    stepTitle: {
        fontWeight: 'bold',
        fontSize: 16,
        marginBottom: 4,
    },
    stepDescription: {
        marginBottom: 4,
    },
    stepNext: {
        fontStyle: 'italic',
        color: '#555',
    },
    recentBox: {
        marginTop: 12,
    },
    recentTitle: {
        fontWeight: 'bold',
        marginBottom: 4,
    },
    recentItem: {
        fontSize: 13,
        color: '#444',
    },
    outcomeTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    outcomeDescription: {
        textAlign: 'center',
        marginTop: 8,
        color: '#555',
    },
});