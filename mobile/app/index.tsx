import { useEffect, useState, useCallback } from 'react';
import { Text, View, Pressable, Alert, TextInput, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import {
  loadGame,
  saveGame,
  initDatabase,
  loadDecks,
  loadDeck,
} from '../storage/gameStorage';
import { getHeroCatalog, type HeroCatalogEntry } from '../services/heroCatalog';
import {
  createGame,
  serializeGameState,
  deserializeGameState,
  initPlayerLibrary,
  ALL_SCENARIOS,
} from 'engine';
import type { GameState, PlayerSetup, DeckDefinition } from 'engine';

type Difficulty = 'STANDARD' | 'EXPERT';

// Barajado real (Fisher-Yates) para la biblioteca del jugador. El motor NO
// baraja por su cuenta —para que sus tests sean deterministas— así que la app
// le inyecta este barajador aleatorio al iniciar la partida. Firma compatible
// con el tipo Shuffle de engine: (readonly string[]) => string[].
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

// Semilla aleatoria del mazo de encuentros: el motor baraja con ella al crear
// la partida y cada vez que rebaraja el descarte (sin usar Math.random).
function randomSeed(): number {
  return Math.floor(Math.random() * 2 ** 32);
}

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

// Etiquetas de aspecto para el selector de mazo. Las mismas que usa la
// pantalla Colección — misma clave (código de facción de marvelcdb), misma
// traducción.
const ASPECT_LABELS: Record<string, string> = {
  aggression: 'Agresión',
  justice: 'Justicia',
  leadership: 'Liderazgo',
  protection: 'Protección',
};

type CatalogStatus = 'loading' | 'ready' | 'error';

export default function IndexScreen() {
  const router = useRouter();
  const [savedGame, setSavedGame] = useState<GameState | null>(null);
  const [ready, setReady] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>('STANDARD');
  // Escenario (villano) elegido para una nueva partida. Por defecto Rino, para
  // conservar el comportamiento anterior. La lista sale del registro de
  // escenarios del motor (ALL_SCENARIOS), así que añadir villanos nuevos al
  // motor los hace aparecer aquí sin tocar esta pantalla.
  const [scenarioId, setScenarioId] = useState<string>('rhino');
  const [playerCount, setPlayerCount] = useState(1);
  const [slots, setSlots] = useState<PlayerSetup[]>(DEFAULT_SLOTS);

  const [catalog, setCatalog] = useState<HeroCatalogEntry[]>([]);
  const [catalogStatus, setCatalogStatus] = useState<CatalogStatus>('loading');
  const [catalogFetchedAt, setCatalogFetchedAt] = useState<string | null>(null);
  const [queries, setQueries] = useState<string[]>(['', '', '', '']);
  // Mazos guardados por el jugador (ver storage/gameStorage.ts → tabla
  // "decks"). Se refrescan al enfocar la pantalla, para que los mazos
  // creados en Colección aparezcan al volver aquí.
  const [decks, setDecks] = useState<DeckDefinition[]>([]);

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

  async function reloadDecks() {
    try {
      const d = await loadDecks();
      setDecks(d);
    } catch {
      setDecks([]);
    }
  }

  useEffect(() => {
    async function init() {
      await initDatabase();
      await refresh();
      await loadHeroes();
      await reloadDecks();
      setReady(true);
    }
    init();
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (ready) {
        refresh();
        reloadDecks();
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
      prev.map((s, i) => {
        if (i !== index) return s;
        // Si el jugador tenía un mazo elegido para OTRO héroe, lo soltamos
        // (el constructor de mazos exige coincidencia héroe↔mazo). Si el
        // mazo era para este mismo héroe, lo conservamos.
        const sameHero = s.heroCardId === hero.heroCardId;
        return {
          ...s,
          heroName: hero.heroName,
          alterEgoName: hero.alterEgoName,
          heroCardId: hero.heroCardId,
          alterEgoCardId: hero.alterEgoCardId,
          health: hero.health,
          deckId: sameHero ? s.deckId : undefined,
        };
      }),
    );
    updateQuery(index, hero.heroName);
  }

  function selectDeck(index: number, deck: DeckDefinition) {
    const hero = catalog.find((h) => h.heroCardId === deck.heroCode);
    setSlots((prev) =>
      prev.map((s, i) => {
        if (i !== index) return s;
        if (hero) {
          // Elegir mazo también fija el héroe: la lista de mazos ya está
          // filtrada por héroe más abajo, pero esto cubre también el caso
          // "aún no elegí héroe, elijo mazo directamente".
          return {
            ...s,
            deckId: deck.id,
            heroName: hero.heroName,
            alterEgoName: hero.alterEgoName,
            heroCardId: hero.heroCardId,
            alterEgoCardId: hero.alterEgoCardId,
            health: hero.health,
          };
        }
        // Sin catálogo (offline) nos quedamos con el ID de héroe del mazo
        // como mínimo, para que la miniatura y la validación funcionen al
        // volver la conexión.
        return {
          ...s,
          deckId: deck.id,
          heroCardId: deck.heroCode,
        };
      }),
    );
    if (hero) updateQuery(index, hero.heroName);
  }

  function clearDeck(index: number) {
    setSlots((prev) =>
      prev.map((s, i) => (i === index ? { ...s, deckId: undefined } : s)),
    );
  }

  async function startNew() {
    const activeSlots = slots.slice(0, playerCount).map((s) => ({
      ...s,
      heroName: s.heroName.trim(),
      alterEgoName: s.alterEgoName.trim() || s.heroName.trim(),
      heroCardId: s.heroCardId?.trim() || undefined,
      alterEgoCardId: s.alterEgoCardId?.trim() || undefined,
      deckId: s.deckId || undefined,
    }));
    const missing = activeSlots.find((s) => !s.heroName);
    if (missing) {
      Alert.alert(
        'Falta un héroe',
        'Elige (o escribe) el héroe de cada jugador antes de empezar.',
      );
      return;
    }
    // Barajado real del mazo de encuentros: el motor es determinista y la app
    // le inyecta la aleatoriedad con una semilla (si no, saldría siempre la
    // misma carta). La semilla queda en la partida para rebarajar el descarte.
    let state = createGame(scenarioId, activeSlots, difficulty, {
      seed: randomSeed(),
    });
    // Para cada jugador que trae mazo: cargarlo, barajarlo e inicializar su
    // biblioteca (mano inicial + biblioteca). Los jugadores sin mazo quedan
    // sin biblioteca simulada y el motor simplemente no les roba cartas.
    for (const slot of activeSlots) {
      if (!slot.deckId) continue;
      const deck = await loadDeck(slot.deckId);
      if (!deck) continue;
      const result = initPlayerLibrary(state, slot.id, deck.cards, {
        shuffle: shuffleDeck,
      });
      state = result.state;
    }
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

  // Escenario elegido y etiquetas de progresión por dificultad (p.ej. "I → II").
  const selectedScenario = ALL_SCENARIOS.find((s) => s.id === scenarioId);
  const villainName = selectedScenario?.villainName ?? 'Villano';
  const stdProg = selectedScenario?.progression.STANDARD;
  const expProg = selectedScenario?.progression.EXPERT;

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
                  Ronda {savedGame.round} · {savedGame.villain.name}{' '}
                  {savedGame.villain.stage} ·{' '}
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
                Villano
              </Text>
              {/* En rejilla de 2 columnas: con más de 3 villanos ya no caben en
                  una fila. Si el escenario tiene nombre propio (dos escenarios
                  del Duende Verde), se muestra bajo el villano. */}
              <View className="flex-row flex-wrap gap-2">
                {ALL_SCENARIOS.map((sc) => {
                  const active = scenarioId === sc.id;
                  return (
                    <Pressable
                      key={sc.id}
                      onPress={() => setScenarioId(sc.id)}
                      style={{ flexBasis: '48%', flexGrow: 1 }}
                      className={`rounded-xl py-3 px-2 items-center border ${active
                        ? 'bg-dorado/15 border-dorado'
                        : 'border-crema/20'
                        }`}
                    >
                      <Text
                        className={`font-sans-bold text-base ${active ? 'text-dorado' : 'text-crema'
                          }`}
                      >
                        {sc.villainName}
                      </Text>
                      {sc.scenarioName ? (
                        <Text
                          className="font-sans text-gris-pizarra text-[11px] text-center"
                          numberOfLines={1}
                        >
                          {sc.scenarioName}
                        </Text>
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            </View>

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
                // Mazos elegibles para este slot: si ya hay héroe, solo
                // los suyos (coincidencia por heroCode); si no hay héroe
                // elegido, los enseñamos todos (elegir mazo también fija
                // el héroe, ver selectDeck).
                const decksForSlot = slot.heroCardId
                  ? decks.filter((d) => d.heroCode === slot.heroCardId)
                  : decks;
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

                    <View className="gap-1 mt-1">
                      <Text className="font-sans-semibold text-gris-pizarra text-xs uppercase tracking-widest">
                        Mazo (opcional)
                      </Text>
                      {decks.length === 0 ? (
                        <Text className="font-sans text-gris-pizarra text-xs">
                          Todavía no tienes mazos guardados. Créalos en la pestaña
                          Colección.
                        </Text>
                      ) : decksForSlot.length === 0 ? (
                        <Text className="font-sans text-gris-pizarra text-xs">
                          No tienes ningún mazo para este héroe. Crea uno en la pestaña
                          Colección.
                        </Text>
                      ) : (
                        <View className="gap-1">
                          {decksForSlot.map((d) => {
                            const selected = slot.deckId === d.id;
                            return (
                              <Pressable
                                key={d.id}
                                onPress={() =>
                                  selected ? clearDeck(index) : selectDeck(index, d)
                                }
                                className="rounded-lg px-3 py-2"
                                style={{
                                  backgroundColor: selected
                                    ? 'rgba(212,162,76,0.2)'
                                    : 'rgba(255,255,255,0.05)',
                                  borderWidth: 1,
                                  borderColor: selected ? '#D4A24C' : 'transparent',
                                }}
                              >
                                <Text className="font-sans-semibold text-crema text-sm">
                                  {d.name}
                                </Text>
                                <Text className="font-sans text-gris-pizarra text-xs">
                                  {d.aspect
                                    ? ASPECT_LABELS[d.aspect] ?? d.aspect
                                    : 'Sin aspecto'}
                                </Text>
                              </Pressable>
                            );
                          })}
                        </View>
                      )}
                    </View>

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
                    {stdProg
                      ? `${villainName} ${stdProg.start} → ${stdProg.final}`
                      : 'Dificultad estándar'}
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
                    {expProg
                      ? `${villainName} ${expProg.start} → ${expProg.final}`
                      : 'Dificultad experto'}
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
              {playerCount} {playerCount === 1 ? 'jugador' : 'jugadores'} vs. {villainName} ·{' '}
              {difficulty === 'STANDARD' ? 'Dificultad estándar' : 'Dificultad experto'}
            </Text>
          </View>

          <View />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}