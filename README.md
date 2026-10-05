# Phasekeeper

> Compañero de aprendizaje y árbitro para _Marvel Champions: The Card Game_.

## Qué es esto

Phasekeeper es una aplicación móvil pensada para acompañar una partida física de _Marvel Champions: The Card Game_. No es un simulador del juego ni sustituye las cartas de papel: el jugador sigue jugando con su mazo real, y la aplicación se encarga de la parte más propensa a errores — controlar al villano, resolver los encuentros, llevar la cuenta de la amenaza y explicar las reglas en el momento exacto en que hacen falta.

### El modelo "compañero"

Es la decisión de diseño que condiciona todo lo demás: la app **no simula la mano ni los recursos del jugador**. Solo modela:

- El villano y sus accesorios
- Los esbirros
- El mazo y las cartas de encuentro
- Los planes (principal y secundarios)

El jugador juega sus cartas en la mesa, de forma física, y le indica a la app lo que ha hecho (atacar, cambiar de identidad, etc.). Esto reduce enormemente el alcance frente a un simulador completo del juego, y mantiene la experiencia de jugar con cartas reales.

### MVP actual

**Spider-Man contra Rhino**, en dificultad Standard. Un único escenario, elegido deliberadamente para construir un motor fiable antes que un catálogo amplio de contenido.

## Stack tecnológico

| Capa               | Tecnología                                        |
| ------------------ | ------------------------------------------------- |
| App móvil          | React Native + Expo + TypeScript                  |
| Motor de juego     | TypeScript puro, sin dependencias de React Native |
| Tests              | Vitest                                            |
| Persistencia local | SQLite (`expo-sqlite`)                            |
| Gestor de paquetes | pnpm (workspaces / monorepo)                      |
| Futuro backend     | Node.js + Fastify + PostgreSQL (sin empezar)      |

## Estructura del repositorio

```
MarvelChampionsCompanion/
├── docs/                      # Documentación de reglas y contenido
│   ├── rules-spec.md            # Secuencia de ronda verificada + glosario
│   ├── scenario-rhino.md        # Las 20 cartas del escenario (EN/ES)
│   └── test-cases.md            # 36 casos de prueba en dado/cuando/entonces
│
├── engine/                    # Motor de juego (TypeScript puro)
│   ├── src/
│   │   ├── domain/               # GameState y todos los tipos del estado
│   │   ├── events/                # GameEvent, log de eventos
│   │   ├── effects/               # Sistema de Effects genérico
│   │   ├── game/                  # Resolución de fases, cartas y reglas
│   │   ├── data/                  # Catálogo de las 20 cartas del escenario
│   │   ├── explanations/          # Sistema educativo + asistente paso a paso
│   │   └── persistence/           # Serialización del GameState
│   └── tests/                  # 59 tests de Vitest
│
├── mobile/                    # App Expo
│   ├── storage/                 # Wrapper de SQLite para guardar partidas
│   └── App.tsx
│
├── pnpm-workspace.yaml
└── package.json
```

## Principios de diseño

Heredados del planteamiento original del proyecto, y respetados durante toda la construcción:

1. **El motor no depende de React Native.** Todo lo que hay en `engine/` es TypeScript puro, probado con Vitest, sin importar nada de `mobile/`. Podría ejecutarse en cualquier entorno Node.
2. **Offline-first.** Ninguna función del motor depende de internet. La partida se guarda localmente en SQLite.
3. **Primero exactitud, después funcionalidades.** Se prioriza que las reglas del único escenario del MVP se resuelvan bien, por encima de añadir más contenido.
4. **Estado inmutable + eventos.** Cada función de resolución del motor sigue el mismo patrón: recibe un `GameState` y devuelve `{ state, events }`, sin mutar nada. Los eventos alimentan el sistema de explicaciones.
5. **Lo que no está verificado, se marca.** Varios puntos del reglamento están señalados con `TODO` en el código en vez de implementarse a ciegas (ver más abajo).

## Arquitectura del motor

```
GameState
   │
   ├── players[]       (vida, forma héroe/alter ego, cartas boca abajo...)
   ├── villain          (etapa, vida, ataque, accesorios...)
   ├── schemes[]        (plan principal + planes secundarios)
   ├── minions[]
   ├── encounterDeck[]  (24 cartas reales, sin barajar — el orden es cosa de fuera del motor)
   └── eventLog[]       (historial de todo lo ocurrido)

Cada función de resolución sigue el mismo patrón:
  (state, ...) => { state: nuevo GameState, events: GameEvent[] }

El sistema de Effects reduce la mayoría de esas resoluciones a datos:
  { type: 'DEAL_DAMAGE', target: {...}, amount: 2, source: '...' }

Y el log de eventos se traduce a explicaciones en español:
  explainEvent(evento) → { title, description, reason, nextStep }
```

## Qué funciona ya (Fases 0 a 7)

| Fase                      | Contenido                                                                                                                 | Estado           |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| 0 — Documentación         | Secuencia de ronda verificada contra el Rules Reference, 20 cartas documentadas (EN/ES), 36 casos de prueba               | ✅               |
| 1 — Infraestructura       | Monorepo pnpm, `engine` (TS + Vitest) y `mobile` (Expo) enlazados y funcionando en Android                                | ✅               |
| 2 — Motor básico          | `GameState`, fases y pasos, activación del villano, Guardia, esbirros                                                     | ✅ (34/36 casos) |
| 3 — Resolución de reglas  | Sistema de Effects genérico; toda la lógica de cartas migrada; accesorios generalizados por datos, no por nombre de carta | ✅               |
| 4 — Cartas estructuradas  | Catálogo de 20 cartas, registro de resolución por id, mazo de encuentro real con las copias correctas (24 cartas)         | ✅               |
| 5 — Sistema educativo     | Log de eventos persistente, `explainEvent` traduce cada uno de los 16 tipos de evento a una explicación en español        | ✅               |
| 6 — Asistente paso a paso | `describeCurrentStep` indica qué hacer en cada uno de los 6 estados posibles de una ronda                                 | ✅ (lado motor)  |
| 7 — Persistencia offline  | Serialización del estado + guardado real en SQLite en el móvil, recuperado tras cerrar la app                             | ✅               |

**59 tests de Vitest en verde.**

## Puesta en marcha

Requiere Node.js, pnpm, y la app Expo Go instalada en un móvil Android (o un emulador).

```bash
git clone <url-del-repo>
cd MarvelChampionsCompanion
pnpm install

# Ejecutar los tests del motor
cd engine
pnpm test

# Arrancar la app
cd ../mobile
npx expo start
```

Escanea el código QR con Expo Go.

## Pendiente de verificar contra el reglamento físico

Marcado explícitamente en el código con `TODO`, para no implementar nada a ciegas:

- **TC-014** — el momento exacto en que se comprueba la derrota por amenaza completa (¿al añadirla, o al final del paso?).
- **Acumulación de dureza** — si un personaje puede tener más de un estado de dureza a la vez.
- **Vida inicial de Spider-Man** — actualmente a 10 como marcador, pendiente de confirmar contra la carta de identidad real.
- **Esbirro némesis del Buitre** — el mecanismo de "Una sombra del pasado" está implementado y probado, pero sus estadísticas reales (ataque, esquema, vida) son un marcador provisional.

## Próximos pasos

El paso inmediato es **construir pantallas reales** (Inicio → Nueva partida → Partida), porque ahora mismo `App.tsx` solo muestra texto de prueba — todo lo que el motor sabe hacer todavía no tiene interfaz.

Después, retomando la hoja de ruta original del proyecto:

- Sincronización con un backend (Node + Fastify + PostgreSQL)
- Más escenarios y héroes
- Partidas personalizadas (dificultad, modificaciones)
- Deckbuilder y colección
- IA contextual (explica, pero no decide las reglas)
- Sistema de sinergias entre cartas
- Campañas y estadísticas
- Pulido y publicación
