import type { GameState } from "../domain/types";
import type { GameEvent } from "./types";
export function appendToLog(state: GameState, events: GameEvent[]): GameState {
  return { ...state, eventLog: [...state.eventLog, ...events] };
}
export function runAndLog<Args extends unknown[]>(
  resolver: (
    state: GameState,
    ...args: Args
  ) => { state: GameState; events: GameEvent[] },
  state: GameState,
  ...args: Args
): { state: GameState; events: GameEvent[] } {
  const result = resolver(state, ...args);
  const loggedState = appendToLog(result.state, result.events);
  return { state: loggedState, events: result.events };
}
