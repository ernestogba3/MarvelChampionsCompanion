import { useMemo, useState } from 'react';
import {
    Text,
    View,
    TextInput,
    FlatList,
    Pressable,
    Image,
    Modal,
    Dimensions,
} from 'react-native';
import { CARD_CATALOG } from 'engine';
import type { CardDefinition } from 'engine';

const TYPE_LABELS: Record<string, string> = {
    VILLAIN: 'Villano',
    MAIN_SCHEME: 'Plan principal',
    SIDE_SCHEME: 'Plan secundario',
    MINION: 'Esbirro',
    TREACHERY: 'Tratado',
    ATTACHMENT: 'Accesorio',
};

const SET_LABELS: Record<string, string> = {
    RHINO: 'Rino',
    STANDARD: 'Standard',
};

// Ratio aproximado de una carta de Marvel Champions (ancho/alto)
const CARD_ASPECT_RATIO = 0.714;

function cardImageUrl(id: string) {
    return `https://es.marvelcdb.com/bundles/cards/${id}.png`;
}

function CardRow({
    card,
    onPress,
}: {
    card: CardDefinition;
    onPress: () => void;
}) {
    const stats: string[] = [];
    if (card.attack !== undefined) stats.push(`ATQ ${card.attack}`);
    if (card.scheme !== undefined) stats.push(`PLAN ${card.scheme}`);
    if (card.health !== undefined) stats.push(`VIDA ${card.health}`);
    if (card.startingThreat !== undefined)
        stats.push(`AMENAZA ${card.startingThreat}`);

    return (
        <Pressable
            onPress={onPress}
            className="bg-crema/5 rounded-2xl p-3 flex-row gap-3"
        >
            <Image
                source={{ uri: cardImageUrl(card.id) }}
                style={{
                    width: 56,
                    height: 78,
                    borderRadius: 6,
                    backgroundColor: '#1a1f3a',
                }}
                resizeMode="contain"
            />
            <View className="flex-1 gap-1 justify-center">
                <Text
                    className="font-sans-bold text-crema text-base"
                    numberOfLines={1}
                >
                    {card.nameEs}
                </Text>
                <Text className="font-sans text-dorado text-xs">
                    {TYPE_LABELS[card.type] ?? card.type} ·{' '}
                    {SET_LABELS[card.set] ?? card.set}
                </Text>
                {stats.length > 0 && (
                    <Text className="font-sans text-crema/70 text-xs">
                        {stats.join(' · ')}
                    </Text>
                )}
                {card.traits && card.traits.length > 0 && (
                    <Text
                        className="font-sans text-gris-pizarra text-xs italic"
                        numberOfLines={1}
                    >
                        {card.traits.join(', ')}
                    </Text>
                )}
            </View>
        </Pressable>
    );
}

export default function CardsScreen() {
    const [query, setQuery] = useState('');
    const [selectedCard, setSelectedCard] = useState<CardDefinition | null>(null);
    const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

    const cards = useMemo(() => Object.values(CARD_CATALOG), []);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return cards;
        return cards.filter(
            (c) =>
                c.nameEs.toLowerCase().includes(q) ||
                c.nameEn.toLowerCase().includes(q),
        );
    }, [cards, query]);

    // La imagen del modal se ajusta al ancho de pantalla menos padding,
    // pero sin pasar del 75% del alto para dejar hueco al título.
    const maxWidthFromScreen = screenWidth - 48;
    const maxWidthFromHeight = (screenHeight * 0.72) * CARD_ASPECT_RATIO;
    const modalImageWidth = Math.min(maxWidthFromScreen, maxWidthFromHeight, 420);
    const modalImageHeight = modalImageWidth / CARD_ASPECT_RATIO;

    return (
        <View className="flex-1 bg-azul-noche pt-14 px-5">
            <Text className="font-display text-crema text-3xl mb-4">Cartas</Text>

            <TextInput
                className="border border-crema/20 rounded-xl px-4 py-3 text-crema mb-4"
                placeholder="Buscar una carta..."
                placeholderTextColor="#6B7280"
                value={query}
                onChangeText={setQuery}
            />

            <FlatList
                data={filtered}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ gap: 10, paddingBottom: 32 }}
                renderItem={({ item }) => (
                    <CardRow card={item} onPress={() => setSelectedCard(item)} />
                )}
                ListEmptyComponent={
                    <Text className="font-sans text-gris-pizarra text-sm text-center mt-8">
                        No se ha encontrado ninguna carta.
                    </Text>
                }
            />

            <Modal
                visible={selectedCard !== null}
                transparent
                animationType="fade"
                onRequestClose={() => setSelectedCard(null)}
            >
                <Pressable
                    className="flex-1 items-center justify-center px-6"
                    style={{ backgroundColor: 'rgba(10, 15, 30, 0.95)' }}
                    onPress={() => setSelectedCard(null)}
                >
                    {selectedCard && (
                        <View className="items-center gap-4">
                            <Image
                                source={{ uri: cardImageUrl(selectedCard.id) }}
                                style={{
                                    width: modalImageWidth,
                                    height: modalImageHeight,
                                    borderRadius: 12,
                                    backgroundColor: '#1a1f3a',
                                }}
                                resizeMode="contain"
                            />
                            <Text className="font-display text-crema text-2xl text-center">
                                {selectedCard.nameEs}
                            </Text>
                            <Text className="font-sans text-gris-pizarra text-xs text-center">
                                Toca fuera para cerrar
                            </Text>
                        </View>
                    )}
                </Pressable>
            </Modal>
        </View>
    );
}