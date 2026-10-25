import type { GameState } from "../domain/types";
import type { GameEvent } from "../events/types";
import type { Effect } from "../effects/types";
import { applyEffects } from "../effects/applyEffect";
import {
  advanceMainSchemeIfComplete,
  currentMainSchemeDefinition,
  mainSchemeThreatPerRound,
} from "./mainScheme";
import {
  moveActiveVillain,
  resolveSignatureSchemeOverflows,
} from "./multiVillain";

export function addThreatStep(state: GameState): {
  state: GameState;
  events: GameEvent[];
} {
  // Respuesta obligada del plan principal "después del paso 1" (Fuga de
  // prisión). Se lee de la etapa en juego ANTES de añadir la amenaza.
  const afterStep = currentMainSchemeDefinition(state)?.afterThreatStep;

  // La aceleración impresa escala por número de jugadores (salvo la variable
  // "X" de algunos planes); los tokens de aceleración (por mazo de encuentros
  // agotado) y los iconos de Aceleración son un bonus fijo. Ver
  // mainSchemeThreatPerRound.
  const amount = mainSchemeThreatPerRound(state);
  const { state: afterThreat, events } = applyEffects(state, [
    { type: "ADD_THREAT", target: { kind: "MAIN_SCHEME" }, amount },
  ]);
  // Si con esta amenaza el plan principal alcanza su umbral y tiene una etapa
  // siguiente, avanza (planes de varias etapas, p.ej. Klaw). Si es la etapa
  // final, no avanza y checkGameOutcome marcará la derrota.
  const { state: afterAdvance, events: advanceEvents } =
    advanceMainSchemeIfComplete(afterThreat);
  let current = afterAdvance;
  const allEvents = [...events, ...advanceEvents];

  if (afterStep?.type === "THREAT_ON_EACH_SIDE_SCHEME_THEN_MOVE_ACTIVE") {
    // Fuga de prisión: N de amenaza en cada plan secundario; los planes
    // propios que lleguen a 10 se disparan en ese momento ("una oportunidad
    // de respuesta ocurre inmediatamente después de resolver su condición",
    // RRG) y después el contador activo pasa al villano con más amenaza.
    const placements: Effect[] = current.schemes
      .filter((s) => !s.isMain)
      .map((s): Effect => ({
        type: "ADD_THREAT",
        target: { kind: "SCHEME", schemeId: s.id },
        amount: afterStep.amount,
      }));
    const placed = applyEffects(current, placements);
    const overflow = resolveSignatureSchemeOverflows(placed.state);
    const moved = moveActiveVillain(overflow.state, "MOST");
    current = moved.state;
    allEvents.push(...placed.events, ...overflow.events, ...moved.events);
  }

  return { state: current, events: allEvents };
}
