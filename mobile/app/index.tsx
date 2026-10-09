import { useEffect, useState, useCallback } from 'react';
import { Text, View, Pressable, Alert, TextInput, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import {
  loadGame,
  saveGame,
  initDatabase,
} from '../storage/gameStorage';
import { getHeroCatalog, type HeroCatalogEntry } from '../services/heroCatalog';
import {
  createRhinoGame,
  serializeGameState,
  deserializeGameState,
} from 'engine';
import type { GameState, PlayerSetup } from 'engine';

type Difficulty = 'STANDARD' | 'EXPERT';

const DEFAULT_SLOTS: PlayerSetup[] = [
  {
    id: 'player-1',
    heroName: 'Spider-Man',
    alterEgoName: 'Peter Parker',
    health: 10,
    heroCardId: '01001a',
    alterEgoCardId: '01001b',
  },
  { id: 'player-2', heroName: '', alterEgoName: '', health: 10, heroCardId: '', alterEgoCardId: '' },
  { id: 'player-3', heroName: '', alterEgoName: '', health: 10, heroCardId: '', alterEgoCardId: '' },
  { id: 'player-4', heroName: '', alterEgoName: '', health: 10, heroCardId: '', alterEgoCardId: '' },
];

type CatalogStatus = 'loading' | 'ready' | 'error';

export default function IndexScreen() {
  const router = useRouter();
  const [savedGame, setSavedGame] = useState<GameState | null>(null);
  const [ready, setReady] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>('STANDARD');
  const [playerCount, setPlayerCount] = useState(1);
  const [slots, setSlots] = useState<PlayerSetup[]>(DEFAULT_SLOTS);

  const [catalog, setCatalog] = useState<HeroCatalogEntry[]>([]);
  const [catalogStatus, setCatalogStatus] = useState<CatalogStatus>('loading');
  const [catalogFetchedAt, setCatalogFetchedAt] = useState<string | null>(null);
  const [queries, setQueries] = useState<string[]>(['', '', '', '']);

  async function refresh() {
    const saved = await loadGame();
    if (saved) {
      try {
        setSavedGame(deserializeGameState(saved));
      } catch {
        setSavedGame(null);
      }
    } else {
      setSavedGame(null);
    }
  }

  async function loadHeroes(forceRefresh = false) {
    setCatalogStatus('loading');
    try {
      const result = await getHeroCatalog({ forceRefresh });
      setCatalog(result.heroes);
      setCatalogFetchedAt(result.fetchedAt);
      setCatalogStatus('ready');
    } catch {
      setCatalog([]);
      setCatalogStatus('error');
    }
  }

  useEffect(() => {
    async function init() {
      await initDatabase();
      await refresh();
      await loadHeroes();
      setReady(true);
    }
    init();
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (ready) {
        refresh();
      }
    }, [ready]),
  );

  function updateSlotText(
    index: number,
    field: 'heroName' | 'alterEgoName' | 'heroCardId' | 'alterEgoCardId',
    value: string,
  ) {
    setSlots((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)),
    );
  }

  function updateSlotHealth(index: number, value: string) {
    const parsed = parseInt(value, 10);
    setSlots((prev) =>
      prev.map((s, i) =>
        i === index ? { ...s, health: Number.isNaN(parsed) ? 0 : parsed } : s,
      ),
    );
  }

  function updateQuery(index: number, value: string) {
    setQueries((prev) => prev.map((q, i) => (i === index ? value : q)));
  }

  function selectHero(index: number, hero: HeroCatalogEntry) {
    setSlots((prev) =>
      prev.map((s, i) =>
        i === index
          ? {
            ...s,
            heroName: hero.heroName,
            alterEgoName: hero.alterEgoName,
            heroCardId: hero.heroCardId,
            alterEgoCardId: hero.alterEgoCardId,
            health: hero.health,
          }
          : s,
      ),
    );
    updateQuery(index, hero.heroName);
  }

  async function startNew() {
    const activeSlots = slots.slice(0, playerCount).map((s) => ({
      ...s,
      heroName: s.heroName.trim(),
      alterEgoName: s.alterEgoName.trim() || s.heroName.trim(),
      heroCardId: s.heroCardId?.trim() || undefined,
      alterEgoCardId: s.alterEgoCardId?.trim() || undefined,
    }));
    const missing = activeSlots.find((s) => !s.heroName);
    if (missing) {
      Alert.alert(
        'Falta un héroe',
        'Elige (o escribe) el héroe de cada jugador antes de empezar.',
      );
      return;
    }
    const state = createRhinoGame(activeSlots, difficulty);
    await saveGame(serializeGameState(state));
    router.push('/game');
  }

  function handleNewGame() {
    if (savedGame) {
      Alert.alert(
        'Nueva partida',
        'Esto sobrescribirá la partida en curso. ¿Continuar?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Nueva partida',
            style: 'destructive',
            onPress: startNew,
          },
        ],
      );
      return;
    }
    startNew();
  }

  function handleContinue() {
    router.push('/game');
  }

  if (!ready) {
    return (
      <View className="flex-1 bg-azul-noche items-center justify-center">
        <Text className="font-sans text-crema">Cargando...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-azul-noche" edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 px-6 justify-between py-12 gap-8">
          <View className="items-center mt-10">
            <Text className="font-sans-semibold text-dorado text-xs uppercase tracking-widest">
              Compañero de juego
            </Text>
            <Text className="font-display text-crema text-6xl mt-4">
              PHASEKEEPER
            </Text>
            <Text className="font-sans text-gris-pizarra text-sm text-center mt-3 px-4">
              Árbitro y guía para Marvel Champions: The Card Game
            </Text>
          </View>

          <View className="gap-3">
            {savedGame && (
              <View className="bg-crema/5 rounded-2xl p-4 gap-2">
                <Text className="font-sans-semibold text-gris-pizarra text-xs uppercase tracking-widest">
                  Partida en curso
                </Text>
                <Text className="font-sans-bold text-crema text-base">
                  {savedGame.players.map((p) => p.heroName).join(' + ')} vs{' '}
                  {savedGame.villain.name}
                </Text>
                <Text className="font-sans text-gris-pizarra text-xs">
                  Ronda {savedGame.round} · Rino {savedGame.villain.stage} ·{' '}
                  {savedGame.villain.health}/{savedGame.villain.maxHealth} VIDA
                </Text>
                <Text className="font-sans-semibold text-dorado text-[10px] uppercase tracking-widest">
                  {savedGame.difficulty === 'EXPERT' ? 'Experto' : 'Estándar'} ·{' '}
                  {savedGame.players.length}{' '}
                  {savedGame.players.length === 1 ? 'jugador' : 'jugadores'}
                </Text>
                <Pressable
                  onPress={handleContinue}
                  className="bg-dorado rounded-xl py-3 items-center mt-2"
                >
                  <Text className="font-sans-bold text-azul-noche text-base">
                    Continuar partida
                  </Text>
                </Pressable>
              </View>
            )}

            <View className="gap-2">
              <Text className="font-sans-semibold text-gris-pizarra text-xs uppercase tracking-widest">
                Nº de jugadores
              </Text>
              <View className="flex-row gap-2">
                {[1, 2, 3, 4].map((n) => (
                  <Pressable
                    key={n}
                    onPress={() => setPlayerCount(n)}
                    className={`flex-1 rounded-xl py-3 items-center border ${playerCount === n
                      ? 'bg-dorado/15 border-dorado'
                      : 'border-crema/20'
                      }`}
                  >
                    <Text
                      className={`font-sans-bold text-base ${playerCount === n ? 'text-dorado' : 'text-crema'
                        }`}
                    >
                      {n}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <Pressable onPress={() => loadHeroes(true)} className="py-1">
              <Text className="font-sans text-gris-pizarra text-[10px] text-center">
                {catalogStatus === 'loading' &&
                  'Cargando lista de héroes de marvelcdb…'}
                {catalogStatus === 'ready' &&
                  `Lista de héroes de marvelcdb (${catalog.length}) · toca para actualizar${catalogFetchedAt
                    ? ' · ' + new Date(catalogFetchedAt).toLocaleDateString()
                    : ''
                  }`}
                {catalogStatus === 'error' &&
                  'No se pudo cargar la lista de héroes (sin red). Toca para reintentar — mientras tanto, escribe los datos a mano.'}
              </Text>
            </Pressable>

            <View className="gap-3">
              {slots.slice(0, playerCount).map((slot, index) => {
                const query = queries[index] ?? '';
                const matches =
                  catalog.length > 0 && query.trim().length > 0
                    ? catalog
                      .filter((h) =>
                        h.heroName.toLowerCase().includes(query.trim().toLowerCase()),
                      )
                      .slice(0, 5)
                    : [];
                return (
                  <View key={slot.id} className="bg-crema/5 rounded-2xl p-3 gap-2">
                    <Text className="font-sans-semibold text-gris-pizarra text-xs uppercase tracking-widest">
                      Jugador {index + 1}
                    </Text>

                    {catalog.length > 0 ? (
                      <>
                        <TextInput
                          className="border border-crema/20 rounded-lg px-3 py-2 text-crema"
                          placeholderTextColor="#6B7280"
                          value={query}
                          onChangeText={(t) => updateQuery(index, t)}
                          placeholder="Buscar héroe (ej. Spider-Man)"
                          autoCapitalize="none"
                        />
                        {matches.length > 0 && (
                          <View className="gap-1">
                            {matches.map((h) => (
                              <Pressable
                                key={h.heroCardId}
                                onPress={() => selectHero(index, h)}
                                className="border border-crema/20 rounded-lg px-3 py-2"
                              >
                                <Text className="font-sans-semibold text-crema text-sm">
                                  {h.heroName}
                                </Text>
                                <Text className="font-sans text-gris-pizarra text-xs">
                                  {h.alterEgoName} · {h.health} vida
                                </Text>
                              </Pressable>
                            ))}
                          </View>
                        )}
                        <Text className="font-sans text-gris-pizarra text-xs">
                          {slot.heroName
                            ? `Elegido: ${slot.heroName} (${slot.alterEgoName})`
                            : 'Sin elegir todavía'}
                        </Text>
                      </>
                    ) : (
                      <>
                        <TextInput
                          className="border border-crema/20 rounded-lg px-3 py-2 text-crema"
                          placeholderTextColor="#6B7280"
                          value={slot.heroName}
                          onChangeText={(t) => updateSlotText(index, 'heroName', t)}
                          placeholder="Héroe (p.ej. Spider-Man)"
                        />
                        <TextInput
                          className="border border-crema/20 rounded-lg px-3 py-2 text-crema"
                          placeholderTextColor="#6B7280"
                          value={slot.alterEgoName}
                          onChangeText={(t) => updateSlotText(index, 'alterEgoName', t)}
                          placeholder="Alter ego (opcional)"
                        />
                      </>
                    )}

                    <TextInput
                      className="border border-crema/20 rounded-lg px-3 py-2 text-crema"
                      placeholderTextColor="#6B7280"
                      keyboardType="number-pad"
                      value={String(slot.health)}
                      onChangeText={(t) => updateSlotHealth(index, t)}
                      placeholder="Vida inicial"
                    />
                    <View className="flex-row gap-2">
                      <TextInput
                        className="border border-crema/20 rounded-lg px-3 py-2 text-crema flex-1"
                        placeholderTextColor="#6B7280"
                        value={slot.heroCardId ?? ''}
                        onChangeText={(t) => updateSlotText(index, 'heroCardId', t)}
                        placeholder="ID carta héroe"
                        autoCapitalize="none"
                      />
                      <TextInput
                        className="border border-crema/20 rounded-lg px-3 py-2 text-crema flex-1"
                        placeholderTextColor="#6B7280"
                        value={slot.alterEgoCardId ?? ''}
                        onChangeText={(t) => updateSlotText(index, 'alterEgoCardId', t)}
                        placeholder="ID carta alter ego"
                        autoCapitalize="none"
                      />
                    </View>
                  </View>
                );
              })}
            </View>

            <View className="gap-2">
              <Text className="font-sans-semibold text-gris-pizarra text-xs uppercase tracking-widest">
                Dificultad para una nueva partida
              </Text>
              <View className="flex-row gap-2">
                <Pressable
                  onPress={() => setDifficulty('STANDARD')}
                  className={`flex-1 rounded-xl py-3 items-center border ${difficulty === 'STANDARD'
                    ? 'bg-dorado/15 border-dorado'
                    : 'border-crema/20'
                    }`}
                >
                  <Text
                    className={`font-sans-semibold text-sm ${difficulty === 'STANDARD' ? 'text-dorado' : 'text-crema'
                      }`}
                  >
                    Estándar
                  </Text>
                  <Text className="font-sans text-gris-pizarra text-[10px] mt-0.5">
                    Rino I → II
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setDifficulty('EXPERT')}
                  className={`flex-1 rounded-xl py-3 items-center border ${difficulty === 'EXPERT'
                    ? 'bg-dorado/15 border-dorado'
                    : 'border-crema/20'
                    }`}
                >
                  <Text
                    className={`font-sans-semibold text-sm ${difficulty === 'EXPERT' ? 'text-dorado' : 'text-crema'
                      }`}
                  >
                    Experto
                  </Text>
                  <Text className="font-sans text-gris-pizarra text-[10px] mt-0.5">
                    Rino II → III
                  </Text>
                </Pressable>
              </View>
            </View>

            <Pressable
              onPress={handleNewGame}
              className={`rounded-xl py-4 items-center ${savedGame ? 'border border-crema/30' : 'bg-dorado'
                }`}
            >
              <Text
                className={`font-sans-bold text-base ${savedGame ? 'text-crema' : 'text-azul-noche'
                  }`}
              >
                Nueva partida
              </Text>
            </Pressable>

            <Text className="font-sans text-gris-pizarra text-xs text-center mt-2">
              {playerCount} {playerCount === 1 ? 'jugador' : 'jugadores'} vs. Rino ·{' '}
              {difficulty === 'STANDARD' ? 'Dificultad estándar' : 'Dificultad experto'}
            </Text>
          </View>

          <View />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}