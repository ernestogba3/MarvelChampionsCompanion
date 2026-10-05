import { useMemo, useState } from 'react';
import { Text, View, TextInput, FlatList } from 'react-native';

interface GlossaryEntry {
    termEs: string;
    termEn: string;
    definition: string;
    appearsIn: string;
    pending?: boolean;
}

const GLOSSARY: GlossaryEntry[] = [
    {
        termEs: 'Guardia',
        termEn: 'Guard',
        definition: 'Mientras un esbirro con Guardia esté enfrentado contigo, no puedes asignar ataques al villano.',
        appearsIn: 'Mercenario de Hydra',
    },
    {
        termEs: 'Dureza',
        termEn: 'Tough',
        definition: 'Si un personaje con dureza recibiría daño, se previene todo ese daño y se descarta el estado.',
        appearsIn: 'Hombre de Arena, Rino (III), "¡Soy duro!"',
    },
    {
        termEs: 'Oleada',
        termEn: 'Surge',
        definition: 'Si una carta gana oleada, se revela inmediatamente una carta de encuentro adicional.',
        appearsIn: '"¡Soy duro!", "Difícil de tumbar", Estampida',
    },
    {
        termEs: 'Aturdido',
        termEn: 'Stunned',
        definition: 'Si un héroe aturdido intenta atacar, se descarta el estado en lugar de resolver el ataque.',
        appearsIn: 'Estampida',
    },
    {
        termEs: 'Icono de peligro',
        termEn: 'Hazard',
        definition: 'Mientras esté en juego, se reparte una carta de encuentro adicional en el Paso 3 de la fase del villano.',
        appearsIn: 'Arramblar con todo',
    },
    {
        termEs: 'Icono de crisis',
        termEn: 'Crisis',
        definition: 'Mientras esté en juego, no se puede quitar amenaza del plan principal.',
        appearsIn: 'Control de multitudes',
    },
    {
        termEs: 'Elite',
        termEn: 'Elite',
        definition: 'Pendiente de verificar su efecto exacto contra el reglamento.',
        appearsIn: 'Hombre de Arena',
        pending: true,
    },
];

export default function RulesScreen() {
    const [query, setQuery] = useState('');

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return GLOSSARY;
        return GLOSSARY.filter(
            (entry) =>
                entry.termEs.toLowerCase().includes(q) ||
                entry.termEn.toLowerCase().includes(q) ||
                entry.appearsIn.toLowerCase().includes(q)
        );
    }, [query]);

    return (
        <View className="flex-1 bg-azul-noche pt-14 px-5">
            <Text className="font-display text-crema text-3xl mb-4">Reglas</Text>

            <TextInput
                className="border border-crema/20 rounded-xl px-4 py-3 text-crema mb-4"
                placeholder="Buscar una palabra clave..."
                placeholderTextColor="#6B7280"
                value={query}
                onChangeText={setQuery}
            />

            <FlatList
                data={filtered}
                keyExtractor={(item) => item.termEs}
                contentContainerStyle={{ gap: 12, paddingBottom: 32 }}
                renderItem={({ item }) => (
                    <View className="bg-crema/5 rounded-2xl p-4 gap-1">
                        <View className="flex-row justify-between items-center">
                            <Text className="font-sans-bold text-crema text-base">{item.termEs}</Text>
                            <Text className="font-sans text-gris-pizarra text-xs">{item.termEn}</Text>
                        </View>
                        <Text className="font-sans text-crema/80 text-sm">{item.definition}</Text>
                        <Text className="font-sans text-dorado text-xs mt-1">Aparece en: {item.appearsIn}</Text>
                        {item.pending && (
                            <Text className="font-sans text-rojo-acento text-xs italic mt-1">
                                Pendiente de verificar
                            </Text>
                        )}
                    </View>
                )}
                ListEmptyComponent={
                    <Text className="font-sans text-gris-pizarra text-sm text-center mt-8">
                        No se ha encontrado ninguna palabra clave.
                    </Text>
                }
            />
        </View>
    );
}