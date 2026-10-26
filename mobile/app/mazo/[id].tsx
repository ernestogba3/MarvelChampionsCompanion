import { useEffect, useState } from 'react';
import {
    Text,
    View,
    Pressable,
    ScrollView,
    Image,
    Modal,
    Dimensions,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import {
    ASPECT_FACTIONS,
    BASIC_FACTION,
    HERO_FACTION,
    type AspectFaction,
    type CardIndex,
    type DeckCardInfo,
    type DeckDefinition,
} from 'engine';
import { getPlayerCardIndex } from '../../services/cardIndex';
import { loadDeck } from '../../storage/gameStorage';

const ASPECT_LABELS: Record<AspectFaction, string> = {
    aggression: 'Agresión',
    justice: 'Justicia',
    leadership: 'Liderazgo',
    protection: 'Protección',
};

// Mismo ratio y función de URL que game.tsx y cards.tsx, para que la
// miniatura y el modal se vean iguales en toda la app.
const CARD_ASPECT_RATIO = 0.714;

function cardImageUrl(id: string) {
    return `https://es.marvelcdb.com/bundles/cards/${id}.png`;
}

interface Row {
    code: string;
    quantity: number;
    info: DeckCardInfo | null;
}

interface Group {
    key: string;
    label: string;
    rows: Row[];
}

/**
 * Agrupa las cartas del mazo en 3 bloques (más uno de "otras" por si
 * acaso): específicas del héroe, cartas de aspecto, básicas. Usa el mismo
 * criterio de clasificación que validateDeck() — mismos códigos de
 * facción y mismo heroSetCode — para que el visor refleje exactamente lo
 * que el motor consideraría válido.
 */
function groupDeckCards(deck: DeckDefinition, index: CardIndex): Group[] {
    const specific: Row[] = [];
    const aspect: Row[] = [];
    const basic: Row[] = [];
    const other: Row[] = [];

    for (const [code, qty] of Object.entries(deck.cards)) {
        if (qty <= 0) continue;
        const info = index[code] ?? null;
        const row: Row = { code, quantity: qty, info };
        if (!info) {
            other.push(row);
            continue;
        }
        if (info.factionCode === HERO_FACTION && info.heroSetCode === deck.heroSetCode) {
            specific.push(row);
        } else if ((ASPECT_FACTIONS as readonly string[]).includes(info.factionCode)) {
            aspect.push(row);
        } else if (info.factionCode === BASIC_FACTION) {
            basic.push(row);
        } else {
            other.push(row);
        }
    }

    const sortByTitle = (a: Row, b: Row) =>
        (a.info?.title ?? a.code).localeCompare(b.info?.title ?? b.code, 'es');
    specific.sort(sortByTitle);
    aspect.sort(sortByTitle);
    basic.sort(sortByTitle);
    other.sort(sortByTitle);

    const groups: Group[] = [];
    if (specific.length > 0) {
        groups.push({ key: 'specific', label: 'Específicas del héroe', rows: specific });
    }
    if (aspect.length > 0) {
        const aspectName = deck.aspect ? ASPECT_LABELS[deck.aspect] : 'Aspecto';
        groups.push({ key: 'aspect', label: aspectName, rows: aspect });
    }
    if (basic.length > 0) {
        groups.push({ key: 'basic', label: 'Básicas', rows: basic });
    }
    if (other.length > 0) {
        groups.push({ key: 'other', label: 'Otras', rows: other });
    }
    return groups;
}

type Phase = 'loading' | 'ready' | 'error';

export default function DeckViewerScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();

    const [phase, setPhase] = useState<Phase>('loading');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [deck, setDeck] = useState<DeckDefinition | null>(null);
    const [index, setIndex] = useState<CardIndex | null>(null);
    const [heroTitle, setHeroTitle] = useState<string | null>(null);
    const [modalCardId, setModalCardId] = useState<string | null>(null);

    const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
    const maxWidthFromScreen = screenWidth - 48;
    const maxWidthFromHeight = screenHeight * 0.72 * CARD_ASPECT_RATIO;
    const modalImageWidth = Math.min(maxWidthFromScreen, maxWidthFromHeight, 420);
    const modalImageHeight = modalImageWidth / CARD_ASPECT_RATIO;

    useEffect(() => {
        let active = true;
        (async () => {
            try {
                const [{ index: cardIndex }, loadedDeck] = await Promise.all([
                    getPlayerCardIndex(),
                    loadDeck(id),
                ]);
                if (!active) return;
                if (!loadedDeck) {
                    setErrorMessage('No se ha encontrado ese mazo.');
                    setPhase('error');
                    return;
                }
                setIndex(cardIndex);
                setDeck(loadedDeck);
                setHeroTitle(
                    cardIndex[loadedDeck.heroCode]?.title ?? loadedDeck.heroCode,
                );
                setPhase('ready');
            } catch (err) {
                if (!active) return;
                setErrorMessage(
                    err instanceof Error
                        ? err.message
                        : 'No se ha podido cargar el mazo.',
                );
                setPhase('error');
            }
        })();
        return () => {
            active = false;
        };
    }, [id]);

    if (phase === 'loading') {
        return (
            <View className="flex-1 bg-azul-noche items-center justify-center">
                <Stack.Screen options={{ headerShown: false }} />
                <ActivityIndicator color="#D4A24C" />
            </View>
        );
    }

    if (phase === 'error' || !deck || !index) {
        return (
            <View className="flex-1 bg-azul-noche pt-14 px-5">
                <Stack.Screen options={{ headerShown: false }} />
                <Pressable
                    onPress={() => router.back()}
                    className="mb-4 flex-row items-center gap-1"
                >
                    <Ionicons name="chevron-back" size={20} color="#D4A24C" />
                    <Text className="font-sans-bold text-dorado text-sm">Volver</Text>
                </Pressable>
                <View className="bg-dorado/10 border border-dorado/30 rounded-2xl p-4">
                    <Text className="font-sans text-crema text-sm">
                        {errorMessage ?? 'Mazo no disponible.'}
                    </Text>
                </View>
            </View>
        );
    }

    const groups = groupDeckCards(deck, index);
    const total = groups.reduce(
        (n, g) => n + g.rows.reduce((m, r) => m + r.quantity, 0),
        0,
    );
    const aspectLabel = deck.aspect ? ASPECT_LABELS[deck.aspect] : 'Sin aspecto';

    return (
        <>
            <Stack.Screen options={{ headerShown: false }} />
            <ScrollView
                className="flex-1 bg-azul-noche"
                contentContainerStyle={{
                    paddingHorizontal: 20,
                    paddingTop: 56,
                    paddingBottom: 40,
                    gap: 16,
                }}
            >
                <View className="flex-row items-center gap-2">
                    <Pressable onPress={() => router.back()} className="p-1">
                        <Ionicons name="chevron-back" size={22} color="#D4A24C" />
                    </Pressable>
                    <View className="flex-1">
                        <Text
                            className="font-display text-crema text-2xl"
                            numberOfLines={1}
                        >
                            {deck.name}
                        </Text>
                        <Text className="font-sans text-dorado text-xs">
                            {heroTitle} · {aspectLabel} · {total} cartas
                        </Text>
                    </View>
                    <Pressable
                        onPress={() => router.push(`/mazo/editar/${deck.id}`)}
                        className="bg-dorado/15 rounded-full px-4 py-2 flex-row items-center gap-1"
                    >
                        <Ionicons name="create-outline" size={16} color="#D4A24C" />
                        <Text className="font-sans-bold text-dorado text-xs">Editar</Text>
                    </Pressable>
                </View>

                {groups.map((group) => (
                    <View key={group.key} className="gap-2">
                        <Text className="font-sans-semibold text-gris-pizarra text-xs uppercase tracking-widest">
                            {group.label}
                        </Text>
                        <View className="gap-2">
                            {group.rows.map((row) => (
                                <Pressable
                                    key={row.code}
                                    onPress={() => setModalCardId(row.code)}
                                    className="bg-crema/5 rounded-xl p-3 flex-row items-center gap-3"
                                >
                                    <Image
                                        source={{ uri: cardImageUrl(row.code) }}
                                        style={{
                                            width: 44,
                                            height: 62,
                                            borderRadius: 4,
                                            backgroundColor: '#1a1f3a',
                                        }}
                                        resizeMode="contain"
                                    />
                                    <View className="flex-1">
                                        <Text
                                            className="font-sans-bold text-crema text-sm"
                                            numberOfLines={1}
                                        >
                                            {row.info?.title ?? row.code}
                                        </Text>
                                        <Text className="font-sans text-gris-pizarra text-xs">
                                            {group.label}
                                        </Text>
                                    </View>
                                    <View
                                        className="rounded-full px-2 py-0.5"
                                        style={{ backgroundColor: 'rgba(212,162,76,0.15)' }}
                                    >
                                        <Text className="font-sans-bold text-dorado text-xs">
                                            ×{row.quantity}
                                        </Text>
                                    </View>
                                </Pressable>
                            ))}
                        </View>
                    </View>
                ))}

                {groups.length === 0 && (
                    <View className="bg-crema/5 rounded-2xl p-4">
                        <Text className="font-sans text-gris-pizarra text-sm">
                            Este mazo no tiene cartas todavía. Pulsa «Editar» arriba
                            para añadirle cartas.
                        </Text>
                    </View>
                )}
            </ScrollView>

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