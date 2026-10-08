import { useEffect, useState } from 'react';
import { Text, View, Pressable, ScrollView, TextInput } from 'react-native';
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
    thwartScheme,
    checkGameOutcome,
    describeCurrentStep,
    explainRecentEvents,
    runAndLog,
    getCardDefinition,
} from 'engine';
import type { GameState } from 'engine';
import { loadGame, saveGame } from '../../storage/gameStorage';

const STEPS = [
    { key: 'PLAYER_PHASE', label: 'Jugador' },
    { key: 'ADD_THREAT', label: 'Amenaza' },
    { key: 'VILLAIN_ACTIVATION', label: 'Villano' },
    { key: 'DEAL_ENCOUNTER_CARDS', label: 'Reparto' },
    { key: 'REVEAL_ENCOUNTER_CARDS', label: 'Revelar' },
    { key: 'PASS_FIRST_PLAYER', label: 'Testigo' },
] as const;

const TYPE_LABELS: Record<string, string> = {
    MINION: 'Esbirro',
    TREACHERY: 'Tratado',
    ATTACHMENT: 'Accesorio',
    SIDE_SCHEME: 'Plan secundario',
};

function currentStepKey(state: GameState): string {
    return state.phase.name === 'PLAYER_PHASE' ? 'PLAYER_PHASE' : state.phase.step;
}

function ProgressBar({ current, max, color }: { current: number; max: number; color: string }) {
    const pct = max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0;
    return (
        <View className="h-2 bg-crema/10 rounded-full overflow-hidden w-full">
            <View style={{ width: `${pct}%` }} className={`h-full ${color}`} />
        </View>
    );
}

export default function GameScreen() {
    const [state, setState] = useState<GameState | null>(null);
    const [damageInput, setDamageInput] = useState('');
    const [minionDamageInputs, setMinionDamageInputs] = useState<Record<string, string>>({});
    const [schemeThwartInputs, setSchemeThwartInputs] = useState<Record<string, string>>({});
    const [encounterPicks, setEncounterPicks] = useState<string[]>([]);

    useEffect(() => {
        async function load() {
            const saved = await loadGame();
            if (saved) {
                setState(deserializeGameState(saved));
            }
        }
        load();
    }, []);

    // Resetear picks cuando el paso cambia (fuera de REVEAL)
    useEffect(() => {
        if (!state) return;
        const isReveal =
            state.phase.name === 'VILLAIN_PHASE' &&
            state.phase.step === 'REVEAL_ENCOUNTER_CARDS';
        if (!isReveal && encounterPicks.length > 0) {
            setEncounterPicks([]);
        }
    }, [state?.phase, state, encounterPicks.length]);

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

    async function handleThwartScheme(schemeId: string) {
        if (!state) return;
        const amount = parseInt(schemeThwartInputs[schemeId] ?? '', 10);
        if (!amount || amount <= 0) return;
        const { state: next } = runAndLog(thwartScheme, state, schemeId, amount);
        setSchemeThwartInputs((prev) => ({ ...prev, [schemeId]: '' }));
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
                const faceDownCount = state.players[0].faceDownEncounterCards.length;
                if (faceDownCount > 0 && encounterPicks.length !== faceDownCount) {
                    return; // Falta elegir cartas
                }
                next = runAndLog(
                    revealPendingCardsForPlayer,
                    state,
                    state.players[0].id,
                    encounterPicks.length > 0 ? encounterPicks : undefined,
                ).state;
                setEncounterPicks([]);
            }
        }

        next = advanceToNextStep(next);
        await persist(next);
    }

    if (!state) {
        return (
            <View className="flex-1 bg-azul-noche items-center justify-center">
                <Text className="font-sans text-crema">Cargando partida...</Text>
            </View>
        );
    }

    const outcome = checkGameOutcome(state);

    if (outcome !== 'ONGOING') {
        return (
            <View className="flex-1 bg-azul-noche items-center justify-center px-8">
                <Text className="font-display text-crema text-5xl text-center">
                    {outcome === 'WIN' ? '¡HAS GANADO!' : 'HAS PERDIDO'}
                </Text>
                <Text className="font-sans text-gris-pizarra text-base mt-4 text-center">
                    {outcome === 'WIN' ? 'Has derrotado a Rino.' : 'El plan principal se ha completado.'}
                </Text>
            </View>
        );
    }

    const player = state.players[0];
    const step = describeCurrentStep(state);
    const recent = explainRecentEvents(state, 3);
    const isPlayerPhase = state.phase.name === 'PLAYER_PHASE';
    const isRevealStep =
        state.phase.name === 'VILLAIN_PHASE' &&
        state.phase.step === 'REVEAL_ENCOUNTER_CARDS';
    const activeKey = currentStepKey(state);

    const faceDownCount = player.faceDownEncounterCards.length;
    const encounterPool = isRevealStep
        ? [...state.encounterDeck, ...player.faceDownEncounterCards]
        : [];
    // Quitar del pool las cartas ya elegidas, una ocurrencia por elección
    const availablePool = (() => {
        const remaining = [...encounterPool];
        for (const pick of encounterPicks) {
            const idx = remaining.indexOf(pick);
            if (idx >= 0) remaining.splice(idx, 1);
        }
        return remaining;
    })();

    const canConfirm = !isRevealStep || faceDownCount === 0 || encounterPicks.length === faceDownCount;

    return (
        <ScrollView className="flex-1 bg-azul-noche" contentContainerStyle={{ padding: 20, gap: 16 }}>
            <View>
                <Text className="font-sans-semibold text-gris-pizarra text-xs uppercase tracking-widest">
                    Ronda {state.round}
                </Text>
                <Text className="font-display text-crema text-3xl">{step.title}</Text>
            </View>

            <View className="flex-row justify-between">
                {STEPS.map((s, i) => {
                    const isActive = s.key === activeKey;
                    return (
                        <View key={s.key} className="items-center flex-1">
                            <View
                                className={`w-7 h-7 rounded-full items-center justify-center mb-1 ${isActive ? 'bg-dorado' : 'bg-crema/10'
                                    }`}
                            >
                                <Text
                                    className={`font-sans-bold text-xs ${isActive ? 'text-azul-noche' : 'text-gris-pizarra'
                                        }`}
                                >
                                    {i + 1}
                                </Text>
                            </View>
                            <Text
                                className={`font-sans text-[10px] text-center ${isActive ? 'text-dorado' : 'text-gris-pizarra'
                                    }`}
                            >
                                {s.label}
                            </Text>
                        </View>
                    );
                })}
            </View>

            <View className="bg-crema/5 rounded-2xl p-4 gap-2">
                <View className="flex-row justify-between items-center">
                    <Text className="font-sans-bold text-crema text-base">
                        Rino ({state.villain.stage})
                    </Text>
                    <Text className="font-sans text-gris-pizarra text-xs">
                        {state.villain.health} / {state.villain.maxHealth}
                    </Text>
                </View>
                <ProgressBar current={state.villain.health} max={state.villain.maxHealth} color="bg-rojo-acento" />
            </View>

            <View className="bg-crema/5 rounded-2xl p-4 gap-2">
                <View className="flex-row justify-between items-center">
                    <Text className="font-sans-bold text-crema text-base">{player.heroName}</Text>
                    <Text className="font-sans text-gris-pizarra text-xs">
                        {player.health} / {player.maxHealth} · {player.form === 'HERO' ? 'Héroe' : 'Alter ego'}
                    </Text>
                </View>
                <ProgressBar current={player.health} max={player.maxHealth} color="bg-dorado" />
                <Pressable onPress={toggleForm} className="border border-crema/20 rounded-lg py-2 items-center mt-1">
                    <Text className="font-sans-semibold text-crema text-sm">
                        Cambiar a {player.form === 'HERO' ? 'alter ego' : 'héroe'}
                    </Text>
                </Pressable>
            </View>

            {state.schemes.length > 0 && (
                <View className="bg-crema/5 rounded-2xl p-4 gap-3">
                    <Text className="font-sans-bold text-crema text-base">Planes</Text>
                    {state.schemes.map((scheme) => (
                        <View key={scheme.id} className="gap-1">
                            <View className="flex-row justify-between items-center">
                                <Text className="font-sans text-crema text-sm">
                                    {scheme.name}
                                    {scheme.isMain ? ' · Plan principal' : ' · Plan secundario'}
                                </Text>
                                <Text className="font-sans text-gris-pizarra text-xs">
                                    {scheme.threat}/{scheme.threatToComplete}
                                </Text>
                            </View>
                            <ProgressBar current={scheme.threat} max={scheme.threatToComplete} color="bg-rojo-acento" />
                            {isPlayerPhase && (
                                <View className="flex-row gap-2 mt-1">
                                    <TextInput
                                        className="border border-crema/20 rounded-lg px-3 py-1.5 text-crema flex-1"
                                        placeholderTextColor="#6B7280"
                                        keyboardType="number-pad"
                                        value={schemeThwartInputs[scheme.id] ?? ''}
                                        onChangeText={(text) =>
                                            setSchemeThwartInputs((prev) => ({ ...prev, [scheme.id]: text }))
                                        }
                                        placeholder="Esfuerzo"
                                    />
                                    <Pressable onPress={() => handleThwartScheme(scheme.id)} className="bg-dorado rounded-lg px-4 justify-center">
                                        <Text className="font-sans-bold text-azul-noche text-sm">Aplicar</Text>
                                    </Pressable>
                                </View>
                            )}
                        </View>
                    ))}
                </View>
            )}

            {state.minions.length > 0 && (
                <View className="bg-crema/5 rounded-2xl p-4 gap-3">
                    <Text className="font-sans-bold text-crema text-base">Esbirros</Text>
                    {state.minions.map((minion) => (
                        <View key={minion.id} className="gap-1">
                            <View className="flex-row justify-between items-center">
                                <Text className="font-sans text-crema text-sm">
                                    {minion.name}
                                    {minion.guard ? ' · Guardia' : ''}
                                </Text>
                                <Text className="font-sans text-gris-pizarra text-xs">
                                    {minion.health}/{minion.maxHealth}
                                </Text>
                            </View>
                            <ProgressBar current={minion.health} max={minion.maxHealth} color="bg-rojo-acento" />
                            {isPlayerPhase && (
                                <View className="flex-row gap-2 mt-1">
                                    <TextInput
                                        className="border border-crema/20 rounded-lg px-3 py-1.5 text-crema flex-1"
                                        placeholderTextColor="#6B7280"
                                        keyboardType="number-pad"
                                        value={minionDamageInputs[minion.id] ?? ''}
                                        onChangeText={(text) =>
                                            setMinionDamageInputs((prev) => ({ ...prev, [minion.id]: text }))
                                        }
                                        placeholder="Daño"
                                    />
                                    <Pressable onPress={() => handleAttackMinion(minion.id)} className="bg-dorado rounded-lg px-4 justify-center">
                                        <Text className="font-sans-bold text-azul-noche text-sm">Aplicar</Text>
                                    </Pressable>
                                </View>
                            )}
                        </View>
                    ))}
                </View>
            )}

            {isPlayerPhase && (
                <View className="bg-crema/5 rounded-2xl p-4 gap-2">
                    <Text className="font-sans-bold text-crema text-base">Atacar a Rino</Text>
                    <View className="flex-row gap-2">
                        <TextInput
                            className="border border-crema/20 rounded-lg px-3 py-2 text-crema flex-1"
                            placeholderTextColor="#6B7280"
                            keyboardType="number-pad"
                            value={damageInput}
                            onChangeText={setDamageInput}
                            placeholder="Daño"
                        />
                        <Pressable onPress={handleAttack} className="bg-dorado rounded-lg px-5 justify-center">
                            <Text className="font-sans-bold text-azul-noche text-sm">Aplicar</Text>
                        </Pressable>
                    </View>
                </View>
            )}

            {isRevealStep && faceDownCount > 0 && (
                <View className="bg-crema/5 rounded-2xl p-4 gap-3">
                    <Text className="font-sans-bold text-crema text-base">
                        ¿Qué carta has robado? ({encounterPicks.length}/{faceDownCount})
                    </Text>
                    <Text className="font-sans text-gris-pizarra text-xs">
                        Mira la carta que tienes físicamente y selecciónala en la lista.
                    </Text>

                    {encounterPicks.length < faceDownCount && (
                        <View style={{ maxHeight: 240 }}>
                            <ScrollView contentContainerStyle={{ gap: 6 }} nestedScrollEnabled>
                                {availablePool.map((cardId, idx) => {
                                    const def = getCardDefinition(cardId);
                                    if (!def) return null;
                                    return (
                                        <Pressable
                                            key={`${cardId}-${idx}`}
                                            onPress={() => setEncounterPicks([...encounterPicks, cardId])}
                                            className="border border-crema/20 rounded-lg px-3 py-2"
                                        >
                                            <Text className="font-sans-semibold text-crema text-sm">{def.nameEs}</Text>
                                            <Text className="font-sans text-gris-pizarra text-xs">
                                                {TYPE_LABELS[def.type] ?? def.type}
                                            </Text>
                                        </Pressable>
                                    );
                                })}
                            </ScrollView>
                        </View>
                    )}

                    {encounterPicks.length > 0 && (
                        <View className="gap-1">
                            <Text className="font-sans text-gris-pizarra text-xs">
                                Elegidas:{' '}
                                {encounterPicks
                                    .map((id) => getCardDefinition(id)?.nameEs ?? id)
                                    .join(', ')}
                            </Text>
                            <Pressable
                                onPress={() => setEncounterPicks(encounterPicks.slice(0, -1))}
                                className="border border-crema/20 rounded-lg py-2 items-center"
                            >
                                <Text className="font-sans-semibold text-crema text-xs">
                                    Deshacer última
                                </Text>
                            </Pressable>
                        </View>
                    )}
                </View>
            )}

            <View className="bg-dorado/10 border border-dorado/30 rounded-2xl p-4 gap-1">
                <Text className="font-sans-bold text-dorado text-sm">{step.title}</Text>
                <Text className="font-sans text-crema text-sm">{step.description}</Text>
                {step.nextStep ? (
                    <Text className="font-sans text-gris-pizarra text-xs italic mt-1">{step.nextStep}</Text>
                ) : null}
            </View>

            <Pressable
                onPress={handleConfirm}
                disabled={!canConfirm}
                className={`rounded-xl py-4 items-center ${canConfirm ? 'bg-dorado' : 'bg-dorado/40'
                    }`}
            >
                <Text className="font-sans-bold text-azul-noche text-base">
                    {canConfirm ? 'Confirmar y continuar' : `Elige ${faceDownCount - encounterPicks.length} carta(s)`}
                </Text>
            </Pressable>

            {recent.length > 0 && (
                <View className="gap-1 pb-6">
                    <Text className="font-sans-semibold text-gris-pizarra text-xs uppercase tracking-widest">
                        Lo que acaba de pasar
                    </Text>
                    {recent.map((explanation, index) => (
                        <Text key={index} className="font-sans text-crema/80 text-xs">
                            {explanation.title}: {explanation.description}
                        </Text>
                    ))}
                </View>
            )}
        </ScrollView>
    );
}