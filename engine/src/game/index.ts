export const ping = () => "engine ok";
export { createSpiderManVsRhinoGame } from "./createGame";
export {
  serializeGameState,
  deserializeGameState,
} from "../persistence/serialize";
export type { GameState } from "../domain/types";
