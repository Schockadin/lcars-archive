import { useContext } from "react";
import { EditContext, EditContextValue } from "@/context/EditContext";

export function useEdit(): EditContextValue {
  const context = useContext(EditContext);

  if (context === undefined) {
    throw new Error(
      "useEdit() muss innerhalb von <EditProvider> aufgerufen werden.",
    );
  }

  return context;
}
