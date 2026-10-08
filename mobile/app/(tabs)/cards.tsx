import { useMemo, useState } from 'react';
import { Text, View, TextInput, FlatList } from 'react-native';
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

function CardRow({ card }: { card: CardDefinition }) {
    const stats: string[] = [];
    if (card.attack !== undefined) stats.push(`ATQ ${card.attack}`);
    if (card.scheme !== undefined) stats.push(`PLAN ${card.scheme}`);
    if (card.health !== undefined) stats.push(`VIDA ${card.health}`);
    if (card.startingThreat !== undefined) stats.push(`AMENAZA ${card.startingThreat}`);

    return (
        <View className="bg-crema/5 rounded-2xl p-4 gap-1">
            <View className="flex-row justify-between items-center">
                <Text className="font-sans-bold text-crema text-base">{card.nameEs}</Text>
                <Text className="font-sans text-gris-pizarra text-xs">{card.nameEn}</Text>
            </View>
            <Text className="font-sans text-dorado text-xs">
                {TYPE_LABELS[card.type]} · {SET_LABELS[card.set]}
            </Text>
            {stats.length > 0 && (
                <Text className="font-sans text-crema/70 text-xs mt-1">{stats.join(' · ')}</Text>
            )}
            {card.traits && card.traits.length > 0 && (
                <Text className="font-sans text-gris-pizarra text-xs italic">{card.traits.join(', ')}</Text>
            )}
        </View>
    );
}

export default function CardsScreen() {
    const [query, setQuery] = useState('');

    const cards = useMemo(() => Object.values(CARD_CATALOG), []);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return cards;
        return cards.filter(
            (c) => c.nameEs.toLowerCase().includes(q) || c.nameEn.toLowerCase().includes(q)
        );
    }, [cards, query]);

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
                renderItem={({ item }) => <CardRow card={item} />}
                ListEmptyComponent={
                    <Text className="font-sans text-gris-pizarra text-sm text-center mt-8">
                        No se ha encontrado ninguna carta.
                    </Text>
                }
            />
        </View>
    );
}