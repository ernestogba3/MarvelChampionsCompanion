import type { GameState } from "../domain/types.js";
import type { GameEvent } from "../events/types.js";
export function resolveVillainActivation(
  state: GameState,
  playerId: string,
): { state: GameState; events: GameEvent[] } {
  const events: GameEvent[] = [];
  const player = state.players.find((p) => p.id === playerId);
  if (!player) {
    throw new Error(`Jugador no encontrado: ${playerId}`);
  }
  if (player.form === "HERO") {
    const amount = state.villain.attack;
    const newPlayers = state.players.map((p) =>
      p.id === playerId ? { ...p, health: Math.max(0, p.health - amount) } : p,
    );
    events.push({ type: "VILLAIN_ATTACKED", playerId, amount });
    return {
      state: {
        ...state,
        players: newPlayers,
        pendingEncounterDeals: [...state.pendingEncounterDeals, playerId],
      },
      events,
    };
  }
  const mainScheme = state.schemes.find((s) => s.isMain);
  if (!mainScheme) {
    throw new Error("No hay plan principal en esta partida");
  }
  const amount = state.villain.scheme;
  const newSchemes = state.schemes.map((s) =>
    s.id === mainScheme.id ? { ...s, threat: s.threat + amount } : s,
  );
  events.push({ type: "VILLAIN_SCHEMED", schemeId: mainScheme.id, amount });
  return { state: { ...state, schemes: newSchemes }, events };
}
