# Especificación de reglas — Secuencia de ronda

> Fuente: Rules Reference y Learn to Play oficiales de Marvel Champions: The Card Game (Fantasy Flight Games).
> Este documento es un resumen en lenguaje propio, no una copia del reglamento.
> Última verificación: completar fecha cuando se contraste con el reglamento físico.

## Estructura general

Cada ronda tiene exactamente **dos fases**: Fase de Jugador y Fase del Villano.
No existe una fase "Recovery" independiente — recuperarse es una acción que un
jugador puede elegir hacer durante su turno, estando en alter ego, dentro de la
Fase de Jugador.

```
RONDA
├── Fase de Jugador
└── Fase del Villano (5 pasos)
```

## 1. Fase de Jugador

1. Empieza la fase de jugador.
2. Cada jugador, en orden de turno, resuelve su turno completo: jugar cartas,
   usar habilidades, atacar al villano o a esbirros, defenderse si procede,
   cambiar entre identidad heroica y alter ego, etc.
3. Cuando todos los jugadores han completado su turno, termina la fase de
   jugador.

## 2. Fase del Villano

Se resuelve en 5 pasos numerados, siempre en este orden:

### Paso 1 — Añadir amenaza
Se coloca amenaza en el plan principal (main scheme), normalmente una
cantidad por jugador, según lo indique la propia carta del plan.

### Paso 2 — Activación del villano y los esbirros
El villano se activa una vez por jugador. Para cada activación:
- Si el jugador está en forma de **héroe** → el villano le ataca.
- Si el jugador está en **alter ego** → el villano avanza su plan.
Los esbirros enfrentados a cada jugador también atacan durante este paso.

### Paso 3 — Repartir cartas de encuentro
Cada vez que un jugador es atacado (por el villano o por un esbirro), recibe
boca abajo la carta superior del mazo de encuentro.

### Paso 4 — Revelar cartas de encuentro
Los jugadores revelan y resuelven, por orden de turno, las cartas de
encuentro que han recibido en el paso 3.

### Paso 5 — Pasar el testigo de primer jugador y terminar la ronda
El testigo de primer jugador pasa al siguiente jugador en sentido horario.
Comienza una nueva ronda, volviendo al paso 1 de la Fase de Jugador.

## Pendiente de confirmar contra el reglamento físico

Estos puntos requieren contrastarse con la carta de plan y el Rules
Reference impreso antes de darlos por definitivos en el motor:

- [ ] Orden exacto de resolución cuando hay varios esbirros enfrentados al
      mismo jugador en el Paso 2.
- [ ] Qué ocurre si el mazo de encuentro se agota durante el Paso 3
      (mecánica de barajar el descarte + token de amenaza extra).
- [ ] Interacción de efectos "Forced Interrupt" / "Forced Response" durante
      cualquiera de los 5 pasos — esto es lo que más tests va a necesitar.
- [ ] Texto exacto del Paso 1 en la carta de plan principal de Rhino
      (cuánta amenaza se añade por jugador).

## Palabras clave relevantes para esta secuencia

Extraídas de `scenario-rhino.md` (set específico de Rhino/Rino). Faltan
por añadir las que aparezcan en el set "Standard" cuando esté listo.

| Término (EN) | Término (ES) | Dónde aparece | Definición (resumen — pendiente de verificar contra el Rules Reference) |
|---|---|---|---|
| Guard | Guardia | Mercenario de Hydra | Mientras este esbirro esté enfrentado contigo, no puedes asignar ataques al villano |
| Toughness / tough status | Dureza | Hombre de Arena, Rino (III), "¡Soy duro!" | El personaje entra en juego (o recibe) un estado de dureza. **Pendiente de verificar el efecto exacto**: la regla general es que el primer punto de daño que recibiría se absorbe gastando ese estado, en vez de aplicar el daño |
| Surge | Oleada | "¡Soy duro!", "Difícil de tumbar", Estampida (en alter ego) | Si una carta de encuentro gana oleada, se revela inmediatamente una carta de encuentro adicional |
| Elite | Elite | Hombre de Arena | Rasgo de esbirro. **Pendiente de verificar su efecto mecánico exacto** — no asumir nada hasta confirmarlo |
| Icono de peligro (Hazard) | — | Arramblar con todo | Mientras este side scheme esté en juego, se reparte una carta de encuentro adicional en cada fase del villano |
| Icono de crisis (Crisis) | — | Control de multitudes | Mientras este side scheme esté en juego, no se puede quitar amenaza del plan principal |

Los términos marcados como "pendiente de verificar" no deben
implementarse en el motor hasta confirmarse con el Rules Reference
físico o con una fuente oficial — son los que más fácil es
malinterpretar.

## Casos de prueba derivados de esta secuencia

Ver `test-cases.md`.