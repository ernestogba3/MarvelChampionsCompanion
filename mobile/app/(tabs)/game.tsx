import { useEffect, useState } from 'react';
import {
    Text,
    View,
    Pressable,
    ScrollView,
    TextInput,
    Image,
    Modal,
    Dimensions,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
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
    drawCards,
    playCardFromHand,
    discardCardFromHand,
    createDrone,
    adjustEnvironmentCounters,
    putEncounterMinionIntoPlay,
    allVillains,
    setActiveVillain,
    addThreatToScheme,
    getScenarioForState,
} from 'engine';
import type { GameState } from 'engine';
import { loadGame, saveGame } from '../../storage/gameStorage';

// Barajado real (Fisher-Yates) para rebarajar el descarte si la biblioteca se
// agota durante un robo manual. Mismo criterio que index.tsx: el motor es
// determinista y la app le inyecta la aleatoriedad.
function shuffleDeck(cards: readonly string[]): string[] {
    const out = [...cards];
    for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = out[i];
        out[i] = out[j];
        out[j] = tmp;
    }
    return out;
}

// Semilla aleatoria del mazo de encuentros para las partidas guardadas antes
// de que el motor la llevara en el estado (sin ella, rebarajar el descarte
// conservaría el orden). Mismo criterio que index.tsx.
function randomSeed(): number {
    return Math.floor(Math.random() * 2 ** 32);
}

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

const CARD_ASPECT_RATIO = 0.714;

function cardImageUrl(id: string) {
    return `https://es.marvelcdb.com/bundles/cards/${id}.png`;
}

function currentStepKey(state: GameState): string {
    return state.phase.name === 'PLAYER_PHASE' ? 'PLAYER_PHASE' : state.phase.step;
}

function ProgressBar({
    current,
    max,
    color,
}: {
    current: number;
    max: number;
    color: string;
}) {
    const pct = max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0;
    return (
        <View className="h-2 bg-crema/10 rounded-full overflow-hidden w-full">
            <View style={{ width: `${pct}%` }} className={`h-full ${color}`} />
        </View>
    );
}

function CardThumb({
    cardId,
    size = 'md',
    onPress,
}: {
    cardId: string;
    size?: 'sm' | 'md';
    onPress?: () => void;
}) {
    const dims = size === 'sm' ? { w: 44, h: 62 } : { w: 50, h: 70 };
    const img = (
        <Image
            source={{ uri: cardImageUrl(cardId) }}
            style={{
                width: dims.w,
                height: dims.h,
                borderRadius: 4,
                backgroundColor: '#1a1f3a',
            }}
            resizeMode="contain"
        />
    );
    if (!onPress) return img;
    return <Pressable onPress={onPress}>{img}</Pressable>;
}

