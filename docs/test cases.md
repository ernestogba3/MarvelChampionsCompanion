# Casos de prueba — formato dado/cuando/entonces

> Cada caso aquí debe poder traducirse casi literalmente a un test de
> Vitest en `engine/tests/`. Si un caso no se puede expresar así de claro,
> probablemente la regla todavía no está lo bastante bien entendida.
>
> Casos derivados de `rules-spec.md` (secuencia de ronda) y
> `scenario-rhino.md` (21 cartas: set Rhino + set Standard).

## Secuencia de ronda

### TC-001 — La ronda solo tiene dos fases
Dado el inicio de una partida nueva,
cuando se consulta la fase actual,
entonces debe ser `PLAYER_PHASE`, y tras resolverla por completo debe pasar
a `VILLAIN_PHASE`, sin ninguna fase intermedia.

### TC-002 — Orden de los 5 pasos de la Fase del Villano
Dado que la partida entra en `VILLAIN_PHASE`,
cuando se avanza paso a paso,
entonces el orden debe ser exactamente: añadir amenaza → activar
villano/esbirros → repartir cartas de encuentro → revelar cartas de
encuentro → pasar testigo y terminar ronda. Ningún paso puede saltarse ni
resolverse en otro orden.

### TC-003 — Activación del villano según identidad
Dado que el villano se activa contra un jugador,
cuando ese jugador está en forma de héroe,
entonces el villano debe atacarle.
Dado el mismo caso,
cuando ese jugador está en alter ego,
entonces el villano debe avanzar su plan, no atacar.

### TC-004 — Reparto de cartas de encuentro tras un ataque
Dado que un jugador ha sido atacado por el villano o por un esbirro,
cuando se resuelve el Paso 3,
entonces ese jugador debe recibir boca abajo la carta superior del mazo de
encuentro, una por cada ataque recibido.

## Palabra clave: Guardia

### TC-010 — Guardia impide atacar al villano
Dado un esbirro con Guardia enfrentado al jugador activo,
cuando el jugador intenta asignar daño al villano,
entonces la acción debe rechazarse hasta que ese esbirro sea derrotado o
abandone el combate.

## Villano — Rino (I) y (II)

### TC-011 — Transición de etapa al derrotar a Rino (I)
Dado que Rino (I) ha sido derrotado (su vida llega a 0),
cuando se resuelve su derrota,
entonces debe entrar en juego Rino (II) con sus propios valores (ataque 3,
vida 15), no continuar con los de la etapa I.

### TC-012 — Rino (II) busca su side scheme al entrar en juego
Dado que Rino (II) entra en juego,
cuando se resuelve su efecto "al revelarse",
entonces el motor debe buscar "Arramblar con todo" en el mazo y descarte de
encuentro, ponerlo en juego, y barajar el mazo de encuentro a continuación.

## Plan principal — "¡Allanamiento!"

### TC-013 — Escalada de amenaza en el Paso 1
Dado el inicio del Paso 1 de la fase del villano,
cuando se resuelve ese paso,
entonces se debe añadir 1 de amenaza al plan principal por cada jugador en
la partida.

### TC-014 — Derrota por amenaza completa
Dado que el plan principal acumula 7 o más de amenaza,
cuando se completa esa condición,
entonces la partida debe terminar en derrota para los jugadores.
**Pendiente de verificar**: si la derrota se comprueba inmediatamente al
añadir la amenaza o al final del paso en curso.

## Esbirros

### TC-015 — Hombre de Arena entra con dureza
Dado que Hombre de Arena entra en juego,
cuando se resuelve su entrada,
entonces debe recibir inmediatamente un estado de dureza.

### TC-016 — Conmocionador daña a todos al revelarse
Dado que se revela la carta de encuentro "Conmocionador",
cuando entra en juego,
entonces debe infligir 1 punto de daño a cada héroe inmediatamente.

## Tratados (Treachery) del set Rino

### TC-017 — "¡Soy duro!" sin dureza previa
Dado que Rino no tiene actualmente un estado de dureza,
cuando se revela "¡Soy duro!",
entonces Rino debe recibir un estado de dureza, y la carta NO debe ganar
oleada.

### TC-018 — "¡Soy duro!" con dureza previa
Dado que Rino ya tiene un estado de dureza,
cuando se revela "¡Soy duro!" de nuevo,
entonces la carta debe ganar oleada (revelar una carta de encuentro
adicional). **Pendiente de verificar**: si los estados de dureza se
acumulan o si "ya tenerlo" simplemente impide añadir otro.

### TC-019 — "Difícil de tumbar" con Rino dañado
Dado que Rino tiene al menos 1 punto de daño,
cuando se revela "Difícil de tumbar",
entonces Rino debe curar 4 de daño (sin bajar de 0 de daño), y la carta NO
debe ganar oleada.

### TC-020 — "Difícil de tumbar" con Rino a vida completa
Dado que Rino está a vida completa,
cuando se revela "Difícil de tumbar",
entonces no se cura nada y la carta debe ganar oleada.

### TC-021 — "Estampida" en alter ego
Dado que un jugador está en alter ego,
cuando se le revela "Estampida",
entonces la carta debe ganar oleada, sin que Rino le ataque.

### TC-022 — "Estampida" en forma de héroe
Dado que un jugador está en forma de héroe,
cuando se le revela "Estampida",
entonces Rino debe atacarle; si ese ataque le inflige daño, el jugador
queda aturdido.

## Accesorios del set Rino

### TC-023 — "Piel blindada del Rino" absorbe daño
Dado que Rino tiene "Piel blindada del Rino" en juego con menos de 5 de
daño acumulado en ella,
cuando Rino recibiría daño de cualquier fuente,
entonces ese daño debe colocarse en la carta en vez de aplicarse a la vida
de Rino.

### TC-024 — "Piel blindada del Rino" se descarta al llenarse
Dado que la carta acumula 5 o más de daño,
cuando se comprueba tras resolver el daño,
entonces la carta debe descartarse.

### TC-025 — "Embestida" aumenta el ataque y se descarta
Dado que Rino tiene "Embestida" en juego,
cuando Rino ataca,
entonces ese ataque debe sumar +3 y ganar la capacidad de repartir el
exceso de daño al controlador del aliado golpeado; al terminar ese
ataque, "Embestida" debe descartarse.

## Side schemes del set Rino

### TC-026 — "Arramblar con todo" añade amenaza al revelarse
Dado que se revela "Arramblar con todo",
cuando entra en juego,
entonces debe añadir 1 de amenaza adicional a sí misma, por encima de su
amenaza inicial de 2.

### TC-027 — "Arramblar con todo" reparte carta extra en la fase del villano
Dado que "Arramblar con todo" está en juego,
cuando se resuelve el Paso 3 de la fase del villano,
entonces debe repartirse una carta de encuentro adicional, además de las
que correspondan por ataques recibidos.

### TC-028 — "Control de multitudes" bloquea quitar amenaza
Dado que "Control de multitudes" está en juego,
cuando un jugador intenta quitar amenaza del plan principal,
entonces la acción debe rechazarse mientras esa carta siga en juego.

## Set Standard / Normal

### TC-029 — "Mover ficha" avanza el plan sin atacar
Dado que se revela "Mover ficha",
cuando se resuelve su efecto,
entonces el villano debe avanzar su plan, sin atacar a nadie,
independientemente de si el jugador está en héroe o alter ego.

### TC-030 — "Agresión" en alter ego
Dado que un jugador está en alter ego,
cuando se le revela "Agresión",
entonces la carta debe ganar oleada.

### TC-031 — "Agresión" en forma de héroe
Dado que un jugador está en forma de héroe,
cuando se le revela "Agresión",
entonces el villano debe atacarle directamente, como ataque adicional
fuera del Paso 2 normal.

### TC-032 — "Con la guardia baja" descarta un upgrade/support
Dado que el jugador controla al menos un upgrade o support en juego,
cuando se le revela "Con la guardia baja",
entonces debe descartar uno de ellos, y la carta NO debe ganar oleada.

### TC-033 — "Con la guardia baja" sin upgrades/supports
Dado que el jugador no controla ningún upgrade ni support,
cuando se le revela "Con la guardia baja",
entonces no se descarta nada y la carta debe ganar oleada.

### TC-034 — "Todos a una" en forma de héroe
Dado que un jugador está en forma de héroe y tiene esbirros enfrentados
con él,
cuando se le revela "Todos a una",
entonces el villano y cada uno de esos esbirros deben atacarle, todos en
la misma resolución.

### TC-035 — "Una sombra del pasado" con némesis disponible
Dado que el héroe tiene su esbirro némesis reservado aparte y no hay otro
enemigo con el mismo nombre en juego,
cuando se revela "Una sombra del pasado",
entonces el esbirro némesis debe entrar en juego enfrentado al jugador,
su side scheme némesis debe entrar en juego, y el resto de su set némesis
debe barajarse en el mazo de encuentro. La carta NO debe ganar oleada.

### TC-036 — "Una sombra del pasado" con némesis bloqueado
Dado que ya hay en juego un enemigo con el mismo nombre que el esbirro
némesis del héroe,
cuando se revela "Una sombra del pasado",
entonces el esbirro némesis NO debe entrar en juego (permanece
reservado), pero el side scheme némesis sí entra y el resto del set se
baraja igualmente; la carta debe ganar oleada.

## Pendientes de escribir

- [ ] Casos para el agotamiento del mazo de encuentro.
- [ ] Casos para Forced Interrupts simultáneos (ej. "Piel blindada del
      Rino" y "Embestida" activas a la vez — orden de resolución).
- [ ] Casos del set Némesis de Spider-Man (Buitre), si se decide
      incluirlo antes de cerrar la Fase 4.
- [ ] Casos del modular Bomb Scare, si se decide incluirlo.
- [ ] Verificar TC-014 (momento exacto en que se comprueba la derrota) y
      TC-018 (si los estados de dureza se acumulan) contra el Rules
      Reference físico — son los dos puntos marcados como "pendiente de
      verificar" en `rules-spec.md` y `scenario-rhino.md`.