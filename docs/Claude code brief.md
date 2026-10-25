# Brief de ejecución para Claude Code — Añadir villanos a Phasekeeper

Este documento es autosuficiente: dáselo a Claude Code para que implemente
villanos de Marvel Champions villano a villano, con mínima dirección humana.
Trabaja en el repo real (monorepo `engine/` + `mobile/`). Léelo entero antes de
empezar. La cola de villanos está en `docs/Content roadmap.md`.

## Misión

Convertir cada villano del juego en un escenario jugable del motor, con datos
verificados y tests, siguiendo exactamente las convenciones existentes (Rino,
Klaw, Ultron ya están hechos y sirven de plantilla).

## Reglas INQUEBRANTABLES

1. **Nunca inventes reglas ni datos.** Verifica TODO (códigos, PG, ATQ, Plan,
   umbrales, boost, cantidades, keywords) contra marvelcdb antes de escribirlo:
   - Carta individual: `https://es.marvelcdb.com/api/public/card/<code>.json`
     (español) y `https://marvelcdb.com/api/public/card/<code>.json` (nombre EN).
   - Si NO hay acceso de red a marvelcdb, **PARA** y díselo al humano. No
     escribas datos de memoria.
2. **Archivos completos.** Entrega archivos enteros, nunca fragmentos ni "añade
   esta línea".
3. **TypeScript estricto, nunca lo relajes.** `engine/` usa `strict`,
   `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`,
   `isolatedModules`. Arregla los tipos bien; no uses `any` ni `@ts-ignore` ni
   bajes flags.
4. **Tras CADA villano, deja verde:** `pnpm test` y `pnpm typecheck` en `engine/`,
   y `npx tsc --noEmit` en `mobile/`. Si un test de conteo de catálogo falla,
   actualiza su número (es legítimo).
5. **Modo "árbitro" por defecto:** modela lo que el motor ya soporta; lo que no,
   déjalo guiado por el texto de la carta y documéntalo en el archivo del
   escenario. No construyas sistemas de motor nuevos sin pasar por un punto de
   parada (ver abajo).

## Prerrequisitos de entorno

- Red saliente a `*.marvelcdb.com` (si no, parar — ver regla 1).
- `pnpm` instalado; `node` 20+.
- Imágenes de carta en runtime: `https://es.marvelcdb.com/bundles/cards/<code>.png`.

## Flujo por villano (repetir para cada uno de la cola)

1. **Verificar el set** en marvelcdb: localiza el rango de códigos del set del
   villano (sondea cartas individuales), y recoge de cada carta: code, nameEs,
   nameEn, type, traits, attack, scheme, health, base_threat (inicial),
   escalation_threat, threat (umbral), boost (número; si es icono "estrella"
   usa 0 y marca el efecto como guiado), quantity, text, y keywords impresas
   (Oleada/Surge, Guardia, Dureza, Represalia…).
2. **Cartas:** añade todas a `engine/src/data/cards.ts` en `CARD_CATALOG`
   (forma `CardDefinition`). Marca `surge: true` SOLO si la Oleada es impresa
   (no la condicional). Si aparece un tipo de carta nuevo, añádelo a `CardType`
   y el set a `EncounterSet`.
3. **Escenario:** crea `engine/src/scenarios/<villano>.ts` con una
   `ScenarioDefinition` (usa `klaw.ts` y `ultron.ts` como plantilla). Incluye:
   `id`, `villainName` (= `villain.name`, clave de runtime), `mainScheme`
   (+ `additionalMainSchemeStages` si es multi-etapa), `stages` (I/II/III con
   PG por jugador, tough, droneBonus/immuneWhileDronesPresent si aplica),
   `progression` (Estándar/Experto), `encounterDeck` (cartas del set × cantidad
   - set STANDARD: 01186×2, 01187×2, 01188×1, 01189×1, 01190×1),
     `boostCardsPerActivation`. Regístralo en `engine/src/scenarios/index.ts`.
4. **Tests:** crea `engine/tests/<villano>.test.ts` (Vitest, en español, estilo
   de los tests existentes): creación del escenario (PG/umbral escalan ×jugadores),
   avance de estadios, avance del plan multi-etapa y derrota en la etapa final,
   y cualquier mecánica específica. Deja toda la suite verde.
5. **Móvil:** normalmente NADA — el villano aparece solo en el selector vía
   `ALL_SCENARIOS`. Solo toca `mobile/` si la mecánica necesita UI nueva (como
   los Drones de Ultron: botón + render). Verifica con `npx tsc --noEmit`.

## PARA y pregunta al humano cuando

- El villano necesite un **sistema de motor que no existe** (ej.: escenario SIN
  plan principal como The Wrecking Crew; sets de némesis/obligaciones; recursos/
  agotar; contadores de escenario; efectos de entorno nuevos). Describe qué
  falta y espera decisión de alcance (árbitro vs construir el sistema).
- El pack sea en realidad un **set modular**, no un escenario de villano
  (sospechosos: Ronan, The Hood). Confírmalo y pregunta cómo tratarlo.
- Los **datos no se puedan verificar** (sin red a marvelcdb).
- Haya una **decisión de diseño** con varias opciones razonables.

## Convenciones de datos ya acordadas

- PG de villano y umbral de plan principal son POR JUGADOR (el motor multiplica
  ×nº de jugadores). La amenaza inicial no escala.
- Progresión de estadios asumida (confirmar con carta física si es posible):
  Estándar I→II, Experto II→III.
- `boost` "estrella" → 0 numérico + efecto guiado. Oleada condicional → sin
  `surge`, guiada.
- Plan principal multi-etapa: usa `mainScheme` + `additionalMainSchemeStages`
  (el sistema avanza solo y pierde en la etapa final).

## Definición de "hecho" por villano

- Cartas en `cards.ts` verificadas, escenario creado y registrado, tests nuevos
  en verde, suite completa verde, typecheck de engine y mobile limpios,
  divergencias del modo árbitro documentadas en el `.ts` del escenario, y
  actualizado `docs/Content roadmap.md` marcando el villano como hecho.

## Formato de commit (una entrega por villano)

Mensaje claro `feat(engine): añadir villano <Nombre>` describiendo cartas,
escenario, sistemas y tests. Termina con:

```
Co-Authored-By: Claude <noreply@anthropic.com>
```

(usa la atribución que indique el entorno de Claude Code).

## Orden de trabajo

Seguir `docs/Content roadmap.md`: Fase A (packs de escenario, empezando por
The Green Goblin) y luego Fase B (cajas de campaña, en orden de salida). Un
villano por iteración; parar en los puntos indicados.