export default function GameScreen() {
    const router = useRouter();
    const [state, setState] = useState<GameState | null>(null);
    const [damageInputs, setDamageInputs] = useState<Record<string, string>>({});
    const [minionDamageInputs, setMinionDamageInputs] = useState<Record<string, string>>({});
    const [schemeThwartInputs, setSchemeThwartInputs] = useState<Record<string, string>>({});
    const [encounterPicks, setEncounterPicks] = useState<string[]>([]);
    const [modalCardId, setModalCardId] = useState<string | null>(null);
    // Jugador para el que se está eligiendo un esbirro que poner en juego
    // (efectos de carta guiados: "pon en juego el esbirro enfrentado a ti").
    const [minionPickerPlayerId, setMinionPickerPlayerId] = useState<string | null>(null);
    // Varios villanos (The Wrecking Crew): villano al que atacan los jugadores.
    // null = el villano activo.
    const [attackTargetId, setAttackTargetId] = useState<string | null>(null);

    const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
    const maxWidthFromScreen = screenWidth - 48;
    const maxWidthFromHeight = screenHeight * 0.72 * CARD_ASPECT_RATIO;
    const modalImageWidth = Math.min(maxWidthFromScreen, maxWidthFromHeight, 420);
    const modalImageHeight = modalImageWidth / CARD_ASPECT_RATIO;

    useEffect(() => {
        async function load() {
            const saved = await loadGame();
            if (saved) {
                const loaded = deserializeGameState(saved);
                setState(
                    loaded.encounterShuffleSeed === undefined
                        ? { ...loaded, encounterShuffleSeed: randomSeed() }
                        : loaded,
                );
            }
        }
        load();
    }, []);

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

    async function toggleForm(playerId: string) {
        if (!state) return;
        const next: GameState = {
            ...state,
            players: state.players.map((p) =>
                p.id === playerId
                    ? { ...p, form: p.form === 'HERO' ? 'ALTER_EGO' : 'HERO' }
                    : p,
            ),
        };
        await persist(next);
    }

    async function handleAttack(playerId: string) {
        if (!state) return;
        const amount = parseInt(damageInputs[playerId] ?? '', 10);
        if (!amount || amount <= 0) return;
        // Con varios villanos se ataca al objetivo elegido (por defecto, el activo).
        const target =
            allVillains(state).find((v) => v.villainId === attackTargetId) ?? state.villain;
        const { state: next, events } = runAndLog(
            attackVillain,
            state,
            playerId,
            amount,
            target.villainId,
        );
        const blocked = events.find((e: any) => e.type === 'ATTACK_BLOCKED_BY_GUARD') as
            | { minionName: string }
            | undefined;
        if (blocked) {
            Alert.alert(
                'Bloqueado por Guardia',
                `No puedes atacar a ${target.name} mientras "${blocked.minionName}" esté enfrentado contigo. Derrótalo primero.`,
            );
            return;
        }
        // Inmunidad de Ultron III: no puede sufrir daño mientras haya un Dron.
        const immune = events.find((e: any) => e.type === 'ATTACK_BLOCKED_BY_DRONES');
        if (immune) {
            Alert.alert(
                'Inmune por los Drones',
                `${state.villain.name} no puede sufrir daño mientras haya un Dron en juego. Derrota primero todos los Drones.`,
            );
            return;
        }
        setDamageInputs((prev) => ({ ...prev, [playerId]: '' }));
        await persist(next);
    }

    async function handleCreateDrone(playerId: string) {
        if (!state) return;
        const { state: next, events } = runAndLog(createDrone, state, playerId, {
            shuffle: shuffleDeck,
        });
        if (!events.some((e: any) => e.type === 'DRONE_CREATED')) {
            Alert.alert(
                'Sin cartas',
                'Este jugador no tiene mazo o se ha quedado sin cartas para poner como Dron.',
            );
            return;
        }
        await persist(next);
    }

    // Contadores del Entorno (Negocios arriesgados) para los efectos de carta
    // guiados. Si se queda a 0, el motor da la vuelta al villano y al Entorno.
    async function handleEnvironmentCounters(delta: number) {
        if (!state) return;
        const { state: next } = runAndLog(adjustEnvironmentCounters, state, delta);
        await persist(next);
    }

    // Contador activo a mano (empates que decide el jugador inicial y cartas
    // que "mueven el contador activo").
    async function handleSetActive(villainId: string) {
        if (!state) return;
        const { state: next } = runAndLog(setActiveVillain, state, villainId);
        await persist(next);
    }

    // +1 de amenaza a un plan, para los efectos de carta guiados. Si un plan
    // propio llega a 10, el motor dispara su efecto.
    async function handleAddThreat(schemeId: string) {
        if (!state) return;
        const { state: next } = runAndLog(addThreatToScheme, state, schemeId, 1);
        await persist(next);
    }

    async function handlePutMinion(cardId: string) {
        if (!state || !minionPickerPlayerId) return;
        const { state: next } = runAndLog(
            putEncounterMinionIntoPlay,
            state,
            cardId,
            minionPickerPlayerId,
        );
        setMinionPickerPlayerId(null);
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

    async function handleDraw(playerId: string) {
        if (!state) return;
        const { state: next } = runAndLog(drawCards, state, playerId, 1, {
            shuffle: shuffleDeck,
        });
        await persist(next);
    }

    async function handlePlayCard(playerId: string, cardCode: string) {
        if (!state) return;
        const { state: next } = runAndLog(playCardFromHand, state, playerId, cardCode);
        await persist(next);
    }

    async function handleDiscardCard(playerId: string, cardCode: string) {
        if (!state) return;
        const { state: next } = runAndLog(discardCardFromHand, state, playerId, cardCode);
        await persist(next);
    }

    async function handleConfirm() {
        if (!state) return;
        let next = state;

        if (state.phase.name === 'VILLAIN_PHASE') {
            if (state.phase.step === 'ADD_THREAT') {
                next = runAndLog(addThreatStep, state).state;
            } else if (state.phase.step === 'VILLAIN_ACTIVATION') {
                // El villano activa una vez contra CADA jugador, en orden.
                let acc = state;
                for (const p of state.players) {
                    acc = runAndLog(resolveVillainActivation, acc, p.id).state;
                }
                next = acc;
            } else if (state.phase.step === 'DEAL_ENCOUNTER_CARDS') {
                next = runAndLog(dealPendingEncounterCards, state).state;
            } else if (state.phase.step === 'REVEAL_ENCOUNTER_CARDS') {
                const revealingPlayer = state.players.find(
                    (p) => p.faceDownEncounterCards.length > 0,
                );
                if (revealingPlayer) {
                    const faceDown = revealingPlayer.faceDownEncounterCards.length;
                    if (encounterPicks.length !== faceDown) {
                        return;
                    }
                    const { state: resolved, events: revealEvents } = runAndLog(
                        revealPendingCardsForPlayer,
                        state,
                        revealingPlayer.id,
                        encounterPicks.length > 0 ? encounterPicks : undefined,
                    );
                    setEncounterPicks([]);

                    // Oleada: por cada carta revelada con Oleada impresa, el
                    // jugador revela una carta de encuentro adicional. Repartimos
                    // esas cartas boca abajo al mismo jugador y seguimos en el
                    // paso de Revelar (la UI pedirá elegir cuáles robó).
                    const surgeCount = revealEvents.filter(
                        (e: any) => e.type === 'CARD_GAINED_SURGE',
                    ).length;
                    let afterSurge = resolved;
                    if (surgeCount > 0) {
                        const queued: GameState = {
                            ...resolved,
                            pendingEncounterDeals: Array.from(
                                { length: surgeCount },
                                () => revealingPlayer.id,
                            ),
                        };
                        afterSurge = runAndLog(dealPendingEncounterCards, queued).state;
                    }

                    const stillPending = afterSurge.players.some(
                        (p) => p.faceDownEncounterCards.length > 0,
                    );
                    if (stillPending) {
                        // Queda otro jugador (o cartas de Oleada) por revelar: se
                        // guarda pero NO se avanza de paso.
                        await persist(afterSurge);
                        return;
                    }
                    next = afterSurge;
                }
            }
        }

        // Pasamos el barajador real: si al robar hasta la mano al final de la
        // fase del jugador alguna biblioteca se agota, su descarte se rebaraja
        // de forma aleatoria (no determinista).
        next = advanceToNextStep(next, { shuffle: shuffleDeck });
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
                    {outcome === 'WIN'
                        ? `Has derrotado a ${getScenarioForState(state)?.villainName ?? state.villain.name}.`
                        : 'El plan principal se ha completado.'}
                </Text>
            </View>
        );
    }

    const step = describeCurrentStep(state);
    const recent = explainRecentEvents(state, 3);
    const isPlayerPhase = state.phase.name === 'PLAYER_PHASE';
    const isRevealStep =
        state.phase.name === 'VILLAIN_PHASE' &&
        state.phase.step === 'REVEAL_ENCOUNTER_CARDS';
    const activeKey = currentStepKey(state);

    const villainCardId = state.villain.cardId || null;

    const lastBoostCard = (() => {
        for (let i = state.eventLog.length - 1; i >= 0; i--) {
            const e = state.eventLog[i] as any;
            if (e.type === 'BOOST_CARD_REVEALED') {
                return { cardId: e.cardId as string, boostValue: e.boostValue as number };
            }
        }
        return null;
    })();

    // Durante Revelar, se pasa por cada jugador con cartas boca abajo, uno a
    // la vez, en orden — sin tocar el estado guardado, se deduce de quién le
    // quedan cartas pendientes.
    const revealingPlayer = isRevealStep
        ? state.players.find((p) => p.faceDownEncounterCards.length > 0) ?? null
        : null;
    const faceDownCount = revealingPlayer ? revealingPlayer.faceDownEncounterCards.length : 0;

    const encounterPool = isRevealStep && revealingPlayer
        ? [...state.encounterDeck, ...revealingPlayer.faceDownEncounterCards]
        : [];
    const availablePool = (() => {
        const remaining = [...encounterPool];
        for (const pick of encounterPicks) {
            const idx = remaining.indexOf(pick);
            if (idx >= 0) remaining.splice(idx, 1);
        }
        return remaining;
    })();

    const canConfirm =
        !isRevealStep || faceDownCount === 0 || encounterPicks.length === faceDownCount;

    // ¿Este villano usa Drones? Hoy solo Ultron. Al añadir más villanos con
    // drones, amplía esta condición (o expón un flag del escenario).
    const villainUsesDrones = state.villain.name === 'Ultron';

    // Entorno con contadores (Negocios arriesgados). Ausente en el resto.
    const environment = state.environment;

    // Varios villanos a la vez (The Wrecking Crew): todos los villanos en
    // juego y el objetivo de los ataques (el elegido o, si no, el activo).
    const isMultiVillain = state.reserveVillains !== undefined;
    const villainsInPlay = allVillains(state);
    const attackTarget =
        villainsInPlay.find((v) => v.villainId === attackTargetId) ?? state.villain;

    // Esbirros que se pueden poner en juego por un efecto de carta: los que
    // quedan en el mazo o el descarte de encuentros, agrupados por carta.
    const availableMinions = (() => {
        const counts = new Map<string, number>();
        for (const id of [...state.encounterDeck, ...state.encounterDiscard]) {
            if (getCardDefinition(id)?.type === 'MINION') {
                counts.set(id, (counts.get(id) ?? 0) + 1);
            }
        }
        return [...counts.entries()];
    })();
    const minionPickerPlayer =
        state.players.find((p) => p.id === minionPickerPlayerId) ?? null;

    return (
        <>
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

                {/* VILLANO */}
                <View className="bg-crema/5 rounded-2xl p-4 flex-row gap-3 items-center">
                    {villainCardId && (
                        <CardThumb cardId={villainCardId} onPress={() => setModalCardId(villainCardId)} />
                    )}
                    <View className="flex-1 gap-2">
                        <View className="flex-row justify-between items-center">
                            <Text className="font-sans-bold text-crema text-base">
                                {state.villain.name} ({state.villain.stage})
                            </Text>
                            <Text className="font-sans text-gris-pizarra text-xs">
                                {state.villain.health} / {state.villain.maxHealth}
                            </Text>
                        </View>
                        <ProgressBar
                            current={state.villain.health}
                            max={state.villain.maxHealth}
                            color="bg-rojo-acento"
                        />
                        {state.villain.immuneWhileDronesPresent &&
                            state.minions.some((m) => m.isDrone) && (
                                <Text
                                    className="font-sans-semibold text-[11px]"
                                    style={{ color: '#ef4444' }}
                                >
                                    Inmune: no puede sufrir daño mientras haya un Dron en juego.
                                </Text>
                            )}
                        {lastBoostCard && (
                            <View className="flex-row items-center gap-2 mt-1">
                                <CardThumb
                                    cardId={lastBoostCard.cardId}
                                    size="sm"
                                    onPress={() => setModalCardId(lastBoostCard.cardId)}
                                />
                                <Text className="font-sans text-gris-pizarra text-xs flex-1">
                                    Última carta de impulso:{' '}
                                    {lastBoostCard.boostValue > 0
                                        ? `+${lastBoostCard.boostValue}`
                                        : 'sin icono (+0)'}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* VARIOS VILLANOS (The Wrecking Crew): contador activo y objetivo */}
                {isMultiVillain && (
                    <View className="bg-crema/5 rounded-2xl p-4 gap-3">
                        <Text className="font-sans-bold text-crema text-base">Villanos en juego</Text>
                        <Text className="font-sans text-gris-pizarra text-[11px]">
                            Solo activa el villano activo. Toca un villano para atacarlo; usa
                            "Hacer activo" en los empates o cuando una carta mueva el contador.
                        </Text>
                        {villainsInPlay.map((v) => {
                            const isActive = v.villainId === state.villain.villainId;
                            const isTarget = v.villainId === attackTarget.villainId;
                            return (
                                <Pressable
                                    key={v.villainId ?? v.cardId}
                                    onPress={() => setAttackTargetId(v.villainId ?? null)}
                                    className="flex-row gap-3 items-center rounded-xl p-2 border"
                                    style={{
                                        borderColor: isTarget
                                            ? 'rgba(212,162,76,0.8)'
                                            : 'rgba(245,240,230,0.1)',
                                    }}
                                >
                                    <CardThumb
                                        cardId={v.cardId}
                                        size="sm"
                                        onPress={() => setModalCardId(v.cardId)}
                                    />
                                    <View className="flex-1 gap-1">
                                        <View className="flex-row justify-between items-center">
                                            <Text className="font-sans-bold text-crema text-sm">
                                                {v.name}
                                                {isActive ? ' · ACTIVO' : ''}
                                                {v.tough ? ' · Resistente' : ''}
                                            </Text>
                                            <Text className="font-sans text-gris-pizarra text-xs">
                                                {v.health} / {v.maxHealth}
                                            </Text>
                                        </View>
                                        <ProgressBar
                                            current={v.health}
                                            max={v.maxHealth}
                                            color="bg-rojo-acento"
                                        />
                                        {isTarget && (
                                            <Text className="font-sans-semibold text-dorado text-[10px]">
                                                Objetivo de los ataques
                                            </Text>
                                        )}
                                    </View>
                                    {!isActive && v.villainId && (
                                        <Pressable
                                            onPress={() => handleSetActive(v.villainId!)}
                                            className="border border-crema/20 rounded-lg px-2 py-1"
                                        >
                                            <Text className="font-sans-semibold text-crema text-[11px]">
                                                Hacer activo
                                            </Text>
                                        </Pressable>
                                    )}
                                </Pressable>
                            );
                        })}
                    </View>
                )}

                {/* ENTORNO CON CONTADORES (Negocios arriesgados) */}
                {environment && (
                    <View className="bg-crema/5 rounded-2xl p-4 flex-row gap-3 items-center">
                        <CardThumb
                            cardId={environment.cardId}
                            onPress={() => setModalCardId(environment.cardId)}
                        />
                        <View className="flex-1 gap-2">
                            <View className="flex-row justify-between items-center">
                                <Text className="font-sans-bold text-crema text-base">
                                    {environment.name}
                                </Text>
                                <Text className="font-sans-semibold text-dorado text-sm">
                                    {environment.counters} {environment.counterName}
                                </Text>
                            </View>
                            <Text className="font-sans text-gris-pizarra text-[11px]">
                                Ajusta los contadores cuando una carta lo indique. Al llegar a 0,
                                el villano y el Entorno se dan la vuelta.
                            </Text>
                            <View className="flex-row gap-2">
                                <Pressable
                                    onPress={() => handleEnvironmentCounters(-1)}
                                    className="border border-crema/20 rounded-lg py-1.5 items-center flex-1"
                                >
                                    <Text className="font-sans-bold text-crema text-sm">
                                        −1 {environment.counterName}
                                    </Text>
                                </Pressable>
                                <Pressable
                                    onPress={() => handleEnvironmentCounters(1)}
                                    className="border border-crema/20 rounded-lg py-1.5 items-center flex-1"
                                >
                                    <Text className="font-sans-bold text-crema text-sm">
                                        +1 {environment.counterName}
                                    </Text>
                                </Pressable>
                            </View>
                        </View>
                    </View>
                )}

                {/* HÉROES: uno por jugador */}
                {state.players.map((p) => {
                    const displayName = p.form === 'HERO' ? p.heroName : p.alterEgoName;
                    const otherName = p.form === 'HERO' ? p.alterEgoName : p.heroName;
                    const identityCardId = p.form === 'HERO' ? p.heroCardId : p.alterEgoCardId;
                    const hasDeck = !!p.deckId;
                    return (
                        <View key={p.id} className="bg-crema/5 rounded-2xl p-4 gap-2">
                            <View className="flex-row gap-3 items-center">
                                {identityCardId && (
                                    <CardThumb
                                        cardId={identityCardId}
                                        onPress={() => setModalCardId(identityCardId)}
                                    />
                                )}
                                <View className="flex-1 gap-2">
                                    <View className="flex-row justify-between items-center">
                                        <Text className="font-sans-bold text-crema text-base">{displayName}</Text>
                                        <Text className="font-sans text-gris-pizarra text-xs">
                                            {p.health} / {p.maxHealth} ·{' '}
                                            {p.form === 'HERO' ? 'Héroe' : 'Alter ego'}
                                        </Text>
                                    </View>
                                    <ProgressBar current={p.health} max={p.maxHealth} color="bg-dorado" />
                                </View>
                            </View>
                            <View className="flex-row gap-2 mt-1">
                                <Pressable
                                    onPress={() => toggleForm(p.id)}
                                    className="border border-crema/20 rounded-lg py-2 items-center flex-1"
                                >
                                    <Text className="font-sans-semibold text-crema text-sm">
                                        Cambiar a {otherName}
                                    </Text>
                                </Pressable>
                                <Pressable
                                    onPress={() => {
                                        if (p.deckId) router.push(`/mazo/${p.deckId}`);
                                    }}
                                    disabled={!hasDeck}
                                    className="border border-crema/20 rounded-lg py-2 items-center flex-1"
                                    style={{ opacity: hasDeck ? 1 : 0.4 }}
                                >
                                    <Text className="font-sans-semibold text-crema text-sm">
                                        {hasDeck ? 'Ver mazo' : 'Sin mazo'}
                                    </Text>
                                </Pressable>
                            </View>
                            {villainUsesDrones && p.library !== undefined && (
                                <Pressable
                                    onPress={() => handleCreateDrone(p.id)}
                                    className="border rounded-lg py-2 items-center mt-1"
                                    style={{ borderColor: 'rgba(212,162,76,0.5)' }}
                                >
                                    <Text className="font-sans-semibold text-dorado text-sm">
                                        Crear Dron (cima del mazo)
                                    </Text>
                                </Pressable>
                            )}
                            {availableMinions.length > 0 && (
                                <Pressable
                                    onPress={() => setMinionPickerPlayerId(p.id)}
                                    className="border border-crema/20 rounded-lg py-2 items-center mt-1"
                                >
                                    <Text className="font-sans-semibold text-crema text-sm">
                                        Poner esbirro en juego (efecto de carta)
                                    </Text>
                                </Pressable>
                            )}
                            {isPlayerPhase && (
                                <View className="flex-row gap-2 mt-1">
                                    <TextInput
                                        className="border border-crema/20 rounded-lg px-3 py-2 text-crema flex-1"
                                        placeholderTextColor="#6B7280"
                                        keyboardType="number-pad"
                                        value={damageInputs[p.id] ?? ''}
                                        onChangeText={(text) =>
                                            setDamageInputs((prev) => ({ ...prev, [p.id]: text }))
                                        }
                                        placeholder={`Daño a ${attackTarget.name}`}
                                    />
                                    <Pressable
                                        onPress={() => handleAttack(p.id)}
                                        className="bg-dorado rounded-lg px-5 justify-center"
                                    >
                                        <Text className="font-sans-bold text-azul-noche text-sm">Atacar</Text>
                                    </Pressable>
                                </View>
                            )}
                            {/* MANO Y BIBLIOTECA — solo si el jugador trae mazo
                                (library !== undefined). Sin mazo, este bloque no
                                aparece y la partida funciona igual que antes. */}
                            {p.library !== undefined && (
                                <View className="mt-2 gap-2 border-t border-crema/10 pt-2">
                                    <View className="flex-row justify-between items-center">
                                        <Text className="font-sans-semibold text-gris-pizarra text-xs">
                                            Biblioteca {p.library.length} · Mano{' '}
                                            {p.hand?.length ?? 0} · Descarte{' '}
                                            {p.discardPile?.length ?? 0}
                                        </Text>
                                        <Pressable
                                            onPress={() => handleDraw(p.id)}
                                            className="bg-dorado/15 border border-dorado rounded-lg px-3 py-1.5"
                                        >
                                            <Text className="font-sans-bold text-dorado text-xs">
                                                Robar carta
                                            </Text>
                                        </Pressable>
                                    </View>
                                    {(p.hand?.length ?? 0) === 0 ? (
                                        <Text className="font-sans text-gris-pizarra text-xs">
                                            Mano vacía.
                                        </Text>
                                    ) : (
                                        <ScrollView
                                            horizontal
                                            showsHorizontalScrollIndicator={false}
                                            contentContainerStyle={{ gap: 8, paddingVertical: 2 }}
                                        >
                                            {(p.hand ?? []).map((cardCode, idx) => {
                                                const def = getCardDefinition(cardCode);
                                                return (
                                                    <View
                                                        key={`${cardCode}-${idx}`}
                                                        className="items-center gap-1"
                                                        style={{ width: 64 }}
                                                    >
                                                        <CardThumb
                                                            cardId={cardCode}
                                                            size="sm"
                                                            onPress={() => setModalCardId(cardCode)}
                                                        />
                                                        <Text
                                                            className="font-sans text-gris-pizarra text-[9px] text-center"
                                                            numberOfLines={1}
                                                        >
                                                            {def?.nameEs ?? cardCode}
                                                        </Text>
                                                        <View className="flex-row gap-1">
                                                            <Pressable
                                                                onPress={() => handlePlayCard(p.id, cardCode)}
                                                                className="bg-crema/10 rounded px-2 py-0.5"
                                                            >
                                                                <Text className="font-sans text-crema text-[9px]">
                                                                    Jugar
                                                                </Text>
                                                            </Pressable>
                                                            <Pressable
                                                                onPress={() => handleDiscardCard(p.id, cardCode)}
                                                                className="bg-crema/10 rounded px-2 py-0.5"
                                                            >
                                                                <Text className="font-sans text-crema text-[9px]">
                                                                    Tirar
                                                                </Text>
                                                            </Pressable>
                                                        </View>
                                                    </View>
                                                );
                                            })}
                                        </ScrollView>
                                    )}
                                </View>
                            )}
                        </View>
                    );
                })}

                {/* PLANES */}
                {state.schemes.length > 0 && (
                    <View className="bg-crema/5 rounded-2xl p-4 gap-3">
                        <Text className="font-sans-bold text-crema text-base">Planes</Text>
                        {state.schemes.map((scheme) => {
                            const schemeCardId = scheme.cardId || null;
                            return (
                                <View key={scheme.id} className="flex-row gap-3">
                                    {schemeCardId && (
                                        <CardThumb
                                            cardId={schemeCardId}
                                            onPress={() => setModalCardId(schemeCardId)}
                                        />
                                    )}
                                    <View className="flex-1 gap-1">
                                        <View className="flex-row justify-between items-center">
                                            <Text className="font-sans text-crema text-sm flex-1" numberOfLines={1}>
                                                {scheme.name}
                                                {scheme.isMain
                                                    ? ' · Principal'
                                                    : scheme.villainId
                                                      ? ` · de ${villainsInPlay.find((v) => v.villainId === scheme.villainId)?.name ?? ''}`
                                                      : ' · Secundario'}
                                            </Text>
                                            <Text className="font-sans text-gris-pizarra text-xs">
                                                {scheme.threat}/{scheme.threatToComplete}
                                            </Text>
                                        </View>
                                        {scheme.isMain && scheme.accelerationTokens > 0 && (
                                            <Text className="font-sans text-rojo-acento text-[10px]">
                                                +{scheme.accelerationTokens} aceleración (mazo de encuentros barajado)
                                            </Text>
                                        )}
                                        <ProgressBar
                                            current={scheme.threat}
                                            max={scheme.threatToComplete}
                                            color="bg-rojo-acento"
                                        />
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
                                                <Pressable
                                                    onPress={() => handleThwartScheme(scheme.id)}
                                                    className="bg-dorado rounded-lg px-4 justify-center"
                                                >
                                                    <Text className="font-sans-bold text-azul-noche text-sm">Aplicar</Text>
                                                </Pressable>
                                            </View>
                                        )}
                                        {/* +1 de amenaza para efectos de carta guiados
                                            ("coloca N de amenaza en …"), en cualquier paso. */}
                                        <Pressable
                                            onPress={() => handleAddThreat(scheme.id)}
                                            className="border border-crema/20 rounded-lg py-1 items-center mt-1"
                                        >
                                            <Text className="font-sans-semibold text-crema text-xs">
                                                +1 amenaza (efecto de carta)
                                            </Text>
                                        </Pressable>
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                )}

                {/* ESBIRROS */}
                {state.minions.length > 0 && (
                    <View className="bg-crema/5 rounded-2xl p-4 gap-3">
                        <Text className="font-sans-bold text-crema text-base">Esbirros</Text>
                        {state.minions.map((minion) => {
                            const engagedPlayer = state.players.find((p) => p.id === minion.engagedWith);
                            return (
                                <View key={minion.id} className="flex-row gap-3">
                                    {minion.isDrone ? (
                                        // Dron: carta boca abajo, no se muestra la ilustración.
                                        <View
                                            style={{
                                                width: 50,
                                                height: 70,
                                                borderRadius: 4,
                                                backgroundColor: '#1a1f3a',
                                                borderWidth: 1,
                                                borderColor: 'rgba(212,162,76,0.4)',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                            }}
                                        >
                                            <Ionicons name="hardware-chip" size={22} color="#D4A24C" />
                                        </View>
                                    ) : (
                                        <CardThumb cardId={minion.cardId} onPress={() => setModalCardId(minion.cardId)} />
                                    )}
                                    <View className="flex-1 gap-1">
                                        <View className="flex-row justify-between items-center">
                                            <Text className="font-sans text-crema text-sm flex-1" numberOfLines={1}>
                                                {minion.name}
                                                {minion.isDrone ? ' · boca abajo' : ''}
                                                {minion.guard ? ' · Guardia' : ''}
                                            </Text>
                                            <Text className="font-sans text-gris-pizarra text-xs">
                                                {minion.health}/{minion.maxHealth}
                                            </Text>
                                        </View>
                                        {engagedPlayer && (
                                            <Text className="font-sans text-gris-pizarra text-[10px]">
                                                Enganchado con {engagedPlayer.heroName}
                                            </Text>
                                        )}
                                        <ProgressBar
                                            current={minion.health}
                                            max={minion.maxHealth}
                                            color="bg-rojo-acento"
                                        />
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
                                                <Pressable
                                                    onPress={() => handleAttackMinion(minion.id)}
                                                    className="bg-dorado rounded-lg px-4 justify-center"
                                                >
                                                    <Text className="font-sans-bold text-azul-noche text-sm">Aplicar</Text>
                                                </Pressable>
                                            </View>
                                        )}
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                )}

                {/* PICKER DE CARTA DE ENCUENTRO */}
                {isRevealStep && revealingPlayer && faceDownCount > 0 && (
                    <View className="bg-crema/5 rounded-2xl p-4 gap-3">
                        <Text className="font-sans-bold text-crema text-base">
                            {revealingPlayer.form === 'HERO'
                                ? revealingPlayer.heroName
                                : revealingPlayer.alterEgoName}
                            : ¿qué carta has robado? ({encounterPicks.length}/{faceDownCount})
                        </Text>
                        <Text className="font-sans text-gris-pizarra text-xs">
                            Mira la carta que tienes físicamente y selecciónala en la lista.
                        </Text>

                        {encounterPicks.length < faceDownCount && (
                            <View style={{ maxHeight: 320 }}>
                                <ScrollView contentContainerStyle={{ gap: 6 }} nestedScrollEnabled>
                                    {availablePool.map((cardId, idx) => {
                                        const def = getCardDefinition(cardId);
                                        if (!def) return null;
                                        return (
                                            <Pressable
                                                key={`${cardId}-${idx}`}
                                                onPress={() => setEncounterPicks([...encounterPicks, cardId])}
                                                className="border border-crema/20 rounded-lg p-2 flex-row gap-3 items-center"
                                            >
                                                <CardThumb cardId={cardId} size="sm" />
                                                <View className="flex-1">
                                                    <Text className="font-sans-semibold text-crema text-sm">
                                                        {def.nameEs}
                                                    </Text>
                                                    <Text className="font-sans text-gris-pizarra text-xs">
                                                        {TYPE_LABELS[def.type] ?? def.type}
                                                    </Text>
                                                </View>
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
                                    <Text className="font-sans-semibold text-crema text-xs">Deshacer última</Text>
                                </Pressable>
                            </View>
                        )}
                    </View>
                )}

                <View className="bg-dorado/10 border border-dorado/30 rounded-2xl p-4 gap-1">
                    <Text className="font-sans-bold text-dorado text-sm">{step.title}</Text>
                    <Text className="font-sans text-crema text-sm">{step.description}</Text>
                    {step.nextStep ? (
                        <Text className="font-sans text-gris-pizarra text-xs italic mt-1">
                            {step.nextStep}
                        </Text>
                    ) : null}
                </View>

                <Pressable
                    onPress={handleConfirm}
                    disabled={!canConfirm}
                    className={`rounded-xl py-4 items-center ${canConfirm ? 'bg-dorado' : 'bg-dorado/40'}`}
                >
                    <Text className="font-sans-bold text-azul-noche text-base">
                        {canConfirm
                            ? 'Confirmar y continuar'
                            : `Elige ${faceDownCount - encounterPicks.length} carta(s)`}
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

            {/* MODAL: ELEGIR ESBIRRO QUE PONER EN JUEGO */}
            <Modal
                visible={minionPickerPlayer !== null}
                transparent
                animationType="fade"
                onRequestClose={() => setMinionPickerPlayerId(null)}
            >
                <View
                    className="flex-1 justify-center px-6"
                    style={{ backgroundColor: 'rgba(10, 15, 30, 0.95)' }}
                >
                    <View className="bg-azul-noche border border-crema/20 rounded-2xl p-4 gap-3">
                        <Text className="font-sans-bold text-crema text-base">
                            Esbirro enfrentado a {minionPickerPlayer?.heroName}
                        </Text>
                        <Text className="font-sans text-gris-pizarra text-xs">
                            Elige el esbirro que la carta pone en juego. Sale del mazo de
                            encuentros (o de su descarte si no quedan copias en el mazo).
                        </Text>
                        <View style={{ maxHeight: 360 }}>
                            <ScrollView contentContainerStyle={{ gap: 6 }}>
                                {availableMinions.map(([cardId, count]) => {
                                    const def = getCardDefinition(cardId);
                                    return (
                                        <Pressable
                                            key={cardId}
                                            onPress={() => handlePutMinion(cardId)}
                                            className="border border-crema/20 rounded-lg p-2 flex-row gap-3 items-center"
                                        >
                                            <CardThumb cardId={cardId} size="sm" />
                                            <View className="flex-1">
                                                <Text className="font-sans-semibold text-crema text-sm">
                                                    {def?.nameEs ?? cardId}
                                                </Text>
                                                <Text className="font-sans text-gris-pizarra text-xs">
                                                    {count} {count === 1 ? 'disponible' : 'disponibles'}
                                                </Text>
                                            </View>
                                        </Pressable>
                                    );
                                })}
                            </ScrollView>
                        </View>
                        <Pressable
                            onPress={() => setMinionPickerPlayerId(null)}
                            className="border border-crema/20 rounded-lg py-2 items-center"
                        >
                            <Text className="font-sans-semibold text-crema text-sm">Cancelar</Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>

            {/* MODAL CON LA CARTA GRANDE */}
            <Modal
                visible={modalCardId !== null}
                transparent
                animationType="fade"
                onRequestClose={() => setModalCardId(null)}
            >
                <Pressable
                    className="flex-1 items-center justify-center px-6"
                    style={{ backgroundColor: 'rgba(10, 15, 30, 0.95)' }}
                    onPress={() => setModalCardId(null)}
                >
                    {modalCardId && (
                        <View className="items-center gap-4">
                            <Image
                                source={{ uri: cardImageUrl(modalCardId) }}
                                style={{
                                    width: modalImageWidth,
                                    height: modalImageHeight,
                                    borderRadius: 12,
                                    backgroundColor: '#1a1f3a',
                                }}
                                resizeMode="contain"
                            />
                            <Text className="font-sans text-gris-pizarra text-xs text-center">
                                Toca fuera para cerrar
                            </Text>
                        </View>
                    )}
                </Pressable>
            </Modal>
        </>
    );
}