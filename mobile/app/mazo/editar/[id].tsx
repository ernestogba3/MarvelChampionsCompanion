import { useEffect, useMemo, useState } from 'react';
import {
    Text,
    View,
    Pressable,
    SectionList,
    TextInput,
    Image,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import {
    validateDeck,
    isDeckEligibleCard,
    deckSize,
    DECK_MIN_CARDS,
    DECK_MAX_CARDS,
    ASPECT_FACTIONS,
    HERO_FACTION,
    BASIC_FACTION,
    type AspectFaction,
    type CardIndex,
    type DeckDefinition,
    type PackCardInfo,
} from 'engine';
import { getPlayerCardIndex } from '../../../services/cardIndex';
import { getPackCards } from '../../../services/packDeck';
import { getHeroCatalog, type HeroCatalogEntry } from '../../../services/heroCatalog';
import { loadDeck, saveDeck, loadOwnedCards } from '../../../storage/gameStorage';

const ASPECT_LABELS: Record<AspectFaction, string> = {
    aggression: 'Agresión',
    justice: 'Justicia',
    leadership: 'Liderazgo',
    protection: 'Protección',
};

const CARD_ASPECT_RATIO = 0.714;

function cardImageUrl(id: string) {
    return `https://es.marvelcdb.com/bundles/cards/${id}.png`;
}

/** Tope de copias de una carta: su deck_limit, o 3 (el máximo habitual). */
function cardLimit(card: PackCardInfo | undefined): number {
    if (card && card.deckLimit > 0) return card.deckLimit;
    return 3;
}

/** Copias que incluye por defecto una carta del héroe (firma): su cantidad. */
function heroCardCopies(card: PackCardInfo): number {
    const n = card.deckLimit > 0 ? Math.min(card.quantity, card.deckLimit) : card.quantity;
    return Math.max(1, n);
}

interface EditorRow {
    code: string;
    title: string;
    factionCode: string;
}

type Phase = 'loading' | 'ready' | 'error';

export default function DeckEditorScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const isNew = id === 'nuevo';

    const [phase, setPhase] = useState<Phase>('loading');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const [index, setIndex] = useState<CardIndex>({});
    const [packByCode, setPackByCode] = useState<Map<string, PackCardInfo>>(new Map());
    const [packCards, setPackCards] = useState<PackCardInfo[]>([]);
    const [owned, setOwned] = useState<Record<string, number>>({});
    const [heroes, setHeroes] = useState<HeroCatalogEntry[]>([]);

    // Campos del mazo en edición.
    const [deckId, setDeckId] = useState<string | null>(isNew ? null : id);
    const [name, setName] = useState('');
    const [heroCode, setHeroCode] = useState<string>('');
    const [heroSetCode, setHeroSetCode] = useState<string>('');
    const [heroName, setHeroName] = useState<string>('');
    const [aspect, setAspect] = useState<AspectFaction | null>(null);
    const [cards, setCards] = useState<Record<string, number>>({});

    const [heroQuery, setHeroQuery] = useState('');
    const [search, setSearch] = useState('');

    useEffect(() => {
        let active = true;
        (async () => {
            try {
                const [{ index: cardIndex }, pack, ownedCards, heroCatalog, existing] =
                    await Promise.all([
                        getPlayerCardIndex(),
                        getPackCards(),
                        loadOwnedCards(),
                        getHeroCatalog(),
                        isNew ? Promise.resolve(null) : loadDeck(id),
                    ]);
                if (!active) return;
                if (!isNew && !existing) {
                    setErrorMessage('No se ha encontrado ese mazo.');
                    setPhase('error');
                    return;
                }
                setIndex(cardIndex);
                setPackCards(pack);
                setPackByCode(new Map(pack.map((c) => [c.code, c])));
                setOwned(ownedCards);
                setHeroes(heroCatalog.heroes);
                if (existing) {
                    setDeckId(existing.id);
                    setName(existing.name);
                    setHeroCode(existing.heroCode);
                    setHeroSetCode(existing.heroSetCode);
                    setHeroName(cardIndex[existing.heroCode]?.title ?? existing.heroCode);
                    setAspect(existing.aspect);
                    setCards({ ...existing.cards });
                }
                setPhase('ready');
            } catch (err) {
                if (!active) return;
                setErrorMessage(
                    err instanceof Error ? err.message : 'No se ha podido cargar el editor.',
                );
                setPhase('error');
            }
        })();
        return () => {
            active = false;
        };
    }, [id, isNew]);

    /** Elige el héroe de un mazo nuevo y precarga sus cartas de firma. */
    function chooseHero(hero: HeroCatalogEntry) {
        const setCode = index[hero.heroCardId]?.heroSetCode ?? '';
        setHeroCode(hero.heroCardId);
        setHeroSetCode(setCode);
        setHeroName(hero.heroName);
        setName(hero.heroName);
        const prefilled: Record<string, number> = {};
        for (const card of packCards) {
            if (card.factionCode === HERO_FACTION && card.setCode === setCode) {
                prefilled[card.code] = heroCardCopies(card);
            }
        }
        setCards(prefilled);
    }

    function setQuantity(code: string, qty: number) {
        setCards((prev) => {
            const next = { ...prev };
            if (qty <= 0) delete next[code];
            else next[code] = qty;
            return next;
        });
    }

    function changeAspect(next: AspectFaction | null) {
        // Al cambiar de aspecto, las cartas del aspecto anterior dejan de ser
        // válidas: se quitan. Las del héroe y las básicas se conservan.
        setCards((prev) => {
            const kept: Record<string, number> = {};
            for (const [code, qty] of Object.entries(prev)) {
                const card = packByCode.get(code);
                const faction = card?.factionCode;
                const isAspectCard =
                    faction !== undefined &&
                    (ASPECT_FACTIONS as readonly string[]).includes(faction);
                if (!isAspectCard || faction === next) kept[code] = qty;
            }
            return kept;
        });
        setAspect(next);
    }

    // Secciones de cartas elegibles (héroe / aspecto / básicas), filtradas por
    // el buscador. Depende del aspecto elegido y del catálogo.
    const sections = useMemo(() => {
        if (!heroCode) return [];
        const q = search.trim().toLowerCase();
        const hero: EditorRow[] = [];
        const aspectRows: EditorRow[] = [];
        const basic: EditorRow[] = [];
        for (const card of packCards) {
            if (!isDeckEligibleCard(card, heroSetCode, aspect)) continue;
            const title = index[card.code]?.title ?? card.code;
            if (q.length > 0 && !title.toLowerCase().includes(q)) continue;
            const row: EditorRow = { code: card.code, title, factionCode: card.factionCode };
            if (card.factionCode === HERO_FACTION) hero.push(row);
            else if (card.factionCode === BASIC_FACTION) basic.push(row);
            else aspectRows.push(row);
        }
        const byTitle = (a: EditorRow, b: EditorRow) => a.title.localeCompare(b.title, 'es');
        hero.sort(byTitle);
        aspectRows.sort(byTitle);
        basic.sort(byTitle);
        const out: { key: string; title: string; data: EditorRow[] }[] = [];
        if (hero.length > 0) out.push({ key: 'hero', title: 'Específicas del héroe', data: hero });
        if (aspectRows.length > 0) {
            out.push({
                key: 'aspect',
                title: aspect ? ASPECT_LABELS[aspect] : 'Aspecto',
                data: aspectRows,
            });
        }
        if (basic.length > 0) out.push({ key: 'basic', title: 'Básicas', data: basic });
        return out;
    }, [heroCode, heroSetCode, aspect, packCards, index, search]);

    const deck: DeckDefinition = useMemo(
        () => ({
            id: deckId ?? 'nuevo',
            name: name.trim() || heroName || 'Mazo sin nombre',
            heroCode,
            heroSetCode,
            aspect,
            cards,
        }),
        [deckId, name, heroName, heroCode, heroSetCode, aspect, cards],
    );

    const validation = useMemo(
        () => (heroCode ? validateDeck(deck, index, owned) : null),
        [deck, index, owned, heroCode],
    );
    const total = deckSize(deck);

    async function handleSave() {
        if (!heroCode) return;
        setSaving(true);
        try {
            const toSave: DeckDefinition = {
                ...deck,
                id: deckId ?? `user-${Date.now()}`,
            };
            await saveDeck(toSave);
            router.back();
        } catch (err) {
            setSaving(false);
            Alert.alert(
                'No se pudo guardar',
                err instanceof Error ? err.message : 'Inténtalo de nuevo.',
            );
        }
    }

    if (phase === 'loading') {
        return (
            <View className="flex-1 bg-azul-noche items-center justify-center">
                <Stack.Screen options={{ headerShown: false }} />
                <ActivityIndicator color="#D4A24C" />
            </View>
        );
    }

    if (phase === 'error') {
        return (
            <View className="flex-1 bg-azul-noche pt-14 px-5">
                <Stack.Screen options={{ headerShown: false }} />
                <Pressable onPress={() => router.back()} className="mb-4 flex-row items-center gap-1">
                    <Ionicons name="chevron-back" size={20} color="#D4A24C" />
                    <Text className="font-sans-bold text-dorado text-sm">Volver</Text>
                </Pressable>
                <View className="bg-dorado/10 border border-dorado/30 rounded-2xl p-4">
                    <Text className="font-sans text-crema text-sm">
                        {errorMessage ?? 'No disponible.'}
                    </Text>
                </View>
            </View>
        );
    }

    // --- Mazo nuevo sin héroe elegido: selector de héroe ---
    if (!heroCode) {
        const q = heroQuery.trim().toLowerCase();
        const matches =
            q.length > 0
                ? heroes.filter((h) => h.heroName.toLowerCase().includes(q)).slice(0, 12)
                : heroes.slice(0, 12);
        return (
            <View className="flex-1 bg-azul-noche pt-14 px-5">
                <Stack.Screen options={{ headerShown: false }} />
                <View className="flex-row items-center gap-2 mb-4">
                    <Pressable onPress={() => router.back()} className="p-1">
                        <Ionicons name="chevron-back" size={22} color="#D4A24C" />
                    </Pressable>
                    <Text className="font-display text-crema text-2xl">Nuevo mazo</Text>
                </View>
                <Text className="font-sans-semibold text-gris-pizarra text-xs uppercase tracking-widest mb-2">
                    Elige el héroe
                </Text>
                <TextInput
                    className="border border-crema/20 rounded-lg px-3 py-2 text-crema mb-3"
                    placeholderTextColor="#6B7280"
                    value={heroQuery}
                    onChangeText={setHeroQuery}
                    placeholder="Buscar héroe (ej. Spider-Man)"
                    autoCapitalize="none"
                />
                <SectionList
                    sections={[{ key: 'h', title: '', data: matches }]}
                    keyExtractor={(h) => h.heroCardId}
                    renderSectionHeader={() => null}
                    contentContainerStyle={{ gap: 8, paddingBottom: 32 }}
                    renderItem={({ item }) => (
                        <Pressable
                            onPress={() => chooseHero(item)}
                            className="bg-crema/5 rounded-xl p-3 flex-row items-center gap-3"
                        >
                            <Image
                                source={{ uri: cardImageUrl(item.heroCardId) }}
                                style={{ width: 40, height: 56, borderRadius: 4, backgroundColor: '#1a1f3a' }}
                                resizeMode="contain"
                            />
                            <View className="flex-1">
                                <Text className="font-sans-bold text-crema text-sm" numberOfLines={1}>
                                    {item.heroName}
                                </Text>
                                <Text className="font-sans text-gris-pizarra text-xs" numberOfLines={1}>
                                    {item.alterEgoName}
                                </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color="#6B7280" />
                        </Pressable>
                    )}
                />
            </View>
        );
    }

    const sizeOk = total >= DECK_MIN_CARDS && total <= DECK_MAX_CARDS;
    const canSave = validation !== null && validation.ok;

    return (
        <View className="flex-1 bg-azul-noche pt-14">
            <Stack.Screen options={{ headerShown: false }} />
            <View className="px-5">
                <View className="flex-row items-center gap-2">
                    <Pressable onPress={() => router.back()} className="p-1">
                        <Ionicons name="chevron-back" size={22} color="#D4A24C" />
                    </Pressable>
                    <View className="flex-1">
                        <Text className="font-display text-crema text-xl" numberOfLines={1}>
                            {isNew ? 'Nuevo mazo' : 'Editar mazo'}
                        </Text>
                        <Text className="font-sans text-dorado text-xs">{heroName}</Text>
                    </View>
                    <Pressable
                        onPress={handleSave}
                        disabled={!canSave || saving}
                        className="rounded-full px-4 py-2"
                        style={{
                            backgroundColor: canSave ? 'rgba(212,162,76,0.2)' : 'rgba(255,255,255,0.05)',
                            borderWidth: 1,
                            borderColor: canSave ? '#D4A24C' : 'rgba(245,241,230,0.15)',
                            opacity: saving ? 0.5 : 1,
                        }}
                    >
                        <Text
                            className="font-sans-bold text-xs"
                            style={{ color: canSave ? '#D4A24C' : '#6B7280' }}
                        >
                            {saving ? 'Guardando…' : 'Guardar'}
                        </Text>
                    </Pressable>
                </View>

                <TextInput
                    className="border border-crema/20 rounded-lg px-3 py-2 text-crema mt-3"
                    placeholderTextColor="#6B7280"
                    value={name}
                    onChangeText={setName}
                    placeholder="Nombre del mazo"
                />

                <View className="flex-row flex-wrap gap-1 mt-3">
                    {ASPECT_FACTIONS.map((a) => {
                        const active = aspect === a;
                        return (
                            <Pressable
                                key={a}
                                onPress={() => changeAspect(active ? null : a)}
                                className={`rounded-full px-3 py-1 border ${active ? 'bg-dorado/20 border-dorado' : 'border-crema/20'}`}
                            >
                                <Text className="font-sans text-crema text-xs">{ASPECT_LABELS[a]}</Text>
                            </Pressable>
                        );
                    })}
                </View>

                <View
                    className="rounded-xl px-3 py-2 mt-3 flex-row items-center justify-between"
                    style={{
                        backgroundColor: sizeOk ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                    }}
                >
                    <Text
                        className="font-sans-bold text-sm"
                        style={{ color: sizeOk ? '#22c55e' : '#ef4444' }}
                    >
                        {total} / {DECK_MIN_CARDS}-{DECK_MAX_CARDS} cartas
                    </Text>
                    <Text
                        className="font-sans-bold text-xs"
                        style={{ color: canSave ? '#22c55e' : '#ef4444' }}
                    >
                        {canSave ? 'Válido' : `${validation?.errors.length ?? 0} problema(s)`}
                    </Text>
                </View>

                {validation && !validation.ok && (
                    <View className="mt-2 gap-0.5">
                        {validation.errors.slice(0, 4).map((e, i) => (
                            <Text key={i} className="font-sans text-rojo-acento text-xs" numberOfLines={2}>
                                • {e}
                            </Text>
                        ))}
                        {validation.errors.length > 4 && (
                            <Text className="font-sans text-gris-pizarra text-xs">
                                y {validation.errors.length - 4} más…
                            </Text>
                        )}
                    </View>
                )}

                <TextInput
                    className="border border-crema/20 rounded-lg px-3 py-2 text-crema mt-3 mb-2"
                    placeholderTextColor="#6B7280"
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Buscar carta..."
                    autoCapitalize="none"
                />
            </View>

            <SectionList
                sections={sections}
                keyExtractor={(row) => row.code}
                stickySectionHeadersEnabled={false}
                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 48, gap: 6 }}
                renderSectionHeader={({ section }) => (
                    <Text className="font-sans-semibold text-gris-pizarra text-xs uppercase tracking-widest mt-3 mb-1">
                        {section.title}
                    </Text>
                )}
                renderItem={({ item }) => {
                    const qty = cards[item.code] ?? 0;
                    const limit = cardLimit(packByCode.get(item.code));
                    return (
                        <View
                            className="rounded-xl p-2 flex-row items-center gap-3"
                            style={{
                                backgroundColor: qty > 0 ? 'rgba(212,162,76,0.1)' : 'rgba(245,241,230,0.05)',
                            }}
                        >
                            <Image
                                source={{ uri: cardImageUrl(item.code) }}
                                style={{ width: 38, height: 53, borderRadius: 4, backgroundColor: '#1a1f3a' }}
                                resizeMode="contain"
                            />
                            <Text className="font-sans-bold text-crema text-sm flex-1" numberOfLines={2}>
                                {item.title}
                            </Text>
                            <View className="flex-row items-center gap-2">
                                <Pressable
                                    onPress={() => setQuantity(item.code, qty - 1)}
                                    disabled={qty <= 0}
                                    hitSlop={8}
                                    className="w-8 h-8 rounded-full items-center justify-center border border-crema/20"
                                    style={{ opacity: qty <= 0 ? 0.3 : 1 }}
                                >
                                    <Ionicons name="remove" size={16} color="#F5F1E6" />
                                </Pressable>
                                <Text className="font-sans-bold text-crema text-sm w-5 text-center">{qty}</Text>
                                <Pressable
                                    onPress={() => setQuantity(item.code, Math.min(limit, qty + 1))}
                                    disabled={qty >= limit}
                                    hitSlop={8}
                                    className="w-8 h-8 rounded-full items-center justify-center border border-crema/20"
                                    style={{ opacity: qty >= limit ? 0.3 : 1 }}
                                >
                                    <Ionicons name="add" size={16} color="#F5F1E6" />
                                </Pressable>
                            </View>
                        </View>
                    );
                }}
                ListEmptyComponent={
                    <Text className="font-sans text-gris-pizarra text-sm px-5 mt-4">
                        No hay cartas que coincidan con la búsqueda.
                    </Text>
                }
            />
        </View>
    );
}
