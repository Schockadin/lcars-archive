// Gemeinsame Konstante für den Tabellen-Explorer. Bewusst KEINE
// "use server"-Datei: die Server-Action (tableExplorerActions.ts) darf nur
// async-Funktionen exportieren, kann eine Zahl-Konstante also nicht selbst
// bereitstellen. Sowohl die Action (LIMIT/OFFSET-Slicing) als auch das
// Client-Modul (Seitenzahl-Berechnung) importieren die Größe hier, damit
// beide Seiten garantiert denselben Wert verwenden.
export const TABLE_PAGE_SIZE = 30;
