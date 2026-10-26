# Phasekeeper — Base de conocimiento

> **Qué es este documento.** La base de conocimiento interna del proyecto, pensada
> para que Claude (o cualquier colaborador) se oriente en una sesión futura sin
> tener que reconstruir el contexto desde cero. Funde y **sustituye** a los
> antiguos `docs/`: *Claude code brief*, *Content roadmap*,
> *marvel-champions-rules-reference*, *rules-specs*, *Scenario-Rhino* y *test
> cases*. El `README.md` sigue aparte como cara pública del repositorio.
>
> **La verdad está en el código.** Este documento es contexto, no la fuente de
> verdad: ante una duda, el `engine/` y los tests mandan. Si un dato de aquí
> (un archivo, una función, una cifra) ya no existe en el código, corrige el
> documento. Verifica siempre las reglas y cartas contra marvelcdb y el RRG,
> no contra este texto.
>
> **Última actualización:** 2026-10-26.

---

## Índice

1. [Qué es Phasekeeper](#1-qué-es-phasekeeper)
2. [Reglas de trabajo (cómo añadir contenido)](#2-reglas-de-trabajo-cómo-añadir-contenido)
3. [Arquitectura del motor](#3-arquitectura-del-motor)
4. [Estado del proyecto y hoja de ruta](#4-estado-del-proyecto-y-hoja-de-ruta)
5. [Reglas del juego verificadas](#5-reglas-del-juego-verificadas)
6. [Datos de referencia — Core Set / Rino](#6-datos-de-referencia--core-set--rino)
7. [Casos de prueba de referencia](#7-casos-de-prueba-de-referencia)
8. [Divergencias, asunciones y límites conocidos](#8-divergencias-asunciones-y-límites-conocidos)
9. [Fuentes](#9-fuentes)

---

## 1. Qué es Phasekeeper

App móvil que **acompaña** una partida física de *Marvel Champions: The Card
Game*. No es un simulador ni sustituye a las cartas: el jugador juega con su
mazo real y la app arbitra la parte más propensa a errores.

### El modelo "compañero" (decisión que condiciona todo lo demás)

La app **modela el lado del villano**, no el del jugador:

- **Modela:** el villano (estadios, caras, accesorios), los esbirros, los planes
  (principal y secundarios), el mazo de encuentros con su descarte y el Entorno.
- **No modela:** la mano, los recursos ni los poderes del jugador. El jugador
  juega sus cartas en la mesa y le dice a la app lo que ha hecho (atacar,
  frustrar, cambiar de forma, poner un esbirro en juego…).
- **Guiado:** lo que el motor no puede resolver con fidelidad (aliados, mejoras,
  la mano) se deja guiado: la app muestra el texto de la carta y ofrece acciones
  manuales ("+1 amenaza", "hacer activo", "poner esbirro en juego").

Esto reduce drásticamente el alcance frente a un simulador completo y conserva
la experiencia de jugar con cartas reales.

### Héroes

Están todos los publicados: la app descarga el catálogo completo de marvelcdb
(español, caché de 30 días), así que cualquier héroe se puede elegir sin trabajo
por héroe. El motor **no** simula poderes ni cartas de héroe. Un héroe sin mazo
guardado juega con su **mazo del pack** (ver §4), y hay un **editor de mazos**
para crear/editar los propios.

---

## 2. Reglas de trabajo (cómo añadir contenido)

Esta sección es el manual de operación: cómo convertir cada villano del juego en
un escenario jugable, villano a villano, con mínima dirección humana. Rino, Klaw
y Ultron (Core) sirven de plantilla.

### Reglas inquebrantables

1. **Nunca inventes reglas ni datos.** Verifica TODO (códigos, PG, ATQ, Plan,
   umbrales, boost, cantidades, keywords) contra marvelcdb antes de escribirlo:
   - Carta individual: `https://es.marvelcdb.com/api/public/card/<code>.json`
     (nombre ES) y `https://marvelcdb.com/api/public/card/<code>.json` (nombre
     EN y datos estructurados).
   - Si **no** hay acceso de red a marvelcdb, **PARA** y díselo al humano. No
     escribas datos de memoria.
2. **Archivos completos.** Entrega archivos enteros, nunca fragmentos.
3. **TypeScript estricto, nunca lo relajes.** `engine/` usa `strict`,
   `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`,
   `verbatimModuleSyntax`, `isolatedModules`. Arregla los tipos bien; nada de
   `any`, `@ts-ignore` ni bajar flags.
4. **Tras CADA villano, deja verde:** `pnpm test` y `pnpm typecheck` en
   `engine/`, y `npx tsc --noEmit` en `mobile/`. Si un test de conteo del
   catálogo falla, actualiza su número (es legítimo).
5. **Modo "árbitro" por defecto:** modela lo que el motor ya soporta; lo que no,
   déjalo guiado por el texto de la carta y documéntalo en el archivo del
   escenario. No construyas sistemas de motor nuevos sin pasar por un punto de
   parada.

### Flujo por villano

1. **Verificar el set** en marvelcdb: localiza el rango de códigos y recoge de
   cada carta: code, nameEs, nameEn, type, traits, attack, scheme, health,
   base_threat, escalation_threat, threat (umbral), boost (número; si es icono
   estrella usa 0 y marca el efecto como guiado), quantity, text y keywords
   impresas (Oleada, Guardia, Dureza, Represalia…).
2. **Cartas:** añade todas a `engine/src/data/cards.ts` (`CARD_CATALOG`, forma
   `CardDefinition`). Marca `surge: true` SOLO si la Oleada es impresa (no la
   condicional). Si aparece un tipo nuevo, añádelo a `CardType` y el set a
   `EncounterSet`.
3. **Escenario:** crea `engine/src/scenarios/<villano>.ts` con una
   `ScenarioDefinition` (usa `klaw.ts` / `ultron.ts` como plantilla) y regístralo
   en `engine/src/scenarios/index.ts`.
4. **Tests:** crea `engine/tests/<villano>.test.ts` (Vitest, en español, estilo
   de los existentes): creación del escenario (PG/umbral escalan ×jugadores),
   avance de estadios, avance del plan multi-etapa y derrota en la etapa final,
   y cualquier mecánica específica. Deja toda la suite verde.
5. **Móvil:** normalmente NADA — el villano aparece solo en el selector vía
   `ALL_SCENARIOS`. Solo toca `mobile/` si la mecánica necesita UI nueva.

### PARA y pregunta al humano cuando

- El villano necesite un **sistema de motor que no existe**. Antes de decidir,
  revisa qué sistemas ya existen (§3): varios villanos con contador activo,
  villano de dos caras + Entorno con contadores, planes propios… Describe qué
  falta y espera decisión de alcance (árbitro vs. construir el sistema).
- El pack sea en realidad un **set modular**, no un escenario de villano
  (sospechosos: Ronan, The Hood). Confírmalo y pregunta cómo tratarlo.
- Los **datos no se puedan verificar** (sin red a marvelcdb).
- Haya una **decisión de diseño** con varias opciones razonables.

### Convenciones de datos acordadas

- **Por jugador:** PG de villano y umbral del plan principal (el motor multiplica
  ×nº de jugadores). La amenaza inicial NO escala, salvo que la carta lleve el
  símbolo `per_hero` (`base_threat_fixed=false` → `startingThreatPerPlayer`).
- **Progresión de estadios:** Estándar I→II, Experto II→III. CONFIRMADA por la
  carta 1A en los dos escenarios de Green Goblin; sigue siendo asunción en el
  Core (ver §8).
- `boost` estrella → 0 numérico + efecto guiado. Oleada condicional → sin
  `surge`, guiada.
- Plan principal multi-etapa: `mainScheme` + `additionalMainSchemeStages` (el
  sistema avanza solo y pierde en la etapa final).

### Definición de "hecho" por villano

Cartas verificadas en `cards.ts`, escenario creado y registrado, tests nuevos en
verde, suite completa verde, typecheck de engine y mobile limpios, divergencias
del modo árbitro documentadas en el `.ts` del escenario, y §4 de este documento
actualizado marcando el villano como hecho.

### Commit (una entrega por villano)

Mensaje claro `feat(engine): añadir villano <Nombre>` describiendo cartas,
escenario, sistemas y tests. Termina con la línea de atribución que indique el
entorno de Claude Code en esa sesión (no la fijes de memoria: cambia).

---

## 3. Arquitectura del motor

### Monorepo

```
MarvelChampionsCompanion/
├── docs/                      # Esta base de conocimiento + portada (assets/)
├── engine/                    # Motor de juego (TypeScript puro, sin React Native)
│   ├── src/
│   │   ├── domain/            # GameState y tipos del estado
│   │   ├── data/cards.ts      # Catálogo de cartas de encuentro verificadas (~147)
│   │   ├── scenarios/         # Un archivo por escenario (datos, no código)
│   │   ├── game/              # Fases, activación, encuentros, estadios, multivillano…
│   │   ├── effects/           # Sistema genérico de Effects
│   │   ├── events/            # GameEvent y log de eventos
│   │   ├── explanations/      # Explicaciones en español + asistente paso a paso
│   │   ├── deck/              # Reglas de mazo, "mazo del pack" y elegibilidad
│   │   └── persistence/       # Serialización y migración de partidas guardadas
│   └── tests/                 # Suite de Vitest (~317)
├── mobile/                    # App Expo (React Native, NativeWind, Expo Router)
│   ├── app/                   # Pantallas: Inicio, pestañas, visor/editor de mazo
│   ├── services/              # Catálogo de marvelcdb, héroes, índice, mazo del pack
│   └── storage/               # SQLite: partida, mazos, colección, caché del catálogo
├── pnpm-workspace.yaml
└── package.json
```

### Stack

App: React Native 0.88 + Expo 58 + Expo Router + TypeScript, estilos con
NativeWind (Tailwind), tipografías Bebas Neue e Inter. Motor: TypeScript puro y
estricto. Tests: Vitest. Persistencia: SQLite (`expo-sqlite`). Datos de cartas:
API pública de marvelcdb. Gestor: pnpm (workspaces).

### Patrón del estado

```
GameState
   ├── scenarioId          clave del escenario (el nombre del villano puede cambiar)
   ├── players[]           vida, forma, cartas boca abajo, biblioteca simulada
   ├── villain             estadio, cara, PG, ATQ/PLA, accesorios
   ├── reserveVillains[]   solo multivillano: los que no tienen el contador activo
   ├── environment         Entorno con contadores, si el escenario lo usa
   ├── schemes[]           plan principal (por etapas) + secundarios + propios de villano
   ├── minions[]
   ├── encounterDeck / encounterDiscard / encounterShuffleSeed
   └── eventLog[]

Cada resolución es una función pura:  (state, ...) => { state, events }
Los efectos son datos:  { type: 'DEAL_DAMAGE', target: {...}, amount: 2, source }
Cada evento se traduce a una explicación:  explainEvent(e) => { title, description, reason, nextStep }
```

### Escenarios como datos

Un escenario es una `ScenarioDefinition` (en `engine/src/scenarios/`): estadios
con PG por jugador, plan principal con sus etapas, mazo de encuentros, progresión
Estándar/Experto y **habilidades declaradas** por datos (p.ej. "+2 ATQ si no es
defendido", "coloca la amenaza en su plan propio", "al revelarse reparte N cartas
de encuentro"). El runtime recupera la definición por `state.scenarioId` vía
`getScenarioForState`. Para añadir un villano basta con sus datos y, si trae una
mecánica nueva, el sistema que la resuelve.

### Sistemas que ya existen

- **Planes:** plan principal de varias etapas; amenaza inicial y umbrales por
  jugador; aceleración fija, variable (por rasgo, p.ej. Mutágeno) o por tokens;
  iconos de Aceleración, Crisis y Peligro leídos de datos; efecto "cuando se
  complete" una etapa (OPA hostil); Respuesta obligada del plan tras el paso 1.
- **Keywords:** Oleada, Guardia, Dureza y Represalia.
- **Ultron:** Drones (carta boca abajo de la biblioteca del jugador) e inmunidad
  mientras haya un dron en juego; escalado de drones por estadio.
- **Norman Osborn / Duende Verde:** villano de dos caras + Entorno con contadores
  (Infamia / Locura) que lo voltea automáticamente; "cuando se muestre" de
  estadio por datos; esbirros de preparación y acción "poner esbirro en juego".
- **The Wrecking Crew (multivillano):** varios villanos a la vez con **contador
  activo** (el activo es `villain`; los demás, `reserveVillains`, cada uno con su
  mazo y descarte; mover el contador = intercambiarlos); un mazo de encuentros
  por villano; **plan secundario propio** de cada villano (recibe su amenaza,
  dispara su efecto al llegar a 10 y baja a 3, no sale de juego a 0, se retira al
  derrotar a su villano); ataque a cualquier villano; victoria solo al derrotar
  al último; acciones manuales "hacer activo" y "+1 amenaza".
- **Núcleo común "el villano X ataca / maquina"** (`villainAttacks` /
  `villainSchemes`): cualquier villano actúa con todas las habilidades de su
  cara. Los accesorios suman ATQ en cualquier ataque del villano (Embestida +3,
  Cuerno de marfil +1; Embestida se descarta al final del ataque).
- **Sets modulares** (`engine/src/data/modularSets.ts`): grupos de cartas con
  nombre que se mezclan en el mazo de encuentros de cualquier escenario.
  `createGame` acepta `modularSetIds` y la selección vive en
  `GameState.modularSetIds`; la app los ofrece en Inicio. Un esbirro genérico
  toma por datos su Guardia (`guard`), su Dureza de entrada (`toughOnEnter`) y
  su Represalia (`retaliate`).

### Determinista y reproducible

El motor **nunca** usa `Math.random`. El mazo de encuentros se baraja con un
generador sembrado cuya semilla (`encounterShuffleSeed`) vive en el estado y se
guarda con la partida; la app elige una semilla aleatoria al crear la partida. La
biblioteca del jugador se baraja con un barajador que inyecta la app. La misma
semilla da la misma partida, y los tests son deterministas (sin semilla, el
orden del escenario se conserva).

### Cartas de encuentro en juego vs. descarte

Una carta que se queda en juego (esbirro, plan secundario, acoplada modelada) NO
va también al descarte: va al descarte cuando **sale** de juego (esbirro
derrotado, plan sin amenaza, acoplada descartada o limpiada por un estadio). En
multivillano, al descarte del villano al que pertenece. Las acopladas que el
motor no modela se juegan a mano y su carta va al descarte al revelarse.

---

## 4. Estado del proyecto y hoja de ruta

Roadmap maestro para cubrir TODO el contenido de *Marvel Champions*: villanos
(escenarios que se implementan en el motor) y héroes (ya cubiertos a nivel de
app). La lista de packs sale de la API de marvelcdb; el contenido exacto de cada
pack/caja se verifica al construirlo, nunca de memoria.

### Hecho

- **Core Set:** Rino, Klaw, Ultron.
- **The Green Goblin:** Negocios arriesgados (Norman Osborn / Duende Verde) y La
  fórmula mutagénica (Duende Verde). Sin sets modulares (igual que el Core).
- **The Wrecking Crew:** Fuga de prisión (Destructor, Bola de Trueno, Martinete y
  Bulldozer a la vez). Reglas del inserto oficial del pack.
- **Ronan:** es un **set modular puro** (Fanático Kree, 5 cartas, `kree_fanatic`),
  no un escenario. Implementado vía el sistema modular (abajo): se puede añadir
  al mazo de encuentros de cualquier villano desde Inicio.
- **The Hood:** El Encapuchado (3 estadios; plan principal de 3 etapas por
  umbral 5/8/10 ×jugadores), su set propio + Standard II, y **9 sets modulares**
  del pack (Los chicos salvajes, Hermanos Grimm, La banda de Fuego Cruzado,
  Mr. Hyde, Armería saqueada, Sindicato Siniestro, Estado de emergencia, Calles
  del caos y la Brigada de Demolición). 70 cartas nuevas (24001-24070 sin las
  caras traseras). Su habilidad "Juego sucio" y el reparto de cartas van
  guiados; el diseño "aparta 7 sets y baraja de uno en uno" se aproxima
  metiendo al empezar los que elijas (ver el `.ts` del escenario).
- **Sistema de sets modulares** (`engine/src/data/modularSets.ts`): un set
  modular es una lista de cartas con nombre que se mezcla en el mazo de
  encuentros. `createGame` acepta `modularSetIds`; la selección se guarda en
  `GameState.modularSetIds`. La app ofrece un selector en Inicio. Reutilizable
  por The Hood y todas las cajas de campaña.
- **Sistemas de motor:** los de §3.
- **Mazo del pack:** un héroe sin mazo guardado juega con su "mazo del pack"
  (`engine/src/deck/packDeck.ts`): sus cartas propias exactas + las de un aspecto
  y las básicas que trae su pack (aspecto elegible; por defecto, el que más
  copias trae). NO es el preconstruido impreso (marvelcdb no publica esas listas
  y algunas usan cartas del Core). Con los datos de marvelcdb, 59 de 73 héroes
  quedan en 40-50 cartas; fuera de rango: los 5 del Core (57), las cajas con dos
  héroes (Sinister Motives, NeXt Evolution, Mutant Genesis, Agents of S.H.I.E.L.D.,
  Civil War: 51-60), Gamora (37), Hombre Maravilla (33) y Masacre (16, sin el
  aspecto "Pool"). No se recorta: elegir qué quitar sería inventarse el mazo.
- **Editor de mazos:** `mobile/app/mazo/editar/[id].tsx`: crear (elige héroe →
  precarga sus cartas de firma), ver y editar. Aspecto elegible, buscador,
  controles de ± copias por carta (hasta su `deck_limit`) y validación en vivo.
  Las cartas que ofrece salen de `isDeckEligibleCard`: cartas del héroe, del
  aspecto elegido (genéricas o "de color" del propio héroe) y básicas genéricas.

### Fase A — Packs de escenario independientes (orden de salida)

1. ~~The Green Goblin (`gob`, 2019-12) — 2 escenarios.~~ **Hecho.**
2. ~~The Wrecking Crew (`twc`, 2020-02) — cuatro villanos a la vez.~~ **Hecho.**
3. ~~**Ronan Modular Set** (`ron`, 2020-08) — set modular puro (Fanático Kree).~~
   **Hecho** vía el sistema de sets modulares.
4. ~~**The Hood** (`hood`, 2021-11) — villano completo (3 estadios + plan
   principal) con 9 sets modulares.~~ **Hecho.**
5. **MojoMania** (`mojo`, 2022-11). *Verificar.*
6. **Trickster Takeover** (`tt`, 2025-08). *Verificar.*
7. **Synthezoid Smackdown** (`synthezoid`, 2025-12). *Verificar.*

### Fase B — Cajas de campaña (orden de salida)

Cada caja trae varios villanos/escenarios; se listan y verifican al llegar.

The Rise of Red Skull (`trors`, 2020-09) · The Once and Future Kang (`toafk`,
2020-10) · The Galaxy's Most Wanted (`gmw`, 2021-04) · The Mad Titan's Shadow
(`mts`, 2021-09) · Sinister Motives (`sm`, 2022-04) · Mutant Genesis (`mut_gen`,
2022-09) · NeXt Evolution (`next_evol`, 2023-08) · Age of Apocalypse (`aoa`,
2024-03) · Agents of S.H.I.E.L.D. (`aos`, 2025-02) · Civil War (`cw`, 2025-10) ·
Fear No Evil (`fne`, 2026-07).

### Héroes (Track 2)

Completo a nivel de app vía el catálogo en vivo de marvelcdb. No hay cola por
héroe. Fidelidad OPCIONAL (fuera de alcance salvo que se decida): sets de némesis
(hay `reservedNemesis` como hueco, sin usar; "Una sombra del pasado" los
invoca) y obligaciones/identidades de héroe.

### Sistemas que probablemente habrá que construir

- Sets modulares: YA existe (ver §3 y Hecho); falta añadir más sets (los de The
  Hood y las cajas de campaña) y, si se quiere, que un escenario declare sets
  modulares recomendados o una elección obligatoria (p.ej. The Hood).
- Varios villanos con contador activo: YA existe; los Seis Siniestros (Sinister
  Motives) deberían reutilizarlo.
- Sets de némesis y obligaciones (también lado héroe).
- Reparto base de cartas de encuentro en el paso 3: hoy el motor solo reparte al
  ser atacado; un jugador en alter ego no recibe su carta base.
- Recursos / agotar / ventanas de interacción (sistema grande del que dependen
  muchas keywords).

---

## 5. Reglas del juego verificadas

> Resumen operativo contrastado con el Rules Reference (RRG v1.7) y la Learn to
> Play oficiales. No es copia literal del reglamento.

### Estructura de la ronda

Cada ronda tiene **dos fases**: Fase de Jugador → Fase del Villano. No existe una
fase "Recovery" aparte: recuperarse es una acción del jugador en alter ego dentro
de su turno.

**Fase de Jugador.** Cada jugador, en orden, resuelve su turno (jugar cartas,
usar poderes, atacar, frustrar, defender, cambiar de forma una vez por ronda en
su propio turno). Tres pasos cierran la fase: descarte opcional + descarte hasta
el tamaño de mano; todos roban hasta el tamaño de mano; todos preparan sus
cartas. No hay paso de "generar recursos": los recursos se producen descartando
cartas de la mano al pagar un coste.

**Fase del Villano (5 pasos, en orden estricto):**

1. **Añadir amenaza** al plan principal: aceleración + 1 por cada icono de
   Aceleración en planes secundarios activos.
2. **Activación:** el villano se activa una vez por jugador, en orden —ataca si
   el jugador está en héroe, maquina si está en alter ego— y tras cada activación
   los esbirros enganchados con ese jugador también activan. El villano **siempre
   roba una carta de aumento**; los esbirros **no**, salvo keyword Villainous. Los
   esbirros activan después del villano; un esbirro enganchado después del paso 2
   no activa esa ronda.
3. **Repartir cartas de encuentro:** una boca abajo a cada jugador, más 1 extra
   por cada icono de Peligro (Hazard) en juego.
4. **Revelar cartas de encuentro:** una a una, en orden.
5. **Pasar el testigo de primer jugador** (sentido horario) y terminar la ronda.

### Escalado por jugador

El símbolo `per-player` junto a un valor lo multiplica por el número de jugadores
que empezaron la partida. No hay tabla universal: el motor lee carta por carta
qué valores lo llevan. Para Rino, marvelcdb confirma que PG del villano, umbral y
aceleración del plan son per-player, y la amenaza inicial es fija.

| Elemento | 1J | 2J | 3J | 4J |
|---|---|---|---|---|
| Umbral del plan principal (Rino) | 7 | 14 | 21 | 28 |
| Aceleración por ronda (Rino) | 1 | 2 | 3 | 4 |
| Amenaza inicial del plan (Rino) | 0 | 0 | 0 | 0 |
| Cartas de encuentro / fase villano (base) | 1 | 2 | 3 | 4 |
| Activaciones del villano / ronda | 1 | 2 | 3 | 4 |

### Keywords, estados y aumento son capas distintas

- **Guardia (Guard):** mientras un esbirro Guardia esté enganchado contigo, NO
  puedes atacar al villano. **Patrulla (Patrol)** es su análogo para frustrar el
  plan principal.
- **Dureza (Toughness):** coloca un *status card* Tough al entrar en juego. Tough
  previene **todo** el daño de la instancia entrante y se descarta — NO reduce
  "en N". Si DEF reduce el daño a 0, Tough **no** se consume (orden: defender →
  aplicar DEF → si queda daño ≥1, descartar Tough y daño = 0).
- **Perforante (Piercing):** descarta los Tough del objetivo antes del daño.
  **A distancia (Ranged):** ignora Represalia. **Brutalidad (Overkill):** el daño
  en exceso pasa a la identidad del defensor (o al villano si el defensor es un
  esbirro).
- **Oleada (Surge):** tras resolver por completo el "Cuando se muestre" de la
  carta actual, se revela otra; si la nueva también lleva Oleada, se encadena.
- **Represalia (Retaliate) X:** devuelve X al atacante si el defensor sobrevive;
  dispara aunque Tough absorba todo el daño (el personaje "ha sido atacado").
- **Ataque rápido (Quickstrike), Firme (Steady), Impertérrito (Stalwart),
  Villainous** (extiende el aumento a esbirros con la keyword).
- **"Elite" NO es keyword mecánico:** es un *trait* descriptivo (como Soldier o
  SHIELD) y no interactúa de forma especial con los estados. No modelar efecto.

**Estados (status cards):** Tough, Aturdido (Stunned), Confundido (Confused). Cada
personaje tiene como máximo uno de cada, salvo Steady. **Aturdido** cancela solo
el siguiente ataque único (descartas la carta en vez del ataque, pero se paga
coste y se agota). **Confundido** cancela un frustrar/maquinar. Son condiciones
separadas: un héroe Aturdido puede frustrar, uno Confundido puede atacar. Se unen
al personaje (no a la forma): persisten al cambiar de identidad.

**Iconos de aumento (boost):** capa propia del mazo de encuentros. La carta de
aumento se roba boca abajo al activar el villano (o un esbirro Villainous); al
voltearla, cada icono numérico añade +1 al ATQ (si ataca) o +1 al PLA (si
maquina) de esa activación. El icono **estrella (★)** no suma por sí mismo: marca
una habilidad de aumento en el texto. Los defensores se declaran **antes** de
voltear el aumento.

### Timing y comprobación continua

- **Victoria/derrota se comprueban de forma continua:** tras cada cambio de
  amenaza o de PG. Un plan avanza en cuanto su amenaza alcanza su umbral; si la
  etapa FINAL del plan se completa, los jugadores pierden de inmediato. Para Rino
  (un único estadio, umbral 7×J) un aumento triple de "Mover ficha" puede
  provocar derrota instantánea.
- **Prioridad de timing:** habilidades constantes → Interrupción Forzada →
  Interrupción → Respuesta Forzada → Respuesta. Las habilidades "Cuando es
  derrotado" son Respuestas Forzadas obligatorias que se resuelven **antes** de
  descartar la carta y **antes** del avance de estadio del villano.
- **Mazo de encuentros agotado:** se baraja el descarte para formar un mazo nuevo
  y se añade **un token de aceleración permanente** al plan principal (el motor ya
  lo hace). Si mazo y descarte están vacíos a la vez, bucle infinito → derrota.
- **Mazo del jugador agotado:** se rebaraja **sin** penalización de aceleración,
  pero ese jugador se reparte una carta de encuentro boca abajo.

---

## 6. Datos de referencia — Core Set / Rino

> Material histórico del MVP (Spider-Man vs. Rino). Verificado contra marvelcdb
> (set "Rhino", Core #94-108) y ya implementado en el motor. Útil como ejemplo de
> cómo se estructura un escenario.

### Villano — Rino (tres estadios; Estándar usa I y II, Experto II y III)

| Estadio | ATQ | PLA | PG | Rasgos | Al revelarse |
|---|---|---|---|---|---|
| Rino (I), 01094 | 2 | 1 | 14 | Bruto, Criminal | — |
| Rino (II), 01095 | 3 | 1 | 15 | Bruto, Criminal | Busca "Arramblar con todo" en mazo/descarte, lo revela y baraja el mazo |
| Rino (III), 01096 | 4 | 1 | 16 | Bruto, Criminal | Entra con Dureza; aturde a cada héroe |

Experto empieza en II, así que su "Cuando se muestre" dispara en el setup: la
partida arranca con "Arramblar con todo" en juego (3 de amenaza, hazard activo).

### Plan principal — "¡Allanamiento!" (01097)

Único estadio. Amenaza inicial 0 (fija), umbral 7 (per-player), aceleración 1
(per-player). Si se completa, los jugadores pierden (no hay etapa siguiente).

### Resto del set (15 únicas, 21 totales)

| Código | Nombre ES | Tipo | Notas |
|---|---|---|---|
| 01098 | Piel blindada del Rino | Accesorio | Redirige el daño a sí misma; se descarta a 5 |
| 01099 | Embestida | Accesorio | +3 ATQ + Brutalidad; se descarta al final del ataque |
| 01100 | Cuerno de marfil mejorado | Accesorio | +1 ATQ |
| 01101 | Mercenario de Hydra | Esbirro | Guardia (1/0/3) |
| 01102 | Hombre de Arena | Esbirro | Dureza (3/2/4); rasgos Criminal, Élite |
| 01103 | Conmocionador | Esbirro | 2/1/3; "Al revelar: 1 daño a cada héroe" |
| 01104 | Difícil de tumbar | Perfidia | Rino cura 4; si no curó, Oleada |
| 01105 | ¡Soy duro! | Perfidia | Da Dureza a Rino; si ya tenía, Oleada |
| 01106 | Estampida | Perfidia | Alter ego: Oleada; héroe: Rino ataca, si daña → aturde |
| 01107 | Arramblar con todo | Plan secundario | Peligro; 2 + 1 de amenaza al revelarse |
| 01108 | Control de multitudes | Plan secundario | Crisis; umbral 2 |

### Set genérico Standard (compartido por los villanos en dificultad estándar)

Mover ficha (el villano maquina sin atacar) · Agresión (alter ego: Oleada; héroe:
te ataca) · Con la guardia baja (descarta un upgrade/support; si no, Oleada) ·
Todos a una (héroe: villano + esbirros enganchados te atacan a la vez) · Una
sombra del pasado (invoca el set némesis del héroe; depende del héroe elegido).

### Opcionales no implementados del escenario de Rino

- **Set némesis de Spider-Man** (Buitre + obligación): lo introduce "Una sombra
  del pasado".
- **Modular Bomb Scare / Amenaza de bomba:** el modular que el juego recomienda
  para Rino. No imprescindible.

---

## 7. Casos de prueba de referencia

> Casos en dado/cuando/entonces derivados del MVP. La mayoría ya tienen su test en
> `engine/tests/`. Se conservan como referencia de la intención; dos siguen
> abiertos (TC-014 y TC-018, ver §8).

**Secuencia de ronda:** TC-001 (la ronda tiene dos fases) · TC-002 (orden de los
5 pasos del villano) · TC-003 (activación según forma: héroe→ataca,
alter ego→maquina) · TC-004 (carta de encuentro tras cada ataque).

**Guardia:** TC-010 (un esbirro con Guardia impide atacar al villano hasta que
caiga o se desenganche — solo al jugador enganchado con ESE esbirro).

**Villano Rino:** TC-011 (al derrotar a Rino I entra Rino II con sus valores) ·
TC-012 (Rino II busca su plan secundario al entrar y baraja).

**Plan principal:** TC-013 (aceleración = 1×jugadores en el paso 1) · TC-014
(derrota al alcanzar el umbral — **pendiente**: el momento exacto de la
comprobación).

**Esbirros:** TC-015 (Hombre de Arena entra con Dureza) · TC-016 (Conmocionador
daña a cada héroe al revelarse).

**Tratados de Rino:** TC-017/018 ("¡Soy duro!" da Dureza; con una ya puesta, gana
Oleada — **pendiente**: si los estados de Dureza se acumulan) · TC-019/020
("Difícil de tumbar" cura 4; a vida completa gana Oleada) · TC-021/022
("Estampida" alter ego→Oleada; héroe→ataca y aturde si daña).

**Accesorios:** TC-023/024 (Piel blindada absorbe daño; se descarta a 5) · TC-025
(Embestida +3 y se descarta al final del ataque).

**Planes secundarios:** TC-026 (Arramblar con todo: +1 amenaza al revelarse) ·
TC-027 (reparte carta extra por su icono de Peligro) · TC-028 (Control de
multitudes bloquea quitar amenaza del plan principal).

**Set Standard:** TC-029 (Mover ficha avanza el plan sin atacar) · TC-030/031
(Agresión: alter ego→Oleada; héroe→ataca) · TC-032/033 (Con la guardia baja:
descarta un upgrade/support; si no hay, Oleada) · TC-034 (Todos a una: villano +
esbirros atacan juntos) · TC-035/036 (Una sombra del pasado: invoca el némesis;
si el esbirro choca con otro igual, no entra y la carta gana Oleada).

---

## 8. Divergencias, asunciones y límites conocidos

### Asunciones documentadas en el código

- **Progresión de estadios** Estándar I→II / Experto II→III: CONFIRMADA por la
  carta 1A en los dos escenarios de Green Goblin; sigue siendo asunción en el
  Core.
- **Negocios arriesgados (sin ruling oficial):** al derrotar un estadio, el
  siguiente entra por la cara Duende Verde y el Entorno conserva sus contadores.
  Contrastada con partidas publicadas. Punto único: `faceForNextStage`
  (`engine/src/game/villainFaces.ts`).

### No modelado (se resuelve a mano en la mesa)

- Aliados, defensa, recursos y la mano del jugador.
- La Brutalidad de Embestida (el exceso a un aliado pasa a su controlador; sin
  aliados no aplica).
- La acción de héroe del Cuerno de marfil (gastar recursos para descartarlo).
- Las cartas que dependen de esos elementos.

### Lagunas y fallos conocidos (pendientes)

- **Encuentros en alter ego:** un jugador en alter ego todavía no recibe su carta
  de encuentro base en el paso 3 (el motor solo reparte al ser atacado).
- **Tratados sin carta de aumento:** Agresión y Todos a una no dan carta de
  aumento al villano y no pasan por `villainAttacks` (no aplican habilidades de su
  cara).
- **Sets de némesis y obligaciones:** no existen. Hueco preparado:
  `reservedNemesis`.
- **The Wrecking Crew:** sin el modo "desafío extremo" (versión A y luego B) ni
  mezclas A/B.
- **TC-014:** falta confirmar contra el reglamento físico el momento exacto en
  que se comprueba la derrota por amenaza.
- **TC-018:** falta confirmar si los estados de Dureza se acumulan.
- **Mazos de jugador:** Masacre solo recibe sus cartas propias (sin el aspecto
  "Pool"); el editor valida héroe, aspecto, tamaño y copias, pero no las
  restricciones especiales de ciertas identidades (límites de rasgo o de coste).
- **The Hood:** "Juego sucio" (descartar/repartir cartas de encuentro), el
  reparto de planes a cada jugador, los entornos y los efectos de aliados van
  guiados. El diseño "aparta 7 sets modulares y baraja de uno en uno según
  avanza el villano" se aproxima metiendo al empezar los sets elegidos; el
  "barajar otro al revelar el estadio II/III" se hace a mano. Villainous (los
  esbirros de la Brigada roban aumento al activarse) y el set Expert II no se
  modelan.
- **Set modular Fanático Kree (Ronan):** en modo árbitro, sus efectos ligados a
  aliados y a la identidad van guiados. El motor solo modela que Ronan entra con
  Dureza y que su plan secundario trae su amenaza; el enganche al héroe con menos
  PG, el +1 ATQ de "El acusado", el descarte de encuentros de "¿Te atreves a
  oponerte a mí?" y la activación de "Dictar sentencia" se resuelven a mano.

---

## 9. Fuentes

- **Cartas:** marvelcdb — `https://es.marvelcdb.com` (nombres en español) y
  `https://marvelcdb.com` (datos estructurados y nombres EN). API pública:
  `/api/public/card/<code>.json`, `/api/public/cards/`, `/api/public/packs/`.
  Imágenes: `https://es.marvelcdb.com/bundles/cards/<code>.png`.
- **Reglas:** Rules Reference oficial (RRG v1.7), Learn to Play, y rulings
  recopilados por Hall of Heroes LCG (`hallofheroeslcg.com`) y rulespal
  (`rulespal.com/marvel-champions/rulebook`).
- **Escenarios con inserto propio** (p.ej. The Wrecking Crew): el inserto oficial
  del pack para las reglas especiales que marvelcdb no transcribe.
- **El repositorio de datos de marvelcdb** (`github.com/zzorba/marvelsdb-json-data`)
  tiene cartas y packs, **no** mazos preconstruidos.
