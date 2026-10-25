import type { GameState } from "../domain/types";
import { nextPhase } from "./phases";
import { drawToHandSize, type Shuffle } from "./playerLibrary";
import { queueHazardEncounterCards } from "./sideSchemes";

/**
 * Avanza al siguiente paso/fase. Al SALIR de la fase del jugador roba, para
 * cada jugador, hasta completar su mano (RRG, último paso de la Player Phase:
 * "each player draws back up to their hand size").
 *
 * El robo solo afecta a jugadores con biblioteca simulada (los que empezaron
 * con mazo); los demás se ignoran, de modo que las partidas antiguas o sin
 * mazo —y todos los tests existentes, cuyos fixtures no tienen library— se
 * comportan exactamente igual que antes.
 *
 * `options.shuffle` se usa solo si la biblioteca de alguien se agota durante
 * el robo y hay que rebarajar su descarte. Por defecto (noShuffle) el motor
 * es determinista; la app pasa un barajador real.
 */
export function advanceToNextStep(
  state: GameState,
  options: { shuffle?: Shuffle } = {},
): GameState {
  const leavingPlayerPhase = state.phase.name === "PLAYER_PHASE";
  const newPhase = nextPhase(state.phase);
  const startingNewRound =
    state.phase.name === "VILLAIN_PHASE" &&
    state.phase.step === "PASS_FIRST_PLAYER";

  let next: GameState = {
    ...state,
    phase: newPhase,
    round: startingNewRound ? state.round + 1 : state.round,
  };

  // Iconos de Peligro: al entrar en el paso 3 (repartir cartas de encuentro)
  // se encola 1 carta adicional por icono en juego.
  if (
    newPhase.name === "VILLAIN_PHASE" &&
    newPhase.step === "DEAL_ENCOUNTER_CARDS"
  ) {
    next = queueHazardEncounterCards(next);
  }

  if (leavingPlayerPhase) {
    const drawOptions =
      options.shuffle !== undefined ? { shuffle: options.shuffle } : {};
    for (const player of state.players) {
      const result = drawToHandSize(next, player.id, drawOptions);
      // advanceToNextStep no está envuelto por runAndLog, así que anexamos
      // aquí los eventos del robo al eventLog para que el sistema de
      // explicaciones pueda narrarlos. Sin biblioteca no hay eventos → el
      // eventLog queda intacto, como antes.
      next = {
        ...result.state,
        eventLog: [...result.state.eventLog, ...result.events],
      };
    }
  }

  return next;
}
