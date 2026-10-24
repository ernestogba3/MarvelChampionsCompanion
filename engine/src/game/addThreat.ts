import type { GameState } from "../domain/types";
import type { GameEvent } from "../events/types";
import { applyEffects } from "../effects/applyEffect";
import { advanceMainSchemeIfComplete } from "./mainScheme";

export function addThreatStep(state: GameState): {
  state: GameState;
  events: GameEvent[];
} {
  const mainScheme = state.schemes.find((s) => s.isMain)!;
  // La aceleración impresa escala por número de jugadores; los tokens de
  // aceleración (por mazo de encuentros agotado) son un bonus fijo, no se
  // multiplican por jugadores.
  const amount =
    mainScheme.escalationThreat * state.players.length +
    mainScheme.accelerationTokens;
  const { state: afterThreat, events } = applyEffects(state, [
    { type: "ADD_THREAT", target: { kind: "MAIN_SCHEME" }, amount },
  ]);
  // Si con esta amenaza el plan principal alcanza su umbral y tiene una etapa
  // siguiente, avanza (planes de varias etapas, p.ej. Klaw). Si es la etapa
  // final, no avanza y checkGameOutcome marcará la derrota.
  const { state: afterAdvance, events: advanceEvents } =
    advanceMainSchemeIfComplete(afterThreat);
  return { state: afterAdvance, events: [...events, ...advanceEvents] };
}
