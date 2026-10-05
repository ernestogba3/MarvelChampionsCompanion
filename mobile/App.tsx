import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  createSpiderManVsRhinoGame,
  serializeGameState,
  deserializeGameState,
} from "engine";
import type { GameState } from "engine";
import { initDatabase, saveGame, loadGame } from "./storage/gameStorage";
export default function App() {
  const [state, setState] = useState<GameState | null>(null);
  const [source, setSource] = useState<"nueva" | "guardada" | null>(null);
  useEffect(() => {
    async function bootstrap() {
      await initDatabase();
      const saved = await loadGame();
      if (saved) {
        setState(deserializeGameState(saved));
        setSource("guardada");
      } else {
        const fresh = createSpiderManVsRhinoGame("player-1");
        await saveGame(serializeGameState(fresh));
        setState(fresh);
        setSource("nueva");
      }
    }
    bootstrap();
  }, []);
  if (!state) {
    return (
      <View style={styles.container}>
        {" "}
        <Text>Cargando partida...</Text>{" "}
      </View>
    );
  }
  return (
    <View style={styles.container}>
      {" "}
      <Text>Partida {source}</Text> <Text>Ronda {state.round}</Text>{" "}
      <Text>
        {" "}
        Rino: {state.villain.health} / {state.villain.maxHealth}{" "}
      </Text>{" "}
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
});
