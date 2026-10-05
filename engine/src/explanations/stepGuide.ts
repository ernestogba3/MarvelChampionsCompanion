import type { GameState } from "../domain/types";
import type { RuleExplanation } from "./types";
export function describeCurrentStep(state: GameState): RuleExplanation {
  if (state.phase.name === "PLAYER_PHASE") {
    return {
      title: "Fase de jugador",
      description:
        "Juega tu turno: usa tus poderes, ataca al villano o a los esbirros, o cámbiate a alter ego.",
      reason:
        "Cada jugador resuelve su turno completo antes de pasar a la fase del villano.",
      nextStep: "Cuando termines tu turno, pasa a la fase del villano.",
    };
  }
  switch (state.phase.step) {
    case "ADD_THREAT":
      return {
        title: "Paso 1 — Añade amenaza",
        description:
          "Añade amenaza al plan principal según indique la carta del plan.",
        reason:
          "La fase del villano siempre empieza añadiendo amenaza, antes de que nadie actúe.",
        nextStep: "Confirma que has añadido la amenaza para continuar.",
      };
    case "VILLAIN_ACTIVATION":
      return {
        title: "Paso 2 — Activa al villano",
        description:
          "El villano se activa una vez por jugador: ataca si estás en forma de héroe, o avanza su plan si estás en alter ego.",
        reason: "Los esbirros enfrentados contigo también atacan en este paso.",
        nextStep: "Resuelve el ataque o el avance del plan antes de seguir.",
      };
    case "DEAL_ENCOUNTER_CARDS":
      return {
        title: "Paso 3 — Reparte cartas de encuentro",
        description:
          "Cada jugador que haya sido atacado recibe boca abajo la carta superior del mazo de encuentro.",
        reason:
          "Las cartas se reparten antes de revelarse, no al mismo tiempo que el ataque.",
        nextStep: "Cuando todos tengan sus cartas, pasa a revelarlas.",
      };
    case "REVEAL_ENCOUNTER_CARDS":
      return {
        title: "Paso 4 — Revela cartas de encuentro",
        description:
          "Cada jugador revela y resuelve, por orden de turno, la carta que ha recibido.",
        reason:
          "El orden de revelado importa cuando varias cartas interactúan entre sí.",
        nextStep: "Resuelve cada carta antes de pasar a la siguiente.",
      };
    case "PASS_FIRST_PLAYER":
      return {
        title: "Paso 5 — Pasa el testigo y termina la ronda",
        description:
          "El testigo de primer jugador pasa al siguiente jugador en sentido horario.",
        reason: "Esto determina quién actúa primero en la siguiente ronda.",
        nextStep: "Empieza una nueva ronda, en la fase de jugador.",
      };
  }
}
