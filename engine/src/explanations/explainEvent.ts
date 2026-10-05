import type { GameEvent } from "../events/types";
import type { GameState } from "../domain/types";
import type { RuleExplanation } from "./types";
export function explainEvent(event: GameEvent): RuleExplanation {
  switch (event.type) {
    case "ROUND_STARTED":
      return {
        title: "Nueva ronda",
        description: `Comienza la ronda ${event.round}.`,
        reason:
          "Cada ronda se divide en una fase de jugador y una fase del villano.",
        nextStep: "Resuelve tu turno en la fase de jugador.",
      };
    case "PHASE_CHANGED":
      if (event.to.name === "VILLAIN_PHASE") {
        return {
          title: "Fase del villano",
          description: "La partida pasa a la fase del villano.",
          reason:
            "Después de que todos los jugadores completen su turno, actúa el villano.",
          nextStep: "Añade la amenaza del Paso 1.",
        };
      }
      return {
        title: "Fase de jugador",
        description: "Empieza una nueva fase de jugador.",
        reason: "Tras terminar la fase del villano, la ronda vuelve a empezar.",
        nextStep: "Juega tu turno.",
      };
    case "THREAT_ADDED":
      return {
        title: "Amenaza añadida",
        description: `Se añaden ${event.amount} de amenaza al plan.`,
        reason:
          "La amenaza mide lo cerca que está el villano de completar su plan.",
        nextStep:
          "Si el plan llega a su umbral, los jugadores pierden la partida.",
      };
    case "DAMAGE_DEALT":
      return {
        title: "Daño infligido",
        description: `${event.source} inflige ${event.amount} de daño.`,
        reason: "El daño reduce la vida del objetivo, sin bajar nunca de 0.",
      };
    case "HEALTH_HEALED":
      return {
        title: "Curación",
        description: `${event.source} cura ${event.amount} de daño.`,
        reason: "La curación nunca sube la vida por encima del máximo.",
      };
    case "VILLAIN_ATTACKED":
      return {
        title: "El villano ataca",
        description: `El villano ataca, infligiendo ${event.amount} de daño.`,
        reason:
          "El villano ataca cuando el jugador activado está en forma de héroe.",
        nextStep:
          "El jugador atacado recibe una carta de encuentro boca abajo.",
      };
    case "VILLAIN_SCHEMED":
      return {
        title: "El villano avanza su plan",
        description: `El villano añade ${event.amount} de amenaza a su plan.`,
        reason:
          "El villano avanza su plan cuando el jugador activado está en alter ego, en vez de atacar.",
      };
    case "ENCOUNTER_CARD_DEALT":
      return {
        title: "Carta de encuentro repartida",
        description: "El jugador recibe una carta de encuentro boca abajo.",
        reason:
          "Cada vez que un jugador es atacado, recibe una carta de encuentro.",
        nextStep: "Esta carta se revelará en el Paso 4 de la fase del villano.",
      };
    case "VILLAIN_STAGE_CHANGED":
      return {
        title: "El villano cambia de etapa",
        description: `El villano pasa de la etapa ${event.from} a la etapa ${event.to}.`,
        reason:
          "Al ser derrotada una etapa, el villano pasa a la siguiente, normalmente más fuerte.",
      };
    case "SIDE_SCHEME_ENTERED":
      return {
        title: "Nuevo plan secundario",
        description: `Entra en juego el plan secundario "${event.name}".`,
        reason:
          "Algunos efectos introducen nuevos planes secundarios durante la partida.",
      };
    case "STATUS_GAINED":
      if (event.status === "TOUGH") {
        return {
          title: "Dureza",
          description: `${event.targetId === "villain" ? "Rino" : "El jugador"} recibe un estado de dureza.`,
          reason:
            "Mientras tenga dureza, el primer punto de daño que recibiría se absorbe en vez de aplicarse.",
        };
      }
      return {
        title: "Aturdido",
        description: `${event.targetId === "villain" ? "Rino" : "El jugador"} queda aturdido.`,
        reason:
          "Un personaje aturdido pierde ciertas acciones hasta que se recupera.",
      };
    case "STATUS_REMOVED":
      return {
        title: "Estado eliminado",
        description: `${event.targetId === "villain" ? "Rino" : "El jugador"} deja de tener ${event.status === "TOUGH" ? "dureza" : "aturdimiento"}.`,
        reason:
          "Los estados se eliminan al cumplirse su condición o al consumirse.",
      };
    case "CARD_GAINED_SURGE":
      return {
        title: "Oleada",
        description: `"${event.cardName}" gana oleada.`,
        reason:
          "Cuando una carta gana oleada, se revela inmediatamente una carta de encuentro adicional.",
        nextStep: "Revela la siguiente carta del mazo de encuentro.",
      };
    case "UPGRADE_DISCARDED":
      return {
        title: "Mejora descartada",
        description: "Se descarta una mejora que el jugador tenía en juego.",
        reason:
          "Algunos efectos obligan a descartar un upgrade o support que controles.",
      };
    case "DAMAGE_REDIRECTED":
      return {
        title: "Daño redirigido",
        description: `${event.amount} de daño se redirige a un accesorio del villano.`,
        reason:
          "Mientras ese accesorio esté en juego, absorbe el daño que recibiría el villano en su lugar.",
      };
    case "ATTACHMENT_DISCARDED":
      return {
        title: "Accesorio descartado",
        description: "Se descarta un accesorio del villano.",
        reason:
          "El accesorio se descarta al cumplir su condición: daño acumulado, o haberse usado una vez.",
      };
    default:
      return {
        title: "Evento",
        description: "Ha ocurrido algo en la partida.",
        reason:
          "Este tipo de evento todavía no tiene una explicación específica.",
      };
  }
}
export function explainRecentEvents(
  state: GameState,
  n: number,
): RuleExplanation[] {
  return state.eventLog.slice(-n).map(explainEvent);
}
