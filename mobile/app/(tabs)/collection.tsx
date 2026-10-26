import { useCallback, useState } from 'react';
import { Text, View, FlatList, Pressable, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { validateDeck, type CardIndex, type DeckDefinition } from 'engine';
import { getPlayerCardIndex } from '../../services/cardIndex';
import { loadDecks, loadOwnedCards, deleteDeck } from '../../storage/gameStorage';

const ASPECT_LABELS: Record<string, string> = {
    aggression: 'Agresión',
    justice: 'Justicia',
    leadership: 'Liderazgo',
    protection: 'Protección',
};

interface DeckRow {
    deck: DeckDefinition;
    heroTitle: string;
    aspectLabel: string;
    totalCards: number;
    ok: boolean;
    missingCount: number;
}

function buildRow(
    deck: DeckDefinition,
    index: CardIndex,
    owned: Record<string, number>,
): DeckRow {
    const result = validateDeck(deck, index, owned);
    const heroTitle = index[deck.heroCode]?.title ?? deck.heroCode;
    const aspectLabel = deck.aspect
        ? ASPECT_LABELS[deck.aspect] ?? deck.aspect
        : 'Sin aspecto';
    return {
        deck,
        heroTitle,
        aspectLabel,
        totalCards: result.totalCards,
        ok: result.ok,
        missingCount: result.missing.length,
    };
}

export default function CollectionScreen() {
    const router = useRouter();
    const [rows, setRows] = useState<DeckRow[] | null>(null);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setError(null);
        try {
            const [{ index }, owned, decks] = await Promise.all([
                getPlayerCardIndex(),
                loadOwnedCards(),
                loadDecks(),
            ]);
            setRows(decks.map((deck) => buildRow(deck, index, owned)));
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'No se ha podido cargar la colección.',
            );
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            load();
        }, [load]),
    );

    function handleDelete(deck: DeckDefinition) {
        Alert.alert(
            'Borrar mazo',
            `¿Seguro que quieres borrar «${deck.name}»? No se puede deshacer.`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Borrar',
                    style: 'destructive',
                    onPress: async () => {
                        await deleteDeck(deck.id);
                        load();
                    },
                },
            ],
        );
    }

    return (
        <View className="flex-1 bg-azul-noche pt-14 px-5">
            <View className="flex-row items-center justify-between mb-4">
                <Text className="font-display text-crema text-3xl">Colección</Text>
                <Pressable
                    onPress={() => router.push('/mazo/editar/nuevo')}
                    className="bg-dorado/15 rounded-full px-4 py-2 flex-row items-center gap-1"
                >
                    <Ionicons name="add" size={16} color="#D4A24C" />
                    <Text className="font-sans-bold text-dorado text-xs">Nuevo mazo</Text>
                </Pressable>
            </View>

            {error && (
                <View className="bg-dorado/10 border border-dorado/30 rounded-2xl p-4 mb-4">
                    <Text className="font-sans text-crema text-sm">{error}</Text>
                </View>
            )}

            {rows === null && !error && (
                <View className="flex-1 items-center justify-center gap-3">
                    <ActivityIndicator color="#D4A24C" />
                    <Text className="font-sans text-gris-pizarra text-sm">
                        Cargando catálogo de cartas...
                    </Text>
                </View>
            )}

            {rows !== null && (
                <FlatList
                    data={rows}
                    keyExtractor={(row) => row.deck.id}
                    contentContainerStyle={{ gap: 10, paddingBottom: 32 }}
                    renderItem={({ item }) => (
                        <DeckRowCard
                            row={item}
                            onPress={() => router.push(`/mazo/${item.deck.id}`)}
                            onDelete={() => handleDelete(item.deck)}
                        />
                    )}
                    ListEmptyComponent={
                        <View className="bg-crema/5 rounded-2xl p-5 gap-2 mt-4">
                            <Text className="font-sans-bold text-crema text-base">
                                Todavía no tienes ningún mazo
                            </Text>
                            <Text className="font-sans text-gris-pizarra text-sm">
                                Crea tu primer mazo con «Nuevo mazo» arriba: elige héroe,
                                aspecto y cartas, y la app te dirá si cumple las reglas de
                                construcción y qué cartas te faltan en tu colección.
                            </Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

function DeckRowCard({
    row,
    onPress,
    onDelete,
}: {
    row: DeckRow;
    onPress: () => void;
    onDelete: () => void;
}) {
    return (
        <Pressable
            onPress={onPress}
            className="bg-crema/5 rounded-2xl p-4 flex-row items-center gap-3"
        >
            <View className="flex-1 gap-1">
                <Text className="font-sans-bold text-crema text-base" numberOfLines={1}>
                    {row.deck.name}
                </Text>
                <Text className="font-sans text-dorado text-xs">
                    {row.heroTitle} · {row.aspectLabel}
                </Text>
                <Text className="font-sans text-gris-pizarra text-xs">
                    {row.totalCards} cartas
                    {row.missingCount > 0
                        ? ` · faltan ${row.missingCount} carta${row.missingCount > 1 ? 's' : ''} en tu colección`
                        : ''}
                </Text>
            </View>
            <View
                style={{
                    backgroundColor: row.ok
                        ? 'rgba(34,197,94,0.15)'
                        : 'rgba(239,68,68,0.15)',
                    borderRadius: 999,
                    paddingHorizontal: 12,
                    paddingVertical: 4,
                }}
            >
                <Text
                    className="font-sans-bold text-xs"
                    style={{ color: row.ok ? '#22c55e' : '#ef4444' }}
                >
                    {row.ok ? 'Válido' : 'Incompleto'}
                </Text>
            </View>
            <Pressable
                onPress={(e: any) => {
                    e.stopPropagation();
                    onDelete();
                }}
                className="p-2"
            >
                <Ionicons name="trash-outline" size={18} color="#6B7280" />
            </Pressable>
        </Pressable>
    );
}