# Roadmap de contenido — Phasekeeper

Roadmap maestro para cubrir TODO el contenido de Marvel Champions: villanos
(escenarios que se implementan en el motor) y personajes jugables (héroes).
Integra y sustituye al antiguo roadmap de villanos (`villain-roadmap.md`, que
nunca llegó a estar en el repositorio).

Lista de packs tomada de la API de marvelcdb (fechas incluidas). El contenido
exacto de cada pack/caja se verifica al construirlo (nunca de memoria).

---

## Dos tracks, dos tipos de trabajo

- **Villanos = trabajo de implementación.** Cada villano es un escenario del
  motor: cartas verificadas, `ScenarioDefinition`, mecánicas nuevas si hace
  falta (fidelidad primero), tests, y UI si la mecánica lo pide.
- **Héroes = ya cubiertos a nivel de app.** La app carga el catálogo COMPLETO
  de héroes en vivo desde marvelcdb (`services/heroCatalog` → `getHeroCatalog`),
  así que selección de identidad, PG inicial y construcción de mazos ya
  funcionan para todos los héroes publicados sin trabajo por héroe. El motor
  NO simula poderes ni cartas de héroe (se juegan físicamente; la app arbitra
  el lado del villano). El track de héroes es, por tanto, inventario +
  fidelidad OPCIONAL (ver más abajo).

---

## TRACK 1 — Villanos (implementación en el motor)

Método por villano (igual que Klaw/Ultron): verificar datos en marvelcdb →
`data/cards.ts` + `scenarios/<villano>.ts` + registrar → mecánicas de motor →
tests → UI si procede.

### Hecho

- **Core Set:** Rino, Klaw, Ultron (jugables).
- **The Green Goblin:** Negocios arriesgados (Norman Osborn / Duende Verde) y
  La fórmula mutagénica (Duende Verde), jugables. Sin sets modulares (igual
  que el Core).
- **The Wrecking Crew:** Fuga de prisión (Destructor, Bola de Trueno,
  Martinete y Bulldozer a la vez), jugable. Reglas del inserto oficial del
  pack. No modelado: el modo "desafío extremo" (versiones A y luego B) ni las
  mezclas A/B.
- **Sistemas de motor:** registro de escenarios, plan principal multi-etapa,
  Oleada (Surge), Represalia (infraestructura), Drones, `scenarioId` en
  GameState (el nombre del villano ya no es la clave), villano de dos caras +
  Entorno de dos caras con contadores (volteo automático), "Cuando se
  muestre" de estadios por datos, efecto "Cuando se complete" de etapa (OPA
  hostil), amenaza inicial ×jugadores ([per_hero]), aceleración variable por
  rasgo, iconos de plan (Aceleración, Crisis, Peligro), Guardia por datos,
  esbirros de preparación y acción "poner esbirro en juego" (efectos guiados),
  varios villanos a la vez con contador activo (villano activo + reserva, un
  mazo de encuentros por villano, ataque a cualquier villano, victoria al
  derrotarlos a todos), planes secundarios propios con efecto al llegar a 10,
  aceleración fija, Respuesta obligada del plan tras el paso 1 y acciones
  manuales de "hacer activo" y "+1 amenaza" para efectos guiados. El núcleo
  "el villano X ataca / maquina" es común (villainAttacks / villainSchemes) y
  sirve para los tratados que activan a un villano concreto.
- Progresión de estadios Estándar I→II / Experto II→III: CONFIRMADA por la
  carta 1A en los dos escenarios de Green Goblin; sigue siendo asunción en el
  Core.
- Asunción sin ruling oficial (Negocios arriesgados): al derrotar un estadio,
  el siguiente entra por la cara Duende Verde y el Entorno conserva sus
  contadores. Contrastada con partidas publicadas; punto único:
  `faceForNextStage` (engine/src/game/villainFaces.ts).

### Fase A — Packs de escenario independientes (orden de salida)

1. ~~**The Green Goblin** (`gob`, 2019-12) — 2 escenarios.~~ **Hecho.**
2. ~~**The Wrecking Crew** (`twc`, 2020-02) — cuatro villanos a la vez con
   contador activo (sí tiene plan principal: Fuga de prisión).~~ **Hecho.**
3. **Ronan Modular Set** (`ron`, 2020-08) — probablemente MODULAR, no escenario
   completo. _Verificar; posible tratamiento aparte._
4. **The Hood** (`hood`, 2021-11) — probablemente MODULAR. _Verificar._
5. **MojoMania** (`mojo`, 2022-11). _Verificar._
6. **Trickster Takeover** (`tt`, 2025-08). _Verificar._
7. **Synthezoid Smackdown** (`synthezoid`, 2025-12). _Verificar._

### Fase B — Cajas de campaña (orden de salida)

Cada caja trae varios villanos/escenarios; se listan y verifican al llegar.

1. The Rise of Red Skull (`trors`, 2020-09)
2. The Once and Future Kang (`toafk`, 2020-10)
3. The Galaxy's Most Wanted (`gmw`, 2021-04)
4. The Mad Titan's Shadow (`mts`, 2021-09)
5. Sinister Motives (`sm`, 2022-04)
6. Mutant Genesis (`mut_gen`, 2022-09)
7. NeXt Evolution (`next_evol`, 2023-08)
8. Age of Apocalypse (`aoa`, 2024-03)
9. Agents of S.H.I.E.L.D. (`aos`, 2025-02)
10. Civil War (`cw`, 2025-10)
11. Fear No Evil (`fne`, 2026-07)

### Sistemas de motor que probablemente habrá que construir (a confirmar)

- Varios villanos con contador activo: YA existe (The Wrecking Crew); los
  Seis Siniestros (Sinister Motives) deberían poder reutilizarlo.
- Los tratados estándar Agresión y Todos a una no dan carta de aumento al
  villano y no usan villainAttacks (no aplican habilidades de su cara, p.ej.
  la Interrupción de Norman). Revisar.
- Sets de némesis y obligaciones (también lado héroe, ver Track 2).
- Efectos de Entorno más allá de Drones y del Entorno de dos caras con
  contadores (este último ya existe: Negocios arriesgados).
- Reparto base de cartas de encuentro en el paso 3: hoy el motor solo reparte
  al ser atacado (villano/esbirros); un jugador en alter ego no recibe su
  carta. Los iconos de Peligro sí se reparten. Revisar.
- Recursos / agotar / ventanas de interacción (sistema grande; del que dependen
  muchas keywords: pago de recursos, aturdir-al-golpear, etc.).
- Sets modulares (Ronan/The Hood y cajas que los usan).

---

## TRACK 2 — Personajes jugables (héroes)

### Cobertura actual: completa a nivel de app

Todos los héroes publicados ya están disponibles vía el catálogo en vivo de
marvelcdb. No hay cola de implementación por héroe para lo que la app hace hoy.

### Mazo del pack (hecho)

Un héroe sin mazo guardado juega con su "mazo del pack"
(`engine/src/deck/packDeck.ts`): sus cartas propias exactas + las de un
aspecto y las básicas que trae su pack (aspecto elegible; por defecto, el que
más copias trae). NO es el preconstruido impreso: marvelcdb no publica esas
listas y algunas usan cartas del Core Set. Con los datos de marvelcdb, 59 de
73 héroes quedan en 40-50 cartas; fuera de rango: los 5 del Core Set (57),
las cajas con dos héroes (Sinister Motives, NeXt Evolution, Mutant Genesis,
Agents of S.H.I.E.L.D., Civil War: 51-60), Gamora (37), Hombre Maravilla (33)
y Masacre (16: el aspecto "Pool" no está contemplado). No se recorta: elegir
qué quitar sería inventarse el mazo.

### Editor de mazos (hecho)

`mobile/app/mazo/editar/[id].tsx`: crear (elige héroe → precarga sus cartas
de firma), ver y editar. Aspecto elegible, buscador, controles de ± copias
por carta (hasta su deck_limit) y validación en vivo (tamaño, aspecto único,
copias, cartas de héroe obligatorias, cartas que faltan en la colección).
Las cartas que ofrece salen de `isDeckEligibleCard`
(`engine/src/deck/packDeck.ts`): cartas del héroe, del aspecto elegido
(genéricas o "de color" del propio héroe) y básicas genéricas, excluyendo las
de otro héroe o escenario. "Nuevo mazo" y "Editar" (en Colección y en el
visor) ya enlazan aquí.

Pendiente:
- Preconstruidos oficiales, si se decide transcribirlos de los folletos
  (verificados uno a uno).
- Aspecto "Pool" (Masacre) en las reglas de mazo.
- Restricciones especiales de algunos héroes (límites de rasgo/coste de
  ciertas identidades): el editor aún no las comprueba.

### Inventario — héroes del Core Set

Spider-Man, Captain Marvel, She-Hulk, Iron Man, Black Panther.

### Inventario — packs de héroe independientes (orden de salida)

Captain America, Ms. Marvel (2019-12) · Thor (2020-03) · Black Widow (2020-05)
· Doctor Strange (2020-06) · Hulk (2020-08) · Ant-Man (2020-11) · Wasp,
Quicksilver (2021-01/02) · Scarlet Witch (2021-03) · Star-Lord, Gamora
(2021-05) · Drax (2021-06) · Venom (2021-07) · Nebula (2021-09) · War Machine
(2021-11) · Valkyrie (2021-11) · Vision (2022-01) · Nova, Ironheart (2022-05) ·
Spider-Ham, SP//dr (2022-07) · Cyclops, Phoenix (2022-09) · Wolverine, Storm
(2022-11) · Gambit, Rogue (2023-02) · Psylocke, Angel (2023-09) · X-23,
Deadpool (2023-11) · Iceman (2024-05) · Jubilee (2024-07) · Nightcrawler
(2024-09) · Magneto (2024-11) · Black Panther, Silk (2025-04) · Falcon, Winter
Soldier (2025-06) · Wonder Man, Hercules (2026-02) · Jessica Jones, Luke Cage
(2026-08).

### Inventario — héroes dentro de cajas de campaña

Cada caja de campaña incluye 1-2 héroes además de su contenido de villano. Se
listan al verificar cada caja (no enumerados aquí de memoria para no errar).

### Fidelidad OPCIONAL del lado héroe (fuera de alcance salvo que se decida)

- **Sets de némesis:** cada héroe tiene su némesis (esbirro + plan secundario +
  treacheries). El motor ya tiene `reservedNemesis` como hueco pero sin usar;
  la treachery estándar "Una sombra del pasado" (01190) lo invoca. Construir
  esto es un sistema transversal que beneficia a todos los escenarios.
- **Obligaciones de héroe**, cartas de identidad/poderes: hoy se juegan
  físicamente; modelarlas sería un salto grande y probablemente innecesario
  para un árbitro.

---

## "Todo el contenido" = definición de hecho

- **Villanos:** todos implementados como escenarios jugables (Track 1).
- **Héroes:** disponibles vía catálogo en vivo (ya cumplido); fidelidad extra
  (némesis/obligaciones) solo si se decide.
