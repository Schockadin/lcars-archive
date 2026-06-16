import { useContext } from "react";
import { NeoContext, NeoContextValue } from "./NeoContext";

export function useNeo(): NeoContextValue {
  const context = useContext(NeoContext);

  if (context === undefined) {
    throw new Error(
      "useNeo() muss innerhalb von <NeoProvider> aufgerufen werden.",
    );
  }

  return context;
}
