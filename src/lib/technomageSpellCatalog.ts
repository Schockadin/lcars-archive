import type { TechnomageSchool } from "@/types/characterStats";
export { technomageSpellSlotTotal } from "@/lib/technomageSpellSlots";

export const TECHNOMAGE_SCHOOLS = [
  { id: "defence", label: "Abwehr", original: "Defence" },
  { id: "elements", label: "Elemente", original: "Elements" },
  { id: "conjuration", label: "Beschwörung", original: "Conjuration" },
  { id: "movement", label: "Bewegung", original: "Movement" },
  { id: "healing", label: "Heilung", original: "Healing" },
  { id: "enhancement", label: "Verstärkung", original: "Enhancement" },
  { id: "creation", label: "Erschaffung", original: "Creation" },
] as const;

export type TechnomageEffect =
  | "attack"
  | "concealment"
  | "crafting"
  | "creation"
  | "defence"
  | "enhancement"
  | "healing"
  | "illusion"
  | "manipulation"
  | "movement"
  | "perception"
  | "protection"
  | "summoning"
  | "utility";

export interface TechnomageSpell {
  id: string;
  name: string;
  school: TechnomageSchool;
  requirements: string;
  sourceMageryDc: number | null;
  sourceRange: string | null;
  sourceTarget: string | null;
  sourceDuration: string | null;
  elementalCategory: string | null;
  sourcePage: number;
  effect: TechnomageEffect;
}

export const TECHNOMAGE_SPELLS = [
  {
    "id": "armour-lesser",
    "name": "Armour, Lesser",
    "school": "defence",
    "requirements": "None",
    "sourceMageryDc": 14,
    "sourceRange": "Touch",
    "sourceTarget": "One creature",
    "sourceDuration": "1 hour",
    "elementalCategory": null,
    "sourcePage": 45,
    "effect": "protection"
  },
  {
    "id": "armour",
    "name": "Armour",
    "school": "defence",
    "requirements": "Lesser Armour",
    "sourceMageryDc": 18,
    "sourceRange": "Touch",
    "sourceTarget": "One creature",
    "sourceDuration": "1 hour",
    "elementalCategory": null,
    "sourcePage": 45,
    "effect": "protection"
  },
  {
    "id": "armour-greater",
    "name": "Armour, Greater",
    "school": "defence",
    "requirements": "Armour",
    "sourceMageryDc": 22,
    "sourceRange": "Touch",
    "sourceTarget": "One creature",
    "sourceDuration": "1 hour",
    "elementalCategory": null,
    "sourcePage": 45,
    "effect": "protection"
  },
  {
    "id": "blurry-image",
    "name": "Blurry Image",
    "school": "defence",
    "requirements": "Personal Shield",
    "sourceMageryDc": 16,
    "sourceRange": "Self",
    "sourceTarget": "Self",
    "sourceDuration": "3 rounds (weak), 5 rounds (standard), 8 rounds (primary)",
    "elementalCategory": null,
    "sourcePage": 45,
    "effect": "concealment"
  },
  {
    "id": "bubble-of-air",
    "name": "Bubble of Air",
    "school": "defence",
    "requirements": "Personal Shield",
    "sourceMageryDc": 14,
    "sourceRange": "Medium",
    "sourceTarget": "One creature, object or location",
    "sourceDuration": "1 minute (1 round underwater or in a vacuum)",
    "elementalCategory": null,
    "sourcePage": 46,
    "effect": "protection"
  },
  {
    "id": "bubble-of-air-greater",
    "name": "Bubble of Air, Greater",
    "school": "defence",
    "requirements": "Bubble of Air",
    "sourceMageryDc": 19,
    "sourceRange": "Medium",
    "sourceTarget": "One creature, object or location",
    "sourceDuration": "1 minute",
    "elementalCategory": null,
    "sourcePage": 46,
    "effect": "protection"
  },
  {
    "id": "bubble-of-air-group",
    "name": "Bubble of Air, Group",
    "school": "defence",
    "requirements": "Bubble of Air",
    "sourceMageryDc": 21,
    "sourceRange": "Close",
    "sourceTarget": "One creature, object or location",
    "sourceDuration": "1 minute (1 round underwater or in a vacuum)",
    "elementalCategory": null,
    "sourcePage": 46,
    "effect": "protection"
  },
  {
    "id": "elemental-resistance-lesser",
    "name": "Elemental Resistance, Lesser",
    "school": "defence",
    "requirements": "Lesser Armour, Create Fire/Ice/Acid/Lightning/ Sound (at least one)",
    "sourceMageryDc": 14,
    "sourceRange": "Touch",
    "sourceTarget": "Creature touched",
    "sourceDuration": "10 minutes",
    "elementalCategory": null,
    "sourcePage": 46,
    "effect": "protection"
  },
  {
    "id": "elemental-resistance",
    "name": "Elemental Resistance",
    "school": "defence",
    "requirements": "Lesser Elemental Resistance",
    "sourceMageryDc": 17,
    "sourceRange": "Touch",
    "sourceTarget": "Creature touched",
    "sourceDuration": "10 minutes",
    "elementalCategory": null,
    "sourcePage": 47,
    "effect": "protection"
  },
  {
    "id": "elemental-resistance-greater",
    "name": "Elemental Resistance, Greater",
    "school": "defence",
    "requirements": "Elemental Resistance",
    "sourceMageryDc": 21,
    "sourceRange": "Touch",
    "sourceTarget": "Creature touched",
    "sourceDuration": "10 minutes",
    "elementalCategory": null,
    "sourcePage": 47,
    "effect": "protection"
  },
  {
    "id": "force-wall-small",
    "name": "Force Wall, Small",
    "school": "defence",
    "requirements": "Lesser Armour",
    "sourceMageryDc": 15,
    "sourceRange": "Close",
    "sourceTarget": "Two adjacent 5-foot squares",
    "sourceDuration": "10 minutes",
    "elementalCategory": null,
    "sourcePage": 47,
    "effect": "protection"
  },
  {
    "id": "force-wall-medium",
    "name": "Force Wall, Medium",
    "school": "defence",
    "requirements": "Small Force Wall",
    "sourceMageryDc": 18,
    "sourceRange": "Close",
    "sourceTarget": "Three adjacent 5-foot squares in a straight line",
    "sourceDuration": "10 minutes",
    "elementalCategory": null,
    "sourcePage": 47,
    "effect": "protection"
  },
  {
    "id": "force-wall-large",
    "name": "Force Wall, Large",
    "school": "defence",
    "requirements": "Medium Force Wall",
    "sourceMageryDc": 22,
    "sourceRange": "Close",
    "sourceTarget": "Four adjacent 5-foot squares in either a straight line or a square",
    "sourceDuration": "10 minutes",
    "elementalCategory": null,
    "sourcePage": 47,
    "effect": "protection"
  },
  {
    "id": "invisibility",
    "name": "Invisibility",
    "school": "defence",
    "requirements": "Greater Personal Shield, Blurry Image",
    "sourceMageryDc": 24,
    "sourceRange": "Self",
    "sourceTarget": "Self",
    "sourceDuration": "1 round",
    "elementalCategory": null,
    "sourcePage": 48,
    "effect": "concealment"
  },
  {
    "id": "invisibility-greater",
    "name": "Invisibility, Greater",
    "school": "defence",
    "requirements": "Greater Armour, Invisibility",
    "sourceMageryDc": 28,
    "sourceRange": "Self",
    "sourceTarget": "Self",
    "sourceDuration": "1 round",
    "elementalCategory": null,
    "sourcePage": 48,
    "effect": "concealment"
  },
  {
    "id": "invisibility-group",
    "name": "Invisibility, Group",
    "school": "defence",
    "requirements": "Greater Group Shield, Invisibility",
    "sourceMageryDc": 32,
    "sourceRange": "Self",
    "sourceTarget": "See below",
    "sourceDuration": "1 round",
    "elementalCategory": null,
    "sourcePage": 48,
    "effect": "concealment"
  },
  {
    "id": "shield-group-lesser",
    "name": "Shield, Group, Lesser",
    "school": "defence",
    "requirements": "Lesser Personal Shield",
    "sourceMageryDc": 18,
    "sourceRange": "5-foot radius centred on self",
    "sourceTarget": "Self",
    "sourceDuration": "1 minute",
    "elementalCategory": null,
    "sourcePage": 48,
    "effect": "protection"
  },
  {
    "id": "shield-group",
    "name": "Shield, Group",
    "school": "defence",
    "requirements": "Personal Shield, Lesser Group Shield",
    "sourceMageryDc": 21,
    "sourceRange": "5-foot radius centred on self",
    "sourceTarget": "Self",
    "sourceDuration": "1 minute",
    "elementalCategory": null,
    "sourcePage": 48,
    "effect": "protection"
  },
  {
    "id": "shield-group-greater",
    "name": "Shield, Group, Greater",
    "school": "defence",
    "requirements": "Greater Personal Shield, Group Shield",
    "sourceMageryDc": 21,
    "sourceRange": "5-foot radius centred on self",
    "sourceTarget": "Self",
    "sourceDuration": "1 minute",
    "elementalCategory": null,
    "sourcePage": 49,
    "effect": "protection"
  },
  {
    "id": "shield-flexible-lesser",
    "name": "Shield, Flexible, Lesser",
    "school": "defence",
    "requirements": "Greater Personal Shield, Defence as a primary aptitude",
    "sourceMageryDc": 23,
    "sourceRange": "Self",
    "sourceTarget": "Self",
    "sourceDuration": "1 minute",
    "elementalCategory": null,
    "sourcePage": 49,
    "effect": "protection"
  },
  {
    "id": "shield-flexible",
    "name": "Shield, Flexible",
    "school": "defence",
    "requirements": "Lesser Flexible Shield",
    "sourceMageryDc": 28,
    "sourceRange": "Self",
    "sourceTarget": "Self",
    "sourceDuration": "1 minute",
    "elementalCategory": null,
    "sourcePage": 49,
    "effect": "protection"
  },
  {
    "id": "shield-flexible-greater",
    "name": "Shield, Flexible, Greater",
    "school": "defence",
    "requirements": "Flexible Shield",
    "sourceMageryDc": 32,
    "sourceRange": "5-foot radius around the caster",
    "sourceTarget": "Self",
    "sourceDuration": "1 minute",
    "elementalCategory": null,
    "sourcePage": 49,
    "effect": "protection"
  },
  {
    "id": "shield-flexible-total",
    "name": "Shield, Flexible, Total",
    "school": "defence",
    "requirements": "Greater Flexible Shield",
    "sourceMageryDc": 36,
    "sourceRange": "10-foot radius around the caster",
    "sourceTarget": "Self",
    "sourceDuration": "1 minute",
    "elementalCategory": null,
    "sourcePage": 50,
    "effect": "protection"
  },
  {
    "id": "shield-personal-lesser",
    "name": "Shield, Personal, Lesser",
    "school": "defence",
    "requirements": "Lesser Armour",
    "sourceMageryDc": 14,
    "sourceRange": "Touch",
    "sourceTarget": "One creature",
    "sourceDuration": "1 hour",
    "elementalCategory": null,
    "sourcePage": 50,
    "effect": "protection"
  },
  {
    "id": "shield-personal",
    "name": "Shield, Personal",
    "school": "defence",
    "requirements": "Lesser Personal Shield, Armour",
    "sourceMageryDc": 18,
    "sourceRange": "Touch",
    "sourceTarget": "One creature",
    "sourceDuration": "1 hour",
    "elementalCategory": null,
    "sourcePage": 50,
    "effect": "protection"
  },
  {
    "id": "shield-personal-greater",
    "name": "Shield, Personal, Greater",
    "school": "defence",
    "requirements": "Personal Shield, Greater Armour",
    "sourceMageryDc": 24,
    "sourceRange": "Touch",
    "sourceTarget": "One creature",
    "sourceDuration": "1 hour",
    "elementalCategory": null,
    "sourcePage": 50,
    "effect": "protection"
  },
  {
    "id": "shield-vehicular-small",
    "name": "Shield, Vehicular, Small",
    "school": "defence",
    "requirements": "Group Shield",
    "sourceMageryDc": 20,
    "sourceRange": "Touch",
    "sourceTarget": "One vehicle of Huge size or smaller",
    "sourceDuration": "1 minute",
    "elementalCategory": null,
    "sourcePage": 50,
    "effect": "protection"
  },
  {
    "id": "shield-vehicular-large",
    "name": "Shield, Vehicular, Large",
    "school": "defence",
    "requirements": "Greater Group Shield, Small Vehicular Shield",
    "sourceMageryDc": 24,
    "sourceRange": "Touch",
    "sourceTarget": "One vehicle of Gargantuan size or smaller",
    "sourceDuration": "1 minute",
    "elementalCategory": null,
    "sourcePage": 51,
    "effect": "protection"
  },
  {
    "id": "shield-vehicular-starship",
    "name": "Shield, Vehicular, Starship",
    "school": "defence",
    "requirements": "Large Vehicular Shield",
    "sourceMageryDc": 28,
    "sourceRange": "Touch",
    "sourceTarget": "One vehicle of Colossal size or smaller",
    "sourceDuration": "1 minute",
    "elementalCategory": null,
    "sourcePage": 51,
    "effect": "protection"
  },
  {
    "id": "skin-of-wood",
    "name": "Skin of Wood",
    "school": "defence",
    "requirements": "Minor Elemental Resistance",
    "sourceMageryDc": 14,
    "sourceRange": "Touch",
    "sourceTarget": "One creature",
    "sourceDuration": "1 minute",
    "elementalCategory": null,
    "sourcePage": 51,
    "effect": "protection"
  },
  {
    "id": "skin-of-bronze",
    "name": "Skin of Bronze",
    "school": "defence",
    "requirements": "Standard Elemental Resistance, Skin of Wood",
    "sourceMageryDc": 19,
    "sourceRange": "Touch",
    "sourceTarget": "One creature",
    "sourceDuration": "1 minute",
    "elementalCategory": null,
    "sourcePage": 51,
    "effect": "protection"
  },
  {
    "id": "skin-of-iron",
    "name": "Skin of Iron",
    "school": "defence",
    "requirements": "Greater Elemental Resistance, Skin of Bronze",
    "sourceMageryDc": 25,
    "sourceRange": "Touch",
    "sourceTarget": "One creature",
    "sourceDuration": "1 minute",
    "elementalCategory": null,
    "sourcePage": 51,
    "effect": "protection"
  },
  {
    "id": "skin-of-diamond",
    "name": "Skin of Diamond",
    "school": "defence",
    "requirements": "Skin of Iron",
    "sourceMageryDc": 30,
    "sourceRange": "Touch",
    "sourceTarget": "One creature",
    "sourceDuration": "1 minute",
    "elementalCategory": null,
    "sourcePage": 51,
    "effect": "protection"
  },
  {
    "id": "acid-ball",
    "name": "Acid Ball",
    "school": "elements",
    "requirements": "Acid Blob",
    "sourceMageryDc": 19,
    "sourceRange": "Close (Ranged Touch)",
    "sourceTarget": "1 creature",
    "sourceDuration": "Instantaneous",
    "elementalCategory": "Acid",
    "sourcePage": 52,
    "effect": "attack"
  },
  {
    "id": "acid-ball-greater",
    "name": "Acid Ball, Greater",
    "school": "elements",
    "requirements": "Acid Ball",
    "sourceMageryDc": 25,
    "sourceRange": "Close (Ranged Touch)",
    "sourceTarget": "1 creature",
    "sourceDuration": "Instantaneous",
    "elementalCategory": "Acid",
    "sourcePage": 52,
    "effect": "attack"
  },
  {
    "id": "acid-blob",
    "name": "Acid Blob",
    "school": "elements",
    "requirements": "Create Acid",
    "sourceMageryDc": 17,
    "sourceRange": "Touch or Close (Ranged Touch)",
    "sourceTarget": "1 object",
    "sourceDuration": "1 round",
    "elementalCategory": "Acid",
    "sourcePage": 53,
    "effect": "attack"
  },
  {
    "id": "acid-coat",
    "name": "Acid Coat",
    "school": "elements",
    "requirements": "Acid Blob",
    "sourceMageryDc": 21,
    "sourceRange": "Touch",
    "sourceTarget": "1 creature",
    "sourceDuration": "5 rounds",
    "elementalCategory": "Acid",
    "sourcePage": 53,
    "effect": "attack"
  },
  {
    "id": "acid-rain",
    "name": "Acid Rain",
    "school": "elements",
    "requirements": "Greater Acid Ball, Acid Spray",
    "sourceMageryDc": 33,
    "sourceRange": "Medium",
    "sourceTarget": "20-foot radius",
    "sourceDuration": "1 round",
    "elementalCategory": "Acid",
    "sourcePage": 53,
    "effect": "attack"
  },
  {
    "id": "acid-spray",
    "name": "Acid Spray",
    "school": "elements",
    "requirements": "Acid Ball",
    "sourceMageryDc": 26,
    "sourceRange": "Close",
    "sourceTarget": "Cone-shaped burst",
    "sourceDuration": "Instantaneous",
    "elementalCategory": "Acid",
    "sourcePage": 53,
    "effect": "attack"
  },
  {
    "id": "blizzard",
    "name": "Blizzard",
    "school": "elements",
    "requirements": "Snowfall",
    "sourceMageryDc": 30,
    "sourceRange": "Long",
    "sourceTarget": "50-foot radius square",
    "sourceDuration": "1 minute",
    "elementalCategory": "Cold",
    "sourcePage": 53,
    "effect": "attack"
  },
  {
    "id": "control-conflagration",
    "name": "Control Conflagration",
    "school": "elements",
    "requirements": "Control Flame",
    "sourceMageryDc": 23,
    "sourceRange": "Close",
    "sourceTarget": "Up to five 5-foot squares of flames (4 for weak aptitudes, 6 for primaries)",
    "sourceDuration": "1 round",
    "elementalCategory": "Fire",
    "sourcePage": 54,
    "effect": "manipulation"
  },
  {
    "id": "control-flame",
    "name": "Control Flame",
    "school": "elements",
    "requirements": "Create Fire",
    "sourceMageryDc": 16,
    "sourceRange": "Close",
    "sourceTarget": "One 5-foot square of flames",
    "sourceDuration": "1 round",
    "elementalCategory": "Fire",
    "sourcePage": 54,
    "effect": "manipulation"
  },
  {
    "id": "create-acid",
    "name": "Create Acid",
    "school": "elements",
    "requirements": "None",
    "sourceMageryDc": 14,
    "sourceRange": "Touch",
    "sourceTarget": "Self (fingertip)",
    "sourceDuration": "1 round",
    "elementalCategory": "Acid",
    "sourcePage": 54,
    "effect": "manipulation"
  },
  {
    "id": "create-fire",
    "name": "Create Fire",
    "school": "elements",
    "requirements": "None",
    "sourceMageryDc": 14,
    "sourceRange": "Touch",
    "sourceTarget": "Self (hand or fingertip)",
    "sourceDuration": "1 minute",
    "elementalCategory": "Fire",
    "sourcePage": 54,
    "effect": "manipulation"
  },
  {
    "id": "create-ice",
    "name": "Create Ice",
    "school": "elements",
    "requirements": "None",
    "sourceMageryDc": 14,
    "sourceRange": "Touch",
    "sourceTarget": "Self (hand)",
    "sourceDuration": "Instantaneous",
    "elementalCategory": "Cold",
    "sourcePage": 55,
    "effect": "manipulation"
  },
  {
    "id": "create-lightning",
    "name": "Create Lightning",
    "school": "elements",
    "requirements": "None",
    "sourceMageryDc": 14,
    "sourceRange": "Touch",
    "sourceTarget": "Self (hand or fingers)",
    "sourceDuration": "1 minute",
    "elementalCategory": "Electricity",
    "sourcePage": 55,
    "effect": "manipulation"
  },
  {
    "id": "create-sound",
    "name": "Create Sound",
    "school": "elements",
    "requirements": "None",
    "sourceMageryDc": 14,
    "sourceRange": "Close",
    "sourceTarget": "Self (mouth)",
    "sourceDuration": "1 round",
    "elementalCategory": "Sonic",
    "sourcePage": 55,
    "effect": "manipulation"
  },
  {
    "id": "deafen",
    "name": "Deafen",
    "school": "elements",
    "requirements": "Create Sound",
    "sourceMageryDc": 19,
    "sourceRange": "Close",
    "sourceTarget": "All creatures within range",
    "sourceDuration": "Instantaneous",
    "elementalCategory": "Sonic",
    "sourcePage": 55,
    "effect": "manipulation"
  },
  {
    "id": "destruction",
    "name": "Destruction",
    "school": "elements",
    "requirements": "At least 15 other chaos spells, Elements as a primary aptitude, at least one level of the Destroyer prestige class",
    "sourceMageryDc": 24,
    "sourceRange": "Medium",
    "sourceTarget": "One five-foot diameter sphere",
    "sourceDuration": "Instantaneous",
    "elementalCategory": "None",
    "sourcePage": 56,
    "effect": "attack"
  },
  {
    "id": "destruction-greater",
    "name": "Destruction, Greater",
    "school": "elements",
    "requirements": "Destruction, at least 20 chaos spells, at least 5th level in the Destroyer prestige class",
    "sourceMageryDc": 32,
    "sourceRange": "Long",
    "sourceTarget": "One five-foot radius sphere",
    "sourceDuration": "Instantaneous",
    "elementalCategory": "None",
    "sourcePage": 56,
    "effect": "attack"
  },
  {
    "id": "destruction-total",
    "name": "Destruction, Total",
    "school": "elements",
    "requirements": "Greater Destruction, at least 25 chaos spells, 10th level in the Destroyer prestige class",
    "sourceMageryDc": 40,
    "sourceRange": "Line of Sight",
    "sourceTarget": "One ten-foot radius sphere",
    "sourceDuration": "Instantaneous",
    "elementalCategory": "None",
    "sourcePage": 56,
    "effect": "attack"
  },
  {
    "id": "douse-flame",
    "name": "Douse Flame",
    "school": "elements",
    "requirements": "Control Flame",
    "sourceMageryDc": 19,
    "sourceRange": "Long",
    "sourceTarget": "15-foot radius (weakness 10-foot, primary 20-foot)",
    "sourceDuration": "1 round",
    "elementalCategory": "Fire",
    "sourcePage": 56,
    "effect": "manipulation"
  },
  {
    "id": "elemental-storm",
    "name": "Elemental Storm",
    "school": "elements",
    "requirements": "Winter Storm, Thunderbolt, Napalm Burst, Elements as a primary school",
    "sourceMageryDc": 45,
    "sourceRange": "Line of Sight",
    "sourceTarget": "100-foot radius sphere",
    "sourceDuration": "1 minute",
    "elementalCategory": "All",
    "sourcePage": 56,
    "effect": "attack"
  },
  {
    "id": "fireball",
    "name": "Fireball",
    "school": "elements",
    "requirements": "Control Flame",
    "sourceMageryDc": 18,
    "sourceRange": "Close (Ranged Touch)",
    "sourceTarget": "One creature",
    "sourceDuration": "Instantaneous",
    "elementalCategory": "Fire",
    "sourcePage": 57,
    "effect": "attack"
  },
  {
    "id": "fireball-greater",
    "name": "Fireball, Greater",
    "school": "elements",
    "requirements": "Control Conflagration, Fireball",
    "sourceMageryDc": 23,
    "sourceRange": "Close (Ranged Touch)",
    "sourceTarget": "One creature",
    "sourceDuration": "Instantaneous",
    "elementalCategory": "Fire",
    "sourcePage": 57,
    "effect": "attack"
  },
  {
    "id": "fireball-explosive",
    "name": "Fireball, Explosive",
    "school": "elements",
    "requirements": "Greater Fireball",
    "sourceMageryDc": 25,
    "sourceRange": "Medium",
    "sourceTarget": "10-foot radius (weakness 5-foot, primary 15-foot)",
    "sourceDuration": "Instantaneous",
    "elementalCategory": "Fire",
    "sourcePage": 57,
    "effect": "attack"
  },
  {
    "id": "fireball-artillery",
    "name": "Fireball, Artillery",
    "school": "elements",
    "requirements": "Explosive Fireball",
    "sourceMageryDc": 30,
    "sourceRange": "Long to line of sight only",
    "sourceTarget": "10-foot radius (weakness 5-foot, primary 15-foot)",
    "sourceDuration": "1 round",
    "elementalCategory": "Fire",
    "sourcePage": 57,
    "effect": "attack"
  },
  {
    "id": "freezing-touch",
    "name": "Freezing Touch",
    "school": "elements",
    "requirements": "Ice Bolt",
    "sourceMageryDc": 20,
    "sourceRange": "Touch",
    "sourceTarget": "1 creature",
    "sourceDuration": "1 round",
    "elementalCategory": "Cold",
    "sourcePage": 58,
    "effect": "attack"
  },
  {
    "id": "hailstorm",
    "name": "Hailstorm",
    "school": "elements",
    "requirements": "Snowfall",
    "sourceMageryDc": 20,
    "sourceRange": "Long",
    "sourceTarget": "10-foot radius square",
    "sourceDuration": "1 round",
    "elementalCategory": "Cold",
    "sourcePage": 58,
    "effect": "attack"
  },
  {
    "id": "ice-bolt",
    "name": "Ice Bolt",
    "school": "elements",
    "requirements": "Create Ice",
    "sourceMageryDc": 19,
    "sourceRange": "Medium (Ranged Touch)",
    "sourceTarget": "1 creature",
    "sourceDuration": "Instantaneous",
    "elementalCategory": "Cold",
    "sourcePage": 58,
    "effect": "attack"
  },
  {
    "id": "ice-bolt-greater",
    "name": "Ice Bolt, Greater",
    "school": "elements",
    "requirements": "Ice Bolt",
    "sourceMageryDc": 24,
    "sourceRange": "Medium (Ranged Touch)",
    "sourceTarget": "1 creature",
    "sourceDuration": "Instantaneous",
    "elementalCategory": "Cold",
    "sourcePage": 59,
    "effect": "attack"
  },
  {
    "id": "ice-shards",
    "name": "Ice Shards",
    "school": "elements",
    "requirements": "Create Ice",
    "sourceMageryDc": 25,
    "sourceRange": "Close",
    "sourceTarget": "Cone extending from the mage’s hand",
    "sourceDuration": "1 round",
    "elementalCategory": "Cold",
    "sourcePage": 59,
    "effect": "attack"
  },
  {
    "id": "icy-surface",
    "name": "Icy Surface",
    "school": "elements",
    "requirements": "Create Ice",
    "sourceMageryDc": 17,
    "sourceRange": "Medium",
    "sourceTarget": "10-foot radius square",
    "sourceDuration": "1 minute",
    "elementalCategory": "Cold",
    "sourcePage": 59,
    "effect": "attack"
  },
  {
    "id": "icy-item",
    "name": "Icy Item",
    "school": "elements",
    "requirements": "Icy Surface",
    "sourceMageryDc": 18,
    "sourceRange": "Medium",
    "sourceTarget": "One item or object no larger than Medium size",
    "sourceDuration": "1 round",
    "elementalCategory": "Cold",
    "sourcePage": 59,
    "effect": "attack"
  },
  {
    "id": "lightning-bolt",
    "name": "Lightning Bolt",
    "school": "elements",
    "requirements": "Greater Surge",
    "sourceMageryDc": 21,
    "sourceRange": "Long",
    "sourceTarget": "1 creature",
    "sourceDuration": "Instantaneous",
    "elementalCategory": "Electricity",
    "sourcePage": 59,
    "effect": "attack"
  },
  {
    "id": "lightning-bolt-chain",
    "name": "Lightning Bolt, Chain",
    "school": "elements",
    "requirements": "Greater Lightning Bolt",
    "sourceMageryDc": 31,
    "sourceRange": "Long",
    "sourceTarget": "Up to 4 creatures (3 for weaknesses, 5 for primaries)",
    "sourceDuration": "Instantaneous",
    "elementalCategory": "Electricity",
    "sourcePage": 60,
    "effect": "attack"
  },
  {
    "id": "lightning-bolt-greater",
    "name": "Lightning Bolt, Greater",
    "school": "elements",
    "requirements": "Lightning Bolt",
    "sourceMageryDc": 26,
    "sourceRange": "Long",
    "sourceTarget": "1 creature",
    "sourceDuration": "Instantaneous",
    "elementalCategory": "Electricity",
    "sourcePage": 60,
    "effect": "attack"
  },
  {
    "id": "mimic-sound",
    "name": "Mimic Sound",
    "school": "elements",
    "requirements": "Create Sound",
    "sourceMageryDc": 21,
    "sourceRange": "Self",
    "sourceTarget": "Self",
    "sourceDuration": "1 round",
    "elementalCategory": "Sonic",
    "sourcePage": 60,
    "effect": "manipulation"
  },
  {
    "id": "napalm-burst",
    "name": "Napalm Burst",
    "school": "elements",
    "requirements": "Explosive Fireball, Acid Spray",
    "sourceMageryDc": 35,
    "sourceRange": "Close",
    "sourceTarget": "Cone extending from the mage’s hand",
    "sourceDuration": "Instantaneous",
    "elementalCategory": "Fire, Acid",
    "sourcePage": 60,
    "effect": "attack"
  },
  {
    "id": "paralysing-arc",
    "name": "Paralysing Arc",
    "school": "elements",
    "requirements": "Lightning Bolt",
    "sourceMageryDc": 25,
    "sourceRange": "Close (Ranged Touch)",
    "sourceTarget": "1 creature",
    "sourceDuration": "1 round",
    "elementalCategory": "Electricity",
    "sourcePage": 61,
    "effect": "attack"
  },
  {
    "id": "power-device",
    "name": "Power Device",
    "school": "elements",
    "requirements": "Create Lightning",
    "sourceMageryDc": 19,
    "sourceRange": "Touch",
    "sourceTarget": "1 object",
    "sourceDuration": "10 minutes",
    "elementalCategory": "Electricity",
    "sourcePage": 61,
    "effect": "manipulation"
  },
  {
    "id": "shatterclap",
    "name": "Shatterclap",
    "school": "elements",
    "requirements": "Sound Burst",
    "sourceMageryDc": 22,
    "sourceRange": "5 feet",
    "sourceTarget": "One creature or object",
    "sourceDuration": "Instantaneous",
    "elementalCategory": "Sonic",
    "sourcePage": 61,
    "effect": "attack"
  },
  {
    "id": "silence",
    "name": "Silence",
    "school": "elements",
    "requirements": "Create Sound",
    "sourceMageryDc": 20,
    "sourceRange": "Touch",
    "sourceTarget": "One creature or object",
    "sourceDuration": "2 rounds",
    "elementalCategory": "Sonic",
    "sourcePage": 61,
    "effect": "manipulation"
  },
  {
    "id": "snowfall",
    "name": "Snowfall",
    "school": "elements",
    "requirements": "Create Ice",
    "sourceMageryDc": 20,
    "sourceRange": "Medium",
    "sourceTarget": "20-foot radius square",
    "sourceDuration": "3 rounds",
    "elementalCategory": "Cold",
    "sourcePage": 62,
    "effect": "attack"
  },
  {
    "id": "sonic-blast",
    "name": "Sonic Blast",
    "school": "elements",
    "requirements": "Sonic Burst",
    "sourceMageryDc": 24,
    "sourceRange": "Medium",
    "sourceTarget": "10-foot radius sphere",
    "sourceDuration": "Instantaneous",
    "elementalCategory": "Sonic",
    "sourcePage": 62,
    "effect": "attack"
  },
  {
    "id": "sonic-burst",
    "name": "Sonic Burst",
    "school": "elements",
    "requirements": "Create Sound",
    "sourceMageryDc": 20,
    "sourceRange": "Close",
    "sourceTarget": "5-foot radius sphere",
    "sourceDuration": "Instantaneous",
    "elementalCategory": "Sonic",
    "sourcePage": 62,
    "effect": "attack"
  },
  {
    "id": "sonic-stun",
    "name": "Sonic Stun",
    "school": "elements",
    "requirements": "Sound Burst",
    "sourceMageryDc": 21,
    "sourceRange": "Close (Ranged Touch)",
    "sourceTarget": "1 creature",
    "sourceDuration": "Instantaneous",
    "elementalCategory": "Sonic",
    "sourcePage": 62,
    "effect": "attack"
  },
  {
    "id": "surge",
    "name": "Surge",
    "school": "elements",
    "requirements": "Create Lightning",
    "sourceMageryDc": 16,
    "sourceRange": "Touch",
    "sourceTarget": "1 creature or object",
    "sourceDuration": "1 round",
    "elementalCategory": "Electricity",
    "sourcePage": 62,
    "effect": "attack"
  },
  {
    "id": "surge-greater",
    "name": "Surge, Greater",
    "school": "elements",
    "requirements": "Surge",
    "sourceMageryDc": 21,
    "sourceRange": "Touch",
    "sourceTarget": "1 creature or object",
    "sourceDuration": "1 round",
    "elementalCategory": "Electricity",
    "sourcePage": 63,
    "effect": "attack"
  },
  {
    "id": "surge-painful",
    "name": "Surge, Painful",
    "school": "elements",
    "requirements": "Surge",
    "sourceMageryDc": 18,
    "sourceRange": "Touch",
    "sourceTarget": "1 creature or object",
    "sourceDuration": "1 round",
    "elementalCategory": "Electricity",
    "sourcePage": 63,
    "effect": "attack"
  },
  {
    "id": "surge-storm",
    "name": "Surge Storm",
    "school": "elements",
    "requirements": "Greater Surge",
    "sourceMageryDc": 27,
    "sourceRange": "Long",
    "sourceTarget": "20-foot radius",
    "sourceDuration": "1 round",
    "elementalCategory": "Electricity",
    "sourcePage": 63,
    "effect": "attack"
  },
  {
    "id": "thunderbolt",
    "name": "Thunderbolt",
    "school": "elements",
    "requirements": "Greater Lightning Bolt, Sonic Blast, Sonic Stun",
    "sourceMageryDc": 35,
    "sourceRange": "Long",
    "sourceTarget": "1 creature",
    "sourceDuration": "Instantaneous",
    "elementalCategory": "Electricity, Sonic",
    "sourcePage": 63,
    "effect": "attack"
  },
  {
    "id": "ventriloquism",
    "name": "Ventriloquism",
    "school": "elements",
    "requirements": "Mimic Sound",
    "sourceMageryDc": 25,
    "sourceRange": "Medium",
    "sourceTarget": "One square",
    "sourceDuration": "1 round",
    "elementalCategory": "Sonic",
    "sourcePage": 63,
    "effect": "manipulation"
  },
  {
    "id": "winter-storm",
    "name": "Winter Storm",
    "school": "elements",
    "requirements": "Blizzard, Surge Storm, Windstorm",
    "sourceMageryDc": 35,
    "sourceRange": "Long",
    "sourceTarget": "50-foot radius sphere",
    "sourceDuration": "1 minute",
    "elementalCategory": "Electricity, Cold",
    "sourcePage": 64,
    "effect": "attack"
  },
  {
    "id": "zone-of-silence",
    "name": "Zone of Silence",
    "school": "elements",
    "requirements": "Silence",
    "sourceMageryDc": 25,
    "sourceRange": "Close",
    "sourceTarget": "20-foot radius sphere",
    "sourceDuration": "1 round",
    "elementalCategory": "Sonic",
    "sourcePage": 64,
    "effect": "attack"
  },
  {
    "id": "conjure-creature-small",
    "name": "Conjure Creature, Small",
    "school": "conjuration",
    "requirements": "Perfect Phantom Image",
    "sourceMageryDc": 23,
    "sourceRange": "Close",
    "sourceTarget": "One unoccupied 5-foot square",
    "sourceDuration": "3 rounds",
    "elementalCategory": null,
    "sourcePage": 64,
    "effect": "summoning"
  },
  {
    "id": "conjure-creature-medium",
    "name": "Conjure Creature, Medium",
    "school": "conjuration",
    "requirements": "Conjure Small Creature",
    "sourceMageryDc": 25,
    "sourceRange": "Close",
    "sourceTarget": "One unoccupied 5-foot square",
    "sourceDuration": "2 rounds",
    "elementalCategory": null,
    "sourcePage": 65,
    "effect": "summoning"
  },
  {
    "id": "conjure-creature-large",
    "name": "Conjure Creature, Large",
    "school": "conjuration",
    "requirements": "Conjure Medium Creature",
    "sourceMageryDc": 28,
    "sourceRange": "Close",
    "sourceTarget": "One unoccupied 5-foot square",
    "sourceDuration": "1 round",
    "elementalCategory": null,
    "sourcePage": 65,
    "effect": "summoning"
  },
  {
    "id": "conjure-creature-huge",
    "name": "Conjure Creature, Huge",
    "school": "conjuration",
    "requirements": "Conjure Large Creature",
    "sourceMageryDc": 32,
    "sourceRange": "Close",
    "sourceTarget": "One unoccupied 10-foot square area",
    "sourceDuration": "1 round",
    "elementalCategory": null,
    "sourcePage": 65,
    "effect": "summoning"
  },
  {
    "id": "conjure-creature-gargantuan",
    "name": "Conjure Creature, Gargantuan",
    "school": "conjuration",
    "requirements": "Conjure Huge Creature",
    "sourceMageryDc": 36,
    "sourceRange": "Close",
    "sourceTarget": "One unoccupied 15-foot square area",
    "sourceDuration": "1 round",
    "elementalCategory": null,
    "sourcePage": 65,
    "effect": "summoning"
  },
  {
    "id": "conjure-creature-colossal",
    "name": "Conjure Creature, Colossal",
    "school": "conjuration",
    "requirements": "Conjure Gargantuan Creature",
    "sourceMageryDc": 40,
    "sourceRange": "Close",
    "sourceTarget": "One unoccupied 20-foot square area",
    "sourceDuration": "1 round",
    "elementalCategory": null,
    "sourcePage": 66,
    "effect": "summoning"
  },
  {
    "id": "conjure-daemon-lesser",
    "name": "Conjure Daemon, Lesser",
    "school": "conjuration",
    "requirements": "Conjure Small Animal, Power Device",
    "sourceMageryDc": 22,
    "sourceRange": "Touch",
    "sourceTarget": "One computer",
    "sourceDuration": "1 minute",
    "elementalCategory": null,
    "sourcePage": 66,
    "effect": "summoning"
  },
  {
    "id": "conjure-daemon",
    "name": "Conjure Daemon",
    "school": "conjuration",
    "requirements": "Conjure Lesser Daemon, Conjure Medium Creature, Conjuration as a standard aptitude",
    "sourceMageryDc": 27,
    "sourceRange": "Touch",
    "sourceTarget": "One computer",
    "sourceDuration": "1 minute",
    "elementalCategory": null,
    "sourcePage": 66,
    "effect": "summoning"
  },
  {
    "id": "conjure-daemon-greater",
    "name": "Conjure Daemon, Greater",
    "school": "conjuration",
    "requirements": "Conjure Daemon, Conjure Large Creature, Conjuration as a primary aptitude",
    "sourceMageryDc": 33,
    "sourceRange": "Touch",
    "sourceTarget": "One computer",
    "sourceDuration": "1 minute",
    "elementalCategory": null,
    "sourcePage": 67,
    "effect": "summoning"
  },
  {
    "id": "conjure-daemon-monitoring",
    "name": "Conjure Daemon, Monitoring",
    "school": "conjuration",
    "requirements": "Conjure Lesser Daemon, Message",
    "sourceMageryDc": 25,
    "sourceRange": "Touch",
    "sourceTarget": "One computer",
    "sourceDuration": "1 hour",
    "elementalCategory": null,
    "sourcePage": 67,
    "effect": "summoning"
  },
  {
    "id": "creation-minor",
    "name": "Creation, Minor",
    "school": "conjuration",
    "requirements": "Minor Repairs, Conjure Small Animal",
    "sourceMageryDc": 34,
    "sourceRange": "Touch",
    "sourceTarget": "Object touched",
    "sourceDuration": "Instantaneous",
    "elementalCategory": null,
    "sourcePage": 67,
    "effect": "creation"
  },
  {
    "id": "creation-major",
    "name": "Creation, Major",
    "school": "conjuration",
    "requirements": "Major Repairs, Minor Creation",
    "sourceMageryDc": 42,
    "sourceRange": "Touch",
    "sourceTarget": "Object touched",
    "sourceDuration": "Instantaneous",
    "elementalCategory": null,
    "sourcePage": 68,
    "effect": "creation"
  },
  {
    "id": "darkness",
    "name": "Darkness",
    "school": "conjuration",
    "requirements": "Bright Light",
    "sourceMageryDc": 19,
    "sourceRange": "Touch",
    "sourceTarget": "One object",
    "sourceDuration": "1 round",
    "elementalCategory": null,
    "sourcePage": 68,
    "effect": "utility"
  },
  {
    "id": "daylight",
    "name": "Daylight",
    "school": "conjuration",
    "requirements": "Bright Light",
    "sourceMageryDc": 21,
    "sourceRange": "Touch",
    "sourceTarget": "One object",
    "sourceDuration": "1 minute",
    "elementalCategory": null,
    "sourcePage": 68,
    "effect": "utility"
  },
  {
    "id": "dimensional-pocket",
    "name": "Dimensional Pocket",
    "school": "conjuration",
    "requirements": "Minor Creation, Displacement",
    "sourceMageryDc": 20,
    "sourceRange": "Touch",
    "sourceTarget": "One container",
    "sourceDuration": "10 minutes",
    "elementalCategory": null,
    "sourcePage": 68,
    "effect": "utility"
  },
  {
    "id": "disguise",
    "name": "Disguise",
    "school": "conjuration",
    "requirements": "Greater Phantom Image",
    "sourceMageryDc": 23,
    "sourceRange": "Touch",
    "sourceTarget": "Creature or object touched",
    "sourceDuration": "1 minute",
    "elementalCategory": null,
    "sourcePage": 68,
    "effect": "illusion"
  },
  {
    "id": "disguise-area",
    "name": "Disguise, Area",
    "school": "conjuration",
    "requirements": "Greater Mass Disguise",
    "sourceMageryDc": 38,
    "sourceRange": "Close",
    "sourceTarget": "30-foot radius sphere",
    "sourceDuration": "1 minute",
    "elementalCategory": null,
    "sourcePage": 69,
    "effect": "illusion"
  },
  {
    "id": "disguise-greater",
    "name": "Disguise, Greater",
    "school": "conjuration",
    "requirements": "Disguise, Mimic Sound",
    "sourceMageryDc": 29,
    "sourceRange": "Touch",
    "sourceTarget": "Creature or object touched",
    "sourceDuration": "1 minute",
    "elementalCategory": null,
    "sourcePage": 69,
    "effect": "illusion"
  },
  {
    "id": "disguise-mass",
    "name": "Disguise, Mass",
    "school": "conjuration",
    "requirements": "Disguise",
    "sourceMageryDc": 26,
    "sourceRange": "Self",
    "sourceTarget": "10-foot radius sphere around the caster",
    "sourceDuration": "1 minute",
    "elementalCategory": null,
    "sourcePage": 69,
    "effect": "illusion"
  },
  {
    "id": "disguise-mass-greater",
    "name": "Disguise, Mass, Greater",
    "school": "conjuration",
    "requirements": "Greater Disguise, Mass Disguise",
    "sourceMageryDc": 32,
    "sourceRange": "Self",
    "sourceTarget": "15-foot radius sphere around the caster",
    "sourceDuration": "1 minute",
    "elementalCategory": null,
    "sourcePage": 69,
    "effect": "illusion"
  },
  {
    "id": "displacement",
    "name": "Displacement",
    "school": "conjuration",
    "requirements": "Disguise, Duplicate Image",
    "sourceMageryDc": 25,
    "sourceRange": "Touch",
    "sourceTarget": "Creature or object touched",
    "sourceDuration": "1 round",
    "elementalCategory": null,
    "sourcePage": 69,
    "effect": "illusion"
  },
  {
    "id": "duplicate-image",
    "name": "Duplicate Image",
    "school": "conjuration",
    "requirements": "Greater Phantom Image",
    "sourceMageryDc": 22,
    "sourceRange": "Touch",
    "sourceTarget": "Creature or object touched",
    "sourceDuration": "3 rounds",
    "elementalCategory": null,
    "sourcePage": 70,
    "effect": "utility"
  },
  {
    "id": "fearful-visage",
    "name": "Fearful Visage",
    "school": "conjuration",
    "requirements": "Disguise",
    "sourceMageryDc": 19,
    "sourceRange": "Self",
    "sourceTarget": "Self",
    "sourceDuration": "1 round",
    "elementalCategory": null,
    "sourcePage": 70,
    "effect": "illusion"
  },
  {
    "id": "flare",
    "name": "Flare",
    "school": "conjuration",
    "requirements": "None",
    "sourceMageryDc": 14,
    "sourceRange": "Medium",
    "sourceTarget": "One square",
    "sourceDuration": "1 round",
    "elementalCategory": null,
    "sourcePage": 70,
    "effect": "utility"
  },
  {
    "id": "homunculus",
    "name": "Homunculus",
    "school": "conjuration",
    "requirements": "Duplicate Image, Conjure Small Creature",
    "sourceMageryDc": 30,
    "sourceRange": "Touch",
    "sourceTarget": "Creature or object touched",
    "sourceDuration": "1 round",
    "elementalCategory": null,
    "sourcePage": 71,
    "effect": "summoning"
  },
  {
    "id": "light",
    "name": "Light",
    "school": "conjuration",
    "requirements": "Flare",
    "sourceMageryDc": 16,
    "sourceRange": "Touch",
    "sourceTarget": "One object",
    "sourceDuration": "10 minutes",
    "elementalCategory": null,
    "sourcePage": 71,
    "effect": "utility"
  },
  {
    "id": "light-blinding",
    "name": "Light, Blinding",
    "school": "conjuration",
    "requirements": "Bright Light",
    "sourceMageryDc": 18,
    "sourceRange": "Close",
    "sourceTarget": "One point in space",
    "sourceDuration": "Instantaneous",
    "elementalCategory": null,
    "sourcePage": 71,
    "effect": "utility"
  },
  {
    "id": "light-bright",
    "name": "Light, Bright",
    "school": "conjuration",
    "requirements": "Flare",
    "sourceMageryDc": 18,
    "sourceRange": "Touch",
    "sourceTarget": "One object",
    "sourceDuration": "5 minutes",
    "elementalCategory": null,
    "sourcePage": 71,
    "effect": "utility"
  },
  {
    "id": "light-dazzling",
    "name": "Light, Dazzling",
    "school": "conjuration",
    "requirements": "Bright Light",
    "sourceMageryDc": 21,
    "sourceRange": "Close",
    "sourceTarget": "One point in space",
    "sourceDuration": "Instantaneous",
    "elementalCategory": null,
    "sourcePage": 71,
    "effect": "utility"
  },
  {
    "id": "light-hypnotising",
    "name": "Light, Hypnotising",
    "school": "conjuration",
    "requirements": "Dazzling Light",
    "sourceMageryDc": 23,
    "sourceRange": "5 feet",
    "sourceTarget": "One creature",
    "sourceDuration": "1 round",
    "elementalCategory": null,
    "sourcePage": 72,
    "effect": "utility"
  },
  {
    "id": "mage-ear",
    "name": "Mage Ear",
    "school": "conjuration",
    "requirements": "Phantom Image, Sharp Ears",
    "sourceMageryDc": 16,
    "sourceRange": "Self",
    "sourceTarget": "Self",
    "sourceDuration": "1 round",
    "elementalCategory": null,
    "sourcePage": 72,
    "effect": "utility"
  },
  {
    "id": "mage-eye",
    "name": "Mage Eye",
    "school": "conjuration",
    "requirements": "Phantom Image, Sharp Eyes",
    "sourceMageryDc": 16,
    "sourceRange": "Self",
    "sourceTarget": "Self",
    "sourceDuration": "1 round",
    "elementalCategory": null,
    "sourcePage": 72,
    "effect": "utility"
  },
  {
    "id": "mage-head",
    "name": "Mage Head",
    "school": "conjuration",
    "requirements": "Mage Eye, Mage Ear",
    "sourceMageryDc": 20,
    "sourceRange": "Self",
    "sourceTarget": "Self",
    "sourceDuration": "1 round",
    "elementalCategory": null,
    "sourcePage": 72,
    "effect": "utility"
  },
  {
    "id": "missile",
    "name": "Missile",
    "school": "conjuration",
    "requirements": "Minor Creation",
    "sourceMageryDc": 20,
    "sourceRange": "Medium (Ranged Touch)",
    "sourceTarget": "One creature",
    "sourceDuration": "Instantaneous",
    "elementalCategory": null,
    "sourcePage": 73,
    "effect": "attack"
  },
  {
    "id": "missile-greater",
    "name": "Missile, Greater",
    "school": "conjuration",
    "requirements": "Missile",
    "sourceMageryDc": 25,
    "sourceRange": "Medium (Ranged Touch)",
    "sourceTarget": "One creature",
    "sourceDuration": "Instantaneous",
    "elementalCategory": null,
    "sourcePage": 73,
    "effect": "attack"
  },
  {
    "id": "missile-killer",
    "name": "Missile, Killer",
    "school": "conjuration",
    "requirements": "Greater",
    "sourceMageryDc": null,
    "sourceRange": "Medium (Ranged Touch)",
    "sourceTarget": "One creature",
    "sourceDuration": "1 round",
    "elementalCategory": null,
    "sourcePage": 73,
    "effect": "attack"
  },
  {
    "id": "missile-swarm",
    "name": "Missile Swarm",
    "school": "conjuration",
    "requirements": "Greater Missile",
    "sourceMageryDc": 28,
    "sourceRange": "Medium (Ranged Touch)",
    "sourceTarget": "10-foot radius sphere",
    "sourceDuration": "Instantaneous",
    "elementalCategory": null,
    "sourcePage": 73,
    "effect": "attack"
  },
  {
    "id": "phantom-image",
    "name": "Phantom Image",
    "school": "conjuration",
    "requirements": "Light",
    "sourceMageryDc": 15,
    "sourceRange": "Close",
    "sourceTarget": "One 5-foot square",
    "sourceDuration": "1 minute",
    "elementalCategory": null,
    "sourcePage": 73,
    "effect": "illusion"
  },
  {
    "id": "phantom-image-greater",
    "name": "Phantom Image, Greater",
    "school": "conjuration",
    "requirements": "Phantom Image, Bright Light",
    "sourceMageryDc": 18,
    "sourceRange": "Medium",
    "sourceTarget": "5-foot radius cube",
    "sourceDuration": "1 minute",
    "elementalCategory": null,
    "sourcePage": 74,
    "effect": "illusion"
  },
  {
    "id": "phantom-image-perfect",
    "name": "Phantom Image, Perfect",
    "school": "conjuration",
    "requirements": "Greater Phantom Image, Ventriloquism",
    "sourceMageryDc": 21,
    "sourceRange": "Medium",
    "sourceTarget": "10-foot radius cube",
    "sourceDuration": "1 minute",
    "elementalCategory": null,
    "sourcePage": 74,
    "effect": "illusion"
  },
  {
    "id": "repairs-minor",
    "name": "Repairs, Minor",
    "school": "conjuration",
    "requirements": "Phantom Image",
    "sourceMageryDc": 20,
    "sourceRange": "Touch",
    "sourceTarget": "Object touched",
    "sourceDuration": "1 minute",
    "elementalCategory": null,
    "sourcePage": 74,
    "effect": "creation"
  },
  {
    "id": "repairs-major",
    "name": "Repairs, Major",
    "school": "conjuration",
    "requirements": "Minor Repairs",
    "sourceMageryDc": 25,
    "sourceRange": "Touch",
    "sourceTarget": "Object touched",
    "sourceDuration": "1 minute",
    "elementalCategory": null,
    "sourcePage": 74,
    "effect": "creation"
  },
  {
    "id": "suggestion",
    "name": "Suggestion",
    "school": "conjuration",
    "requirements": "Hypnotising Light",
    "sourceMageryDc": 25,
    "sourceRange": "5 feet",
    "sourceTarget": "One creature",
    "sourceDuration": "Instantaneous",
    "elementalCategory": null,
    "sourcePage": 75,
    "effect": "illusion"
  },
  {
    "id": "will-o-wisp",
    "name": "Will-O-Wisp",
    "school": "conjuration",
    "requirements": "Light",
    "sourceMageryDc": 20,
    "sourceRange": "Medium",
    "sourceTarget": "One point in space",
    "sourceDuration": "1 minute",
    "elementalCategory": null,
    "sourcePage": 75,
    "effect": "illusion"
  },
  {
    "id": "attract",
    "name": "Attract",
    "school": "movement",
    "requirements": "Push",
    "sourceMageryDc": 19,
    "sourceRange": "Close",
    "sourceTarget": "One object",
    "sourceDuration": "Instantaneous",
    "elementalCategory": null,
    "sourcePage": 75,
    "effect": "movement"
  },
  {
    "id": "balance",
    "name": "Balance",
    "school": "movement",
    "requirements": "Lighten Object",
    "sourceMageryDc": 15,
    "sourceRange": "Touch",
    "sourceTarget": "One creature",
    "sourceDuration": "1 round",
    "elementalCategory": null,
    "sourcePage": 76,
    "effect": "movement"
  },
  {
    "id": "blink",
    "name": "Blink",
    "school": "movement",
    "requirements": "Slow Time",
    "sourceMageryDc": 30,
    "sourceRange": "Close",
    "sourceTarget": "Self",
    "sourceDuration": "Instantaneous",
    "elementalCategory": null,
    "sourcePage": 76,
    "effect": "movement"
  },
  {
    "id": "burst-of-speed",
    "name": "Burst of Speed",
    "school": "movement",
    "requirements": "Balance",
    "sourceMageryDc": 18,
    "sourceRange": "Self",
    "sourceTarget": "One creature",
    "sourceDuration": "Instantaneous",
    "elementalCategory": null,
    "sourcePage": 76,
    "effect": "movement"
  },
  {
    "id": "centre-gravity",
    "name": "Centre Gravity",
    "school": "movement",
    "requirements": "Greater Lighten Object",
    "sourceMageryDc": 20,
    "sourceRange": "Touch",
    "sourceTarget": "One creature",
    "sourceDuration": "10 minutes",
    "elementalCategory": null,
    "sourcePage": 76,
    "effect": "movement"
  },
  {
    "id": "centre-gravity-mass",
    "name": "Centre Gravity, Mass",
    "school": "movement",
    "requirements": "Centre Gravity",
    "sourceMageryDc": 25,
    "sourceRange": "Self",
    "sourceTarget": "15-foot radius sphere around the caster",
    "sourceDuration": "10 minutes",
    "elementalCategory": null,
    "sourcePage": 76,
    "effect": "movement"
  },
  {
    "id": "cone-of-gravity",
    "name": "Cone of Gravity",
    "school": "movement",
    "requirements": "Gravitic Bolt",
    "sourceMageryDc": 25,
    "sourceRange": "Close",
    "sourceTarget": "Cone extending away from the mage",
    "sourceDuration": "Instantaneous",
    "elementalCategory": null,
    "sourcePage": 76,
    "effect": "movement"
  },
  {
    "id": "control-wind",
    "name": "Control Wind",
    "school": "movement",
    "requirements": "None",
    "sourceMageryDc": 15,
    "sourceRange": "Self",
    "sourceTarget": "30-foot radius sphere",
    "sourceDuration": "1 minute",
    "elementalCategory": null,
    "sourcePage": 77,
    "effect": "movement"
  },
  {
    "id": "floating-box",
    "name": "Floating Box",
    "school": "movement",
    "requirements": "Floating Sphere, Personal Shield",
    "sourceMageryDc": 21,
    "sourceRange": "Touch",
    "sourceTarget": "One five-foot square",
    "sourceDuration": "1 minute",
    "elementalCategory": null,
    "sourcePage": 77,
    "effect": "movement"
  },
  {
    "id": "floating-disc",
    "name": "Floating Disc",
    "school": "movement",
    "requirements": "None",
    "sourceMageryDc": 13,
    "sourceRange": "Touch",
    "sourceTarget": "One point in space",
    "sourceDuration": "1 minute",
    "elementalCategory": null,
    "sourcePage": 77,
    "effect": "movement"
  },
  {
    "id": "floating-sphere",
    "name": "Floating Sphere",
    "school": "movement",
    "requirements": "Floating Disc, Lesser Personal Shield",
    "sourceMageryDc": 17,
    "sourceRange": "Touch",
    "sourceTarget": "One five-foot square",
    "sourceDuration": "1 minute",
    "elementalCategory": null,
    "sourcePage": 77,
    "effect": "movement"
  },
  {
    "id": "flying-platform",
    "name": "Flying Platform",
    "school": "movement",
    "requirements": "Levitation Platform",
    "sourceMageryDc": 28,
    "sourceRange": "Close",
    "sourceTarget": "One five-foot square",
    "sourceDuration": "1 minute",
    "elementalCategory": null,
    "sourcePage": 78,
    "effect": "movement"
  },
  {
    "id": "flying-platform-fast",
    "name": "Flying Platform, Fast",
    "school": "movement",
    "requirements": "Flying Platform",
    "sourceMageryDc": 32,
    "sourceRange": "Close",
    "sourceTarget": "One five-foot square",
    "sourceDuration": "1 minute",
    "elementalCategory": null,
    "sourcePage": 78,
    "effect": "movement"
  },
  {
    "id": "flying-platform-large",
    "name": "Flying Platform, Large",
    "school": "movement",
    "requirements": "Flying Platform",
    "sourceMageryDc": 35,
    "sourceRange": "Close",
    "sourceTarget": "One ten-foot square",
    "sourceDuration": "1 minute",
    "elementalCategory": null,
    "sourcePage": 78,
    "effect": "movement"
  },
  {
    "id": "flying-platform-manoeuvrable",
    "name": "Flying Platform, Manoeuvrable",
    "school": "movement",
    "requirements": "Flying Platform",
    "sourceMageryDc": 32,
    "sourceRange": "Close",
    "sourceTarget": "One five-foot square",
    "sourceDuration": "1 minute",
    "elementalCategory": null,
    "sourcePage": 78,
    "effect": "movement"
  },
  {
    "id": "flying-vehicle",
    "name": "Flying Vehicle",
    "school": "movement",
    "requirements": "Large Flying Platform, Fast Flying Platform, Manoeuvrable Flying Platform, Greater Phantom Image",
    "sourceMageryDc": 40,
    "sourceRange": "Close",
    "sourceTarget": "One ten-foot by twenty-foot area",
    "sourceDuration": "1 minute",
    "elementalCategory": null,
    "sourcePage": 78,
    "effect": "movement"
  },
  {
    "id": "friction",
    "name": "Friction",
    "school": "movement",
    "requirements": "Gravity Platform",
    "sourceMageryDc": 20,
    "sourceRange": "Close (Ranged Touch)",
    "sourceTarget": "One creature or vehicle",
    "sourceDuration": "1 round",
    "elementalCategory": null,
    "sourcePage": 79,
    "effect": "movement"
  },
  {
    "id": "gravitic-bolt",
    "name": "Gravitic Bolt",
    "school": "movement",
    "requirements": "Knockback, Floating Disc",
    "sourceMageryDc": 20,
    "sourceRange": "Close (Ranged Touch)",
    "sourceTarget": "One creature",
    "sourceDuration": "Instantaneous",
    "elementalCategory": null,
    "sourcePage": 79,
    "effect": "movement"
  },
  {
    "id": "gravity-platform",
    "name": "Gravity Platform",
    "school": "movement",
    "requirements": "Centre Gravity",
    "sourceMageryDc": 22,
    "sourceRange": "Close",
    "sourceTarget": "One surface of up to 5 feet in diameter",
    "sourceDuration": "1 minute",
    "elementalCategory": null,
    "sourcePage": 79,
    "effect": "movement"
  },
  {
    "id": "halt",
    "name": "Halt",
    "school": "movement",
    "requirements": "Friction",
    "sourceMageryDc": 24,
    "sourceRange": "Close",
    "sourceTarget": "One vehicle",
    "sourceDuration": "Instantaneous",
    "elementalCategory": null,
    "sourcePage": 79,
    "effect": "movement"
  },
  {
    "id": "hold-in-place",
    "name": "Hold In Place",
    "school": "movement",
    "requirements": "Halt, Cone of Gravity",
    "sourceMageryDc": 26,
    "sourceRange": "Close (Ranged Touch)",
    "sourceTarget": "One creature",
    "sourceDuration": "1 round",
    "elementalCategory": null,
    "sourcePage": 79,
    "effect": "movement"
  },
  {
    "id": "knockback",
    "name": "Knockback",
    "school": "movement",
    "requirements": "Push",
    "sourceMageryDc": 18,
    "sourceRange": "Medium",
    "sourceTarget": "One creature or object",
    "sourceDuration": "Instantaneous",
    "elementalCategory": null,
    "sourcePage": 80,
    "effect": "movement"
  },
  {
    "id": "levitation-platform",
    "name": "Levitation Platform",
    "school": "movement",
    "requirements": "Gravity Platform, Walk on Water",
    "sourceMageryDc": 23,
    "sourceRange": "Close",
    "sourceTarget": "One five-foot square",
    "sourceDuration": "1 minute",
    "elementalCategory": null,
    "sourcePage": 80,
    "effect": "movement"
  },
  {
    "id": "lighten-object",
    "name": "Lighten Object",
    "school": "movement",
    "requirements": "None",
    "sourceMageryDc": 14,
    "sourceRange": "Touch",
    "sourceTarget": "One creature or object",
    "sourceDuration": "1 hour",
    "elementalCategory": null,
    "sourcePage": 81,
    "effect": "movement"
  },
  {
    "id": "lighten-object-greater",
    "name": "Lighten Object, Greater",
    "school": "movement",
    "requirements": "Lighten Object",
    "sourceMageryDc": 18,
    "sourceRange": "Touch",
    "sourceTarget": "One creature or object",
    "sourceDuration": "1 hour",
    "elementalCategory": null,
    "sourcePage": 81,
    "effect": "movement"
  },
  {
    "id": "mage-boat",
    "name": "Mage Boat",
    "school": "movement",
    "requirements": "Mage Mount, Walk on Water",
    "sourceMageryDc": 27,
    "sourceRange": "Close",
    "sourceTarget": "One 10-foot by 20-foot area",
    "sourceDuration": "10 minutes",
    "elementalCategory": null,
    "sourcePage": 81,
    "effect": "movement"
  },
  {
    "id": "mage-mount",
    "name": "Mage Mount",
    "school": "movement",
    "requirements": "Gravity Platform, Greater Phantom Image",
    "sourceMageryDc": 24,
    "sourceRange": "Close",
    "sourceTarget": "One five-foot square",
    "sourceDuration": "10 minutes",
    "elementalCategory": null,
    "sourcePage": 81,
    "effect": "movement"
  },
  {
    "id": "push",
    "name": "Push",
    "school": "movement",
    "requirements": "None",
    "sourceMageryDc": 13,
    "sourceRange": "Medium",
    "sourceTarget": "One creature or object",
    "sourceDuration": "Instantaneous",
    "elementalCategory": null,
    "sourcePage": 81,
    "effect": "movement"
  },
  {
    "id": "quickness",
    "name": "Quickness",
    "school": "movement",
    "requirements": "Rapid Movement",
    "sourceMageryDc": 25,
    "sourceRange": "Touch",
    "sourceTarget": "One creature",
    "sourceDuration": "1 round",
    "elementalCategory": null,
    "sourcePage": 82,
    "effect": "movement"
  },
  {
    "id": "quickness-mass",
    "name": "Quickness, Mass",
    "school": "movement",
    "requirements": "Quickness",
    "sourceMageryDc": 32,
    "sourceRange": "Close",
    "sourceTarget": "15-foot radius sphere",
    "sourceDuration": "1 round",
    "elementalCategory": null,
    "sourcePage": 82,
    "effect": "movement"
  },
  {
    "id": "rapid-movement",
    "name": "Rapid Movement",
    "school": "movement",
    "requirements": "Burst of Speed",
    "sourceMageryDc": 22,
    "sourceRange": "Touch",
    "sourceTarget": "One creature or vehicle",
    "sourceDuration": "1 round",
    "elementalCategory": null,
    "sourcePage": 82,
    "effect": "movement"
  },
  {
    "id": "slow-time",
    "name": "Slow Time",
    "school": "movement",
    "requirements": "Mass Quickness, Hold in Place, Greater Telekinesis",
    "sourceMageryDc": 26,
    "sourceRange": "Self",
    "sourceTarget": "Self",
    "sourceDuration": "Instantaneous",
    "elementalCategory": null,
    "sourcePage": 82,
    "effect": "movement"
  },
  {
    "id": "slowfall",
    "name": "Slowfall",
    "school": "movement",
    "requirements": "Weightlessness",
    "sourceMageryDc": 18,
    "sourceRange": "Close",
    "sourceTarget": "One creature or object",
    "sourceDuration": "Instantaneous",
    "elementalCategory": null,
    "sourcePage": 82,
    "effect": "movement"
  },
  {
    "id": "slowfall-mass",
    "name": "Slowfall, Mass",
    "school": "movement",
    "requirements": "Slowfall",
    "sourceMageryDc": 23,
    "sourceRange": "Self",
    "sourceTarget": "20-foot radius around the caster",
    "sourceDuration": "Instantaneous",
    "elementalCategory": null,
    "sourcePage": 83,
    "effect": "movement"
  },
  {
    "id": "sluggishness",
    "name": "Sluggishness",
    "school": "movement",
    "requirements": "Rapid Movement, Friction",
    "sourceMageryDc": 25,
    "sourceRange": "Close (Ranged Touch)",
    "sourceTarget": "One creature",
    "sourceDuration": "1 round",
    "elementalCategory": null,
    "sourcePage": 83,
    "effect": "movement"
  },
  {
    "id": "sluggishness-mass",
    "name": "Sluggishness, Mass",
    "school": "movement",
    "requirements": "Sluggishness",
    "sourceMageryDc": 32,
    "sourceRange": "Close",
    "sourceTarget": "15-foot radius sphere",
    "sourceDuration": "1 round",
    "elementalCategory": null,
    "sourcePage": 83,
    "effect": "movement"
  },
  {
    "id": "stop-time",
    "name": "Stop Time",
    "school": "movement",
    "requirements": "Slow Time",
    "sourceMageryDc": 40,
    "sourceRange": "Self",
    "sourceTarget": "Self",
    "sourceDuration": "See text",
    "elementalCategory": null,
    "sourcePage": 83,
    "effect": "movement"
  },
  {
    "id": "telekinesis",
    "name": "Telekinesis",
    "school": "movement",
    "requirements": "Attract",
    "sourceMageryDc": 23,
    "sourceRange": "Close",
    "sourceTarget": "One object",
    "sourceDuration": "1 round",
    "elementalCategory": null,
    "sourcePage": 83,
    "effect": "movement"
  },
  {
    "id": "telekinesis-greater",
    "name": "Telekinesis, Greater",
    "school": "movement",
    "requirements": "Telekinesis",
    "sourceMageryDc": 27,
    "sourceRange": "Close",
    "sourceTarget": "One object",
    "sourceDuration": "1 round",
    "elementalCategory": null,
    "sourcePage": 84,
    "effect": "movement"
  },
  {
    "id": "teleport",
    "name": "Teleport",
    "school": "movement",
    "requirements": "Blink, Flying Platform, Weight of Gravity, Movement as a primary aptitude",
    "sourceMageryDc": 38,
    "sourceRange": "Close",
    "sourceTarget": "Self",
    "sourceDuration": "Instantaneous",
    "elementalCategory": null,
    "sourcePage": 84,
    "effect": "movement"
  },
  {
    "id": "teleport-greater",
    "name": "Teleport, Greater",
    "school": "movement",
    "requirements": "Teleport",
    "sourceMageryDc": 46,
    "sourceRange": "Line of Sight",
    "sourceTarget": "Self",
    "sourceDuration": "Instantaneous",
    "elementalCategory": null,
    "sourcePage": 84,
    "effect": "movement"
  },
  {
    "id": "tread-lightly",
    "name": "Tread Lightly",
    "school": "movement",
    "requirements": "Lighten Object",
    "sourceMageryDc": 12,
    "sourceRange": "Touch",
    "sourceTarget": "One creature or vehicle",
    "sourceDuration": "1 round",
    "elementalCategory": null,
    "sourcePage": 84,
    "effect": "movement"
  },
  {
    "id": "walk-on-walls",
    "name": "Walk on Walls",
    "school": "movement",
    "requirements": "Gravity Platform",
    "sourceMageryDc": 26,
    "sourceRange": "Touch",
    "sourceTarget": "One creature",
    "sourceDuration": "1 round",
    "elementalCategory": null,
    "sourcePage": 84,
    "effect": "movement"
  },
  {
    "id": "walk-on-water",
    "name": "Walk on Water",
    "school": "movement",
    "requirements": "Gravity Platform",
    "sourceMageryDc": 17,
    "sourceRange": "Touch",
    "sourceTarget": "One creature or vehicle",
    "sourceDuration": "1 round",
    "elementalCategory": null,
    "sourcePage": 84,
    "effect": "movement"
  },
  {
    "id": "wall-of-gravity",
    "name": "Wall of Gravity",
    "school": "movement",
    "requirements": "Cone of Gravity",
    "sourceMageryDc": 28,
    "sourceRange": "Medium",
    "sourceTarget": "Straight line of five 5-foot squares",
    "sourceDuration": "1 round",
    "elementalCategory": null,
    "sourcePage": 85,
    "effect": "movement"
  },
  {
    "id": "weight-of-gravity",
    "name": "Weight of Gravity",
    "school": "movement",
    "requirements": "Wall of Gravity",
    "sourceMageryDc": 35,
    "sourceRange": "Close",
    "sourceTarget": "20-foot radius sphere",
    "sourceDuration": "1 round",
    "elementalCategory": null,
    "sourcePage": 85,
    "effect": "movement"
  },
  {
    "id": "weightlessness",
    "name": "Weightlessness",
    "school": "movement",
    "requirements": "Greater Lighten Object",
    "sourceMageryDc": 23,
    "sourceRange": "Touch",
    "sourceTarget": "One creature or object",
    "sourceDuration": "1 round",
    "elementalCategory": null,
    "sourcePage": 85,
    "effect": "movement"
  },
  {
    "id": "wind-gust",
    "name": "Wind Gust",
    "school": "movement",
    "requirements": "Control Wind",
    "sourceMageryDc": 17,
    "sourceRange": "Medium",
    "sourceTarget": "Hemispherical area facing away from the mage",
    "sourceDuration": "1 round",
    "elementalCategory": null,
    "sourcePage": 85,
    "effect": "movement"
  },
  {
    "id": "windstorm",
    "name": "Windstorm",
    "school": "movement",
    "requirements": "Wind Gust",
    "sourceMageryDc": 25,
    "sourceRange": "Long",
    "sourceTarget": "30-foot radius sphere",
    "sourceDuration": "1 round",
    "elementalCategory": null,
    "sourcePage": 86,
    "effect": "movement"
  },
  {
    "id": "clear-mind",
    "name": "Clear Mind",
    "school": "healing",
    "requirements": "Remove Fear",
    "sourceMageryDc": 21,
    "sourceRange": "Touch",
    "sourceTarget": "One creature",
    "sourceDuration": "10 minutes",
    "elementalCategory": null,
    "sourcePage": 87,
    "effect": "healing"
  },
  {
    "id": "cure-blindness",
    "name": "Cure Blindness",
    "school": "healing",
    "requirements": "Cure Deafness",
    "sourceMageryDc": 25,
    "sourceRange": "Touch",
    "sourceTarget": "One creature",
    "sourceDuration": "Instantaneous",
    "elementalCategory": null,
    "sourcePage": 87,
    "effect": "healing"
  },
  {
    "id": "cure-deafness",
    "name": "Cure Deafness",
    "school": "healing",
    "requirements": "Moderate Healing, Restore Vitality",
    "sourceMageryDc": 24,
    "sourceRange": "Touch",
    "sourceTarget": "One creature",
    "sourceDuration": "Instantaneous",
    "elementalCategory": null,
    "sourcePage": 87,
    "effect": "healing"
  },
  {
    "id": "cure-disease",
    "name": "Cure Disease",
    "school": "healing",
    "requirements": "Cure Poison, Greater Healing",
    "sourceMageryDc": 33,
    "sourceRange": "Touch",
    "sourceTarget": "One creature",
    "sourceDuration": "Instantaneous",
    "elementalCategory": null,
    "sourcePage": 87,
    "effect": "healing"
  },
  {
    "id": "cure-poison",
    "name": "Cure Poison",
    "school": "healing",
    "requirements": "Cure Blindness",
    "sourceMageryDc": 28,
    "sourceRange": "Touch",
    "sourceTarget": "One creature",
    "sourceDuration": "Instantaneous",
    "elementalCategory": null,
    "sourcePage": 87,
    "effect": "healing"
  },
  {
    "id": "cure-radiation",
    "name": "Cure Radiation",
    "school": "healing",
    "requirements": "Cure Disease",
    "sourceMageryDc": 35,
    "sourceRange": "Touch",
    "sourceTarget": "One creature",
    "sourceDuration": "Instantaneous",
    "elementalCategory": null,
    "sourcePage": 87,
    "effect": "healing"
  },
  {
    "id": "extend-life",
    "name": "Extend Life",
    "school": "healing",
    "requirements": "Raise Dead",
    "sourceMageryDc": 40,
    "sourceRange": "Self",
    "sourceTarget": "Self",
    "sourceDuration": "Ongoing",
    "elementalCategory": null,
    "sourcePage": 88,
    "effect": "healing"
  },
  {
    "id": "healing-minor",
    "name": "Healing, Minor",
    "school": "healing",
    "requirements": "Stabilise",
    "sourceMageryDc": 15,
    "sourceRange": "Touch",
    "sourceTarget": "One creature",
    "sourceDuration": "Instantaneous",
    "elementalCategory": null,
    "sourcePage": 88,
    "effect": "healing"
  },
  {
    "id": "healing-lesser",
    "name": "Healing, Lesser",
    "school": "healing",
    "requirements": "Minor Healing",
    "sourceMageryDc": 19,
    "sourceRange": "Touch",
    "sourceTarget": "One creature",
    "sourceDuration": "Instantaneous",
    "elementalCategory": null,
    "sourcePage": 88,
    "effect": "healing"
  },
  {
    "id": "healing-lesser-mass",
    "name": "Healing, Lesser, Mass",
    "school": "healing",
    "requirements": "Lesser Healing",
    "sourceMageryDc": 25,
    "sourceRange": "5 feet",
    "sourceTarget": "Up to 8 creatures",
    "sourceDuration": "Instantaneous",
    "elementalCategory": null,
    "sourcePage": 88,
    "effect": "healing"
  },
  {
    "id": "healing-moderate",
    "name": "Healing, Moderate",
    "school": "healing",
    "requirements": "Lesser Healing",
    "sourceMageryDc": 23,
    "sourceRange": "Touch",
    "sourceTarget": "One creature",
    "sourceDuration": "Instantaneous",
    "elementalCategory": null,
    "sourcePage": 88,
    "effect": "healing"
  },
  {
    "id": "healing-moderate-mass",
    "name": "Healing, Moderate, Mass",
    "school": "healing",
    "requirements": "Moderate Healing",
    "sourceMageryDc": 30,
    "sourceRange": "5 feet",
    "sourceTarget": "Up to 8 creatures",
    "sourceDuration": "Instantaneous",
    "elementalCategory": null,
    "sourcePage": 88,
    "effect": "healing"
  },
  {
    "id": "healing-greater",
    "name": "Healing, Greater",
    "school": "healing",
    "requirements": "Moderate Healing",
    "sourceMageryDc": 27,
    "sourceRange": "Touch",
    "sourceTarget": "One creature",
    "sourceDuration": "Instantaneous",
    "elementalCategory": null,
    "sourcePage": 89,
    "effect": "healing"
  },
  {
    "id": "healing-greater-mass",
    "name": "Healing, Greater, Mass",
    "school": "healing",
    "requirements": "Greater Healing",
    "sourceMageryDc": 35,
    "sourceRange": "5 feet",
    "sourceTarget": "Up to 8 creatures",
    "sourceDuration": "Instantaneous",
    "elementalCategory": null,
    "sourcePage": 89,
    "effect": "healing"
  },
  {
    "id": "healing-major",
    "name": "Healing, Major",
    "school": "healing",
    "requirements": "Greater Healing",
    "sourceMageryDc": 31,
    "sourceRange": "Touch",
    "sourceTarget": "One creature",
    "sourceDuration": "Instantaneous",
    "elementalCategory": null,
    "sourcePage": 89,
    "effect": "healing"
  },
  {
    "id": "healing-total",
    "name": "Healing, Total",
    "school": "healing",
    "requirements": "Major Healing, Healing school as a primary aptitude",
    "sourceMageryDc": 35,
    "sourceRange": "Touch",
    "sourceTarget": "One creature",
    "sourceDuration": "Instantaneous",
    "elementalCategory": null,
    "sourcePage": 89,
    "effect": "healing"
  },
  {
    "id": "loan-life",
    "name": "Loan Life",
    "school": "healing",
    "requirements": "Remove Fatigue, Lesser Healing",
    "sourceMageryDc": 20,
    "sourceRange": "Touch",
    "sourceTarget": "One creature",
    "sourceDuration": "1 minute",
    "elementalCategory": null,
    "sourcePage": 89,
    "effect": "healing"
  },
  {
    "id": "monitor-lifesigns",
    "name": "Monitor Lifesigns",
    "school": "healing",
    "requirements": "Lesser Healing",
    "sourceMageryDc": 15,
    "sourceRange": "Touch",
    "sourceTarget": "One creature",
    "sourceDuration": "1 hour",
    "elementalCategory": null,
    "sourcePage": 89,
    "effect": "healing"
  },
  {
    "id": "monitor-lifesigns-mass",
    "name": "Monitor Lifesigns, Mass",
    "school": "healing",
    "requirements": "Monitor Lifesigns, Mass Lesser Healing",
    "sourceMageryDc": 20,
    "sourceRange": "Touch",
    "sourceTarget": "Up to 6 creatures (5 for weak aptitudes, 8 for primaries)",
    "sourceDuration": "10 minutes",
    "elementalCategory": null,
    "sourcePage": 90,
    "effect": "healing"
  },
  {
    "id": "raise-dead",
    "name": "Raise Dead",
    "school": "healing",
    "requirements": "Total Healing, Healing school as a primary aptitude",
    "sourceMageryDc": 40,
    "sourceRange": "Touch",
    "sourceTarget": "One creature",
    "sourceDuration": "Ongoing",
    "elementalCategory": null,
    "sourcePage": 90,
    "effect": "healing"
  },
  {
    "id": "regeneration",
    "name": "Regeneration",
    "school": "healing",
    "requirements": "Cure Radiation, Major Healing, Healing school as a primary aptitude",
    "sourceMageryDc": 35,
    "sourceRange": "Touch",
    "sourceTarget": "One creature",
    "sourceDuration": "Varies",
    "elementalCategory": null,
    "sourcePage": 90,
    "effect": "healing"
  },
  {
    "id": "regeneration-greater",
    "name": "Regeneration, Greater",
    "school": "healing",
    "requirements": "Regeneration, Total Healing",
    "sourceMageryDc": 45,
    "sourceRange": "Touch",
    "sourceTarget": "One creature",
    "sourceDuration": "1 day",
    "elementalCategory": null,
    "sourcePage": 91,
    "effect": "healing"
  },
  {
    "id": "remove-nausea",
    "name": "Remove Nausea",
    "school": "healing",
    "requirements": "Stabilise",
    "sourceMageryDc": 14,
    "sourceRange": "Touch",
    "sourceTarget": "One creature",
    "sourceDuration": "Instantaneous",
    "elementalCategory": null,
    "sourcePage": 91,
    "effect": "healing"
  },
  {
    "id": "remove-fear",
    "name": "Remove Fear",
    "school": "healing",
    "requirements": "Minor Healing, Remove Nausea",
    "sourceMageryDc": 17,
    "sourceRange": "Touch",
    "sourceTarget": "One creature",
    "sourceDuration": "Instantaneous",
    "elementalCategory": null,
    "sourcePage": 91,
    "effect": "healing"
  },
  {
    "id": "remove-fatigue",
    "name": "Remove Fatigue",
    "school": "healing",
    "requirements": "Lesser Healing, Remove Fear",
    "sourceMageryDc": 20,
    "sourceRange": "Touch",
    "sourceTarget": "One creature",
    "sourceDuration": "Instantaneous",
    "elementalCategory": null,
    "sourcePage": 91,
    "effect": "healing"
  },
  {
    "id": "restore-ability",
    "name": "Restore Ability",
    "school": "healing",
    "requirements": "Restore Vitality",
    "sourceMageryDc": 26,
    "sourceRange": "Touch",
    "sourceTarget": "One creature",
    "sourceDuration": "Instantaneous",
    "elementalCategory": null,
    "sourcePage": 92,
    "effect": "healing"
  },
  {
    "id": "restore-consciousness",
    "name": "Restore Consciousness",
    "school": "healing",
    "requirements": "Moderate Healing, Remove Fatigue",
    "sourceMageryDc": 21,
    "sourceRange": "Touch",
    "sourceTarget": "One creature",
    "sourceDuration": "Instantaneous",
    "elementalCategory": null,
    "sourcePage": 92,
    "effect": "healing"
  },
  {
    "id": "restore-vitality",
    "name": "Restore Vitality",
    "school": "healing",
    "requirements": "Restore Consciousness",
    "sourceMageryDc": 23,
    "sourceRange": "Touch",
    "sourceTarget": "One creature",
    "sourceDuration": "Instantaneous",
    "elementalCategory": null,
    "sourcePage": 92,
    "effect": "healing"
  },
  {
    "id": "stabilise",
    "name": "Stabilise",
    "school": "healing",
    "requirements": "None",
    "sourceMageryDc": 14,
    "sourceRange": "Touch",
    "sourceTarget": "One creature",
    "sourceDuration": "Instantaneous",
    "elementalCategory": null,
    "sourcePage": 92,
    "effect": "healing"
  },
  {
    "id": "acrobat",
    "name": "Acrobat",
    "school": "enhancement",
    "requirements": "Alertness",
    "sourceMageryDc": 20,
    "sourceRange": "Touch",
    "sourceTarget": "One creature",
    "sourceDuration": "1 minute",
    "elementalCategory": null,
    "sourcePage": 92,
    "effect": "enhancement"
  },
  {
    "id": "alertness",
    "name": "Alertness",
    "school": "enhancement",
    "requirements": "Skilfulness",
    "sourceMageryDc": 16,
    "sourceRange": "Touch",
    "sourceTarget": "One creature",
    "sourceDuration": "10 minutes",
    "elementalCategory": null,
    "sourcePage": 93,
    "effect": "enhancement"
  },
  {
    "id": "altered-breath",
    "name": "Altered Breath",
    "school": "enhancement",
    "requirements": "Swimming",
    "sourceMageryDc": 23,
    "sourceRange": "Touch",
    "sourceTarget": "One creature",
    "sourceDuration": "1 hour",
    "elementalCategory": null,
    "sourcePage": 93,
    "effect": "enhancement"
  },
  {
    "id": "altered-breath-greater",
    "name": "Altered Breath, Greater",
    "school": "enhancement",
    "requirements": "Altered Breath",
    "sourceMageryDc": 27,
    "sourceRange": "Touch",
    "sourceTarget": "One creature",
    "sourceDuration": "1 minute",
    "elementalCategory": null,
    "sourcePage": 93,
    "effect": "enhancement"
  },
  {
    "id": "appeal",
    "name": "Appeal",
    "school": "enhancement",
    "requirements": "Improved Reflexes",
    "sourceMageryDc": 24,
    "sourceRange": "Touch",
    "sourceTarget": "One creature",
    "sourceDuration": "1 minute",
    "elementalCategory": null,
    "sourcePage": 93,
    "effect": "enhancement"
  },
  {
    "id": "appeal-mass",
    "name": "Appeal, Mass",
    "school": "enhancement",
    "requirements": "Appeal",
    "sourceMageryDc": 29,
    "sourceRange": "Close",
    "sourceTarget": "Any creatures within range",
    "sourceDuration": "1 minute",
    "elementalCategory": null,
    "sourcePage": 93,
    "effect": "enhancement"
  },
  {
    "id": "clarity",
    "name": "Clarity",
    "school": "enhancement",
    "requirements": "Improved Will",
    "sourceMageryDc": 24,
    "sourceRange": "Touch",
    "sourceTarget": "One creature",
    "sourceDuration": "1 minute",
    "elementalCategory": null,
    "sourcePage": 93,
    "effect": "enhancement"
  },
  {
    "id": "clarity-mass",
    "name": "Clarity, Mass",
    "school": "enhancement",
    "requirements": "Clarity",
    "sourceMageryDc": 29,
    "sourceRange": "Close",
    "sourceTarget": "Any creatures within range",
    "sourceDuration": "1 minute",
    "elementalCategory": null,
    "sourcePage": 94,
    "effect": "enhancement"
  },
  {
    "id": "contortionist",
    "name": "Contortionist",
    "school": "enhancement",
    "requirements": "Alertness",
    "sourceMageryDc": 20,
    "sourceRange": "Touch",
    "sourceTarget": "One creature",
    "sourceDuration": "1 minute",
    "elementalCategory": null,
    "sourcePage": 94,
    "effect": "enhancement"
  },
  {
    "id": "danger-sense",
    "name": "Danger Sense",
    "school": "enhancement",
    "requirements": "Detect Lie, Falsehood",
    "sourceMageryDc": 18,
    "sourceRange": "Self",
    "sourceTarget": "Self",
    "sourceDuration": "10 minutes",
    "elementalCategory": null,
    "sourcePage": 94,
    "effect": "enhancement"
  },
  {
    "id": "darkvision",
    "name": "Darkvision",
    "school": "enhancement",
    "requirements": "Sharp Eyes",
    "sourceMageryDc": 21,
    "sourceRange": "Touch",
    "sourceTarget": "One creature",
    "sourceDuration": "1 minute",
    "elementalCategory": null,
    "sourcePage": 94,
    "effect": "perception"
  },
  {
    "id": "darkvision-mass",
    "name": "Darkvision, Mass",
    "school": "enhancement",
    "requirements": "Darkvision",
    "sourceMageryDc": 25,
    "sourceRange": "Close",
    "sourceTarget": "Any creatures within range",
    "sourceDuration": "1 minute",
    "elementalCategory": null,
    "sourcePage": 94,
    "effect": "perception"
  },
  {
    "id": "detect-communication",
    "name": "Detect Communication",
    "school": "enhancement",
    "requirements": "Determine Direction",
    "sourceMageryDc": 25,
    "sourceRange": "Long",
    "sourceTarget": "Self",
    "sourceDuration": "Instantaneous",
    "elementalCategory": null,
    "sourcePage": 94,
    "effect": "perception"
  },
  {
    "id": "detect-lie",
    "name": "Detect Lie",
    "school": "enhancement",
    "requirements": "Alertness",
    "sourceMageryDc": 20,
    "sourceRange": "Touch",
    "sourceTarget": "One creature",
    "sourceDuration": "1 minute",
    "elementalCategory": null,
    "sourcePage": 95,
    "effect": "perception"
  },
  {
    "id": "detect-metal",
    "name": "Detect Metal",
    "school": "enhancement",
    "requirements": "Determine Direction",
    "sourceMageryDc": 25,
    "sourceRange": "Long",
    "sourceTarget": "Self",
    "sourceDuration": "Instantaneous",
    "elementalCategory": null,
    "sourcePage": 95,
    "effect": "perception"
  },
  {
    "id": "detect-thoughts",
    "name": "Detect Thoughts",
    "school": "enhancement",
    "requirements": "Detect Communication",
    "sourceMageryDc": 31,
    "sourceRange": "Close",
    "sourceTarget": "Self",
    "sourceDuration": "Instantaneous",
    "elementalCategory": null,
    "sourcePage": 95,
    "effect": "perception"
  },
  {
    "id": "determine-direction",
    "name": "Determine Direction",
    "school": "enhancement",
    "requirements": "Danger Sense",
    "sourceMageryDc": 21,
    "sourceRange": "Self",
    "sourceTarget": "Self",
    "sourceDuration": "Instantaneous",
    "elementalCategory": null,
    "sourcePage": 95,
    "effect": "perception"
  },
  {
    "id": "divination",
    "name": "Divination",
    "school": "enhancement",
    "requirements": "Meeting, Insight, Clarity, Appeal, Enhancement as a primary aptitude",
    "sourceMageryDc": 35,
    "sourceRange": "Self",
    "sourceTarget": "Self",
    "sourceDuration": "Instantaneous",
    "elementalCategory": null,
    "sourcePage": 95,
    "effect": "perception"
  },
  {
    "id": "dreamspeech",
    "name": "Dreamspeech",
    "school": "enhancement",
    "requirements": "Far Speech, Darkvision",
    "sourceMageryDc": 24,
    "sourceRange": "Long",
    "sourceTarget": "One creature",
    "sourceDuration": "1 minute",
    "elementalCategory": null,
    "sourcePage": 96,
    "effect": "enhancement"
  },
  {
    "id": "falsehood",
    "name": "Falsehood",
    "school": "enhancement",
    "requirements": "Alertness",
    "sourceMageryDc": 20,
    "sourceRange": "Touch",
    "sourceTarget": "One creature",
    "sourceDuration": "1 minute",
    "elementalCategory": null,
    "sourcePage": 96,
    "effect": "enhancement"
  },
  {
    "id": "far-speech",
    "name": "Far Speech",
    "school": "enhancement",
    "requirements": "Voice",
    "sourceMageryDc": 21,
    "sourceRange": "Line of Sight",
    "sourceTarget": "One creature",
    "sourceDuration": "1 minute",
    "elementalCategory": null,
    "sourcePage": 96,
    "effect": "enhancement"
  },
  {
    "id": "hardiness",
    "name": "Hardiness",
    "school": "enhancement",
    "requirements": "Improved Fortitude",
    "sourceMageryDc": 24,
    "sourceRange": "Touch",
    "sourceTarget": "One creature",
    "sourceDuration": "1 minute",
    "elementalCategory": null,
    "sourcePage": 96,
    "effect": "enhancement"
  },
  {
    "id": "hardiness-mass",
    "name": "Hardiness, Mass",
    "school": "enhancement",
    "requirements": "Hardiness",
    "sourceMageryDc": 29,
    "sourceRange": "Close",
    "sourceTarget": "Any creatures within range",
    "sourceDuration": "1 minute",
    "elementalCategory": null,
    "sourcePage": 97,
    "effect": "enhancement"
  },
  {
    "id": "improved-fortitude",
    "name": "Improved Fortitude",
    "school": "enhancement",
    "requirements": "Greater Luck",
    "sourceMageryDc": 17,
    "sourceRange": "Touch",
    "sourceTarget": "One creature",
    "sourceDuration": "1 minute",
    "elementalCategory": null,
    "sourcePage": 97,
    "effect": "enhancement"
  },
  {
    "id": "improved-reflexes",
    "name": "Improved Reflexes",
    "school": "enhancement",
    "requirements": "Greater Luck",
    "sourceMageryDc": 17,
    "sourceRange": "Touch",
    "sourceTarget": "One creature",
    "sourceDuration": "1 minute",
    "elementalCategory": null,
    "sourcePage": 97,
    "effect": "enhancement"
  },
  {
    "id": "improved-will",
    "name": "Improved Will",
    "school": "enhancement",
    "requirements": "Greater Luck",
    "sourceMageryDc": 17,
    "sourceRange": "Touch",
    "sourceTarget": "One creature",
    "sourceDuration": "1 minute",
    "elementalCategory": null,
    "sourcePage": 97,
    "effect": "enhancement"
  },
  {
    "id": "insight",
    "name": "Insight",
    "school": "enhancement",
    "requirements": "Improved Will",
    "sourceMageryDc": 24,
    "sourceRange": "Touch",
    "sourceTarget": "One creature",
    "sourceDuration": "1 minute",
    "elementalCategory": null,
    "sourcePage": 97,
    "effect": "perception"
  },
  {
    "id": "insight-mass",
    "name": "Insight, Mass",
    "school": "enhancement",
    "requirements": "Insight",
    "sourceMageryDc": 29,
    "sourceRange": "Close",
    "sourceTarget": "Any creatures within range",
    "sourceDuration": "1 minute",
    "elementalCategory": null,
    "sourcePage": 97,
    "effect": "perception"
  },
  {
    "id": "leaping",
    "name": "Leaping",
    "school": "enhancement",
    "requirements": "Alertness",
    "sourceMageryDc": 20,
    "sourceRange": "Touch",
    "sourceTarget": "One creature",
    "sourceDuration": "1 minute",
    "elementalCategory": null,
    "sourcePage": 97,
    "effect": "enhancement"
  },
  {
    "id": "luck",
    "name": "Luck",
    "school": "enhancement",
    "requirements": "None",
    "sourceMageryDc": 14,
    "sourceRange": "Touch",
    "sourceTarget": "One creature",
    "sourceDuration": "1 hour",
    "elementalCategory": null,
    "sourcePage": 98,
    "effect": "enhancement"
  },
  {
    "id": "luck-greater",
    "name": "Luck, Greater",
    "school": "enhancement",
    "requirements": "Luck",
    "sourceMageryDc": 16,
    "sourceRange": "Touch",
    "sourceTarget": "One creature",
    "sourceDuration": "1 minute",
    "elementalCategory": null,
    "sourcePage": 98,
    "effect": "enhancement"
  },
  {
    "id": "meeting",
    "name": "Meeting",
    "school": "enhancement",
    "requirements": "Dreamspeech",
    "sourceMageryDc": 25,
    "sourceRange": "Line of Sight",
    "sourceTarget": "One creature",
    "sourceDuration": "1 minute",
    "elementalCategory": null,
    "sourcePage": 98,
    "effect": "enhancement"
  },
  {
    "id": "might",
    "name": "Might",
    "school": "enhancement",
    "requirements": "Improved Fortitude",
    "sourceMageryDc": 24,
    "sourceRange": "Touch",
    "sourceTarget": "One creature",
    "sourceDuration": "1 minute",
    "elementalCategory": null,
    "sourcePage": 98,
    "effect": "enhancement"
  },
  {
    "id": "might-mass",
    "name": "Might, Mass",
    "school": "enhancement",
    "requirements": "Might",
    "sourceMageryDc": 29,
    "sourceRange": "Close",
    "sourceTarget": "Any creatures within range",
    "sourceDuration": "1 minute",
    "elementalCategory": null,
    "sourcePage": 98,
    "effect": "enhancement"
  },
  {
    "id": "nimble-fingers",
    "name": "Nimble Fingers",
    "school": "enhancement",
    "requirements": "Alertness",
    "sourceMageryDc": 20,
    "sourceRange": "Touch",
    "sourceTarget": "One creature",
    "sourceDuration": "1 minute",
    "elementalCategory": null,
    "sourcePage": 98,
    "effect": "enhancement"
  },
  {
    "id": "nimbleness",
    "name": "Nimbleness",
    "school": "enhancement",
    "requirements": "Improved Reflexes",
    "sourceMageryDc": 24,
    "sourceRange": "Touch",
    "sourceTarget": "One creature",
    "sourceDuration": "1 minute",
    "elementalCategory": null,
    "sourcePage": 98,
    "effect": "enhancement"
  },
  {
    "id": "nimbleness-mass",
    "name": "Nimbleness, Mass",
    "school": "enhancement",
    "requirements": "Nimbleness",
    "sourceMageryDc": 29,
    "sourceRange": "Close",
    "sourceTarget": "Any creatures within range",
    "sourceDuration": "1 minute",
    "elementalCategory": null,
    "sourcePage": 99,
    "effect": "enhancement"
  },
  {
    "id": "observation",
    "name": "Observation",
    "school": "enhancement",
    "requirements": "Alertness",
    "sourceMageryDc": 20,
    "sourceRange": "Touch",
    "sourceTarget": "One creature",
    "sourceDuration": "1 minute",
    "elementalCategory": null,
    "sourcePage": 99,
    "effect": "perception"
  },
  {
    "id": "oration",
    "name": "Oration",
    "school": "enhancement",
    "requirements": "Voice",
    "sourceMageryDc": 24,
    "sourceRange": "Close",
    "sourceTarget": "Self",
    "sourceDuration": "Instantaneous",
    "elementalCategory": null,
    "sourcePage": 99,
    "effect": "enhancement"
  },
  {
    "id": "oration-greater",
    "name": "Oration, Greater",
    "school": "enhancement",
    "requirements": "Oration",
    "sourceMageryDc": 28,
    "sourceRange": "All creatures within hearing range",
    "sourceTarget": "Self",
    "sourceDuration": "Instantaneous",
    "elementalCategory": null,
    "sourcePage": 99,
    "effect": "enhancement"
  },
  {
    "id": "preparedness",
    "name": "Preparedness",
    "school": "enhancement",
    "requirements": "Observation",
    "sourceMageryDc": 22,
    "sourceRange": "Touch",
    "sourceTarget": "One creature",
    "sourceDuration": "1 minute",
    "elementalCategory": null,
    "sourcePage": 99,
    "effect": "enhancement"
  },
  {
    "id": "prescience",
    "name": "Prescience",
    "school": "enhancement",
    "requirements": "Skilfulness, Preparedness",
    "sourceMageryDc": 21,
    "sourceRange": "Touch",
    "sourceTarget": "One creature",
    "sourceDuration": "1 minute",
    "elementalCategory": null,
    "sourcePage": 99,
    "effect": "perception"
  },
  {
    "id": "prescience-greater",
    "name": "Prescience, Greater",
    "school": "enhancement",
    "requirements": "Prescience",
    "sourceMageryDc": 24,
    "sourceRange": "Touch",
    "sourceTarget": "One creature",
    "sourceDuration": "1 minute",
    "elementalCategory": null,
    "sourcePage": 100,
    "effect": "perception"
  },
  {
    "id": "prescience-mass",
    "name": "Prescience, Mass",
    "school": "enhancement",
    "requirements": "Prescience",
    "sourceMageryDc": 25,
    "sourceRange": "Close",
    "sourceTarget": "Any creatures in range",
    "sourceDuration": "1 minute",
    "elementalCategory": null,
    "sourcePage": 100,
    "effect": "perception"
  },
  {
    "id": "prescience-mass-greater",
    "name": "Prescience, Mass, Greater",
    "school": "enhancement",
    "requirements": "Mass Prescience, Greater Prescience",
    "sourceMageryDc": 30,
    "sourceRange": "Close",
    "sourceTarget": "Any creatures in range",
    "sourceDuration": "1 minute",
    "elementalCategory": null,
    "sourcePage": 100,
    "effect": "perception"
  },
  {
    "id": "prowess-lesser",
    "name": "Prowess, Lesser",
    "school": "enhancement",
    "requirements": "Skilfulness",
    "sourceMageryDc": 18,
    "sourceRange": "Touch",
    "sourceTarget": "One creature",
    "sourceDuration": "1 minute",
    "elementalCategory": null,
    "sourcePage": 100,
    "effect": "enhancement"
  },
  {
    "id": "prowess",
    "name": "Prowess",
    "school": "enhancement",
    "requirements": "Lesser Prowess",
    "sourceMageryDc": 22,
    "sourceRange": "Touch",
    "sourceTarget": "One creature",
    "sourceDuration": "1 minute",
    "elementalCategory": null,
    "sourcePage": 100,
    "effect": "enhancement"
  },
  {
    "id": "prowess-greater",
    "name": "Prowess, Greater",
    "school": "enhancement",
    "requirements": "Prowess",
    "sourceMageryDc": 26,
    "sourceRange": "Touch",
    "sourceTarget": "One creature",
    "sourceDuration": "1 minute",
    "elementalCategory": null,
    "sourcePage": 100,
    "effect": "enhancement"
  },
  {
    "id": "scan-terrain",
    "name": "Scan Terrain",
    "school": "enhancement",
    "requirements": "Observation",
    "sourceMageryDc": 21,
    "sourceRange": "Self",
    "sourceTarget": "Self",
    "sourceDuration": "1 minute",
    "elementalCategory": null,
    "sourcePage": 100,
    "effect": "perception"
  },
  {
    "id": "sharp-ears",
    "name": "Sharp Ears",
    "school": "enhancement",
    "requirements": "Alertness",
    "sourceMageryDc": 20,
    "sourceRange": "Touch",
    "sourceTarget": "One creature",
    "sourceDuration": "1 minute",
    "elementalCategory": null,
    "sourcePage": 101,
    "effect": "perception"
  },
  {
    "id": "sharp-eyes",
    "name": "Sharp Eyes",
    "school": "enhancement",
    "requirements": "Alertness",
    "sourceMageryDc": 20,
    "sourceRange": "Touch",
    "sourceTarget": "One creature",
    "sourceDuration": "1 minute",
    "elementalCategory": null,
    "sourcePage": 101,
    "effect": "perception"
  },
  {
    "id": "skilfulness",
    "name": "Skilfulness",
    "school": "enhancement",
    "requirements": "None",
    "sourceMageryDc": 13,
    "sourceRange": "Touch",
    "sourceTarget": "One creature",
    "sourceDuration": "1 hour",
    "elementalCategory": null,
    "sourcePage": 101,
    "effect": "enhancement"
  },
  {
    "id": "spyspot",
    "name": "Spyspot",
    "school": "enhancement",
    "requirements": "Observation, Sharp Eyes, Sharp Ears",
    "sourceMageryDc": 20,
    "sourceRange": "Touch",
    "sourceTarget": "One point in space",
    "sourceDuration": "1 hour",
    "elementalCategory": null,
    "sourcePage": 101,
    "effect": "perception"
  },
  {
    "id": "streetwise",
    "name": "Streetwise",
    "school": "enhancement",
    "requirements": "Voice",
    "sourceMageryDc": 21,
    "sourceRange": "Touch",
    "sourceTarget": "One creature",
    "sourceDuration": "1 minute",
    "elementalCategory": null,
    "sourcePage": 101,
    "effect": "enhancement"
  },
  {
    "id": "sustenance",
    "name": "Sustenance",
    "school": "enhancement",
    "requirements": "Fortitude, Altered Breath",
    "sourceMageryDc": 25,
    "sourceRange": "Self",
    "sourceTarget": "Self",
    "sourceDuration": "1 day",
    "elementalCategory": null,
    "sourcePage": 102,
    "effect": "enhancement"
  },
  {
    "id": "swimming",
    "name": "Swimming",
    "school": "enhancement",
    "requirements": "Alertness",
    "sourceMageryDc": 20,
    "sourceRange": "Touch",
    "sourceTarget": "One creature",
    "sourceDuration": "1 minute",
    "elementalCategory": null,
    "sourcePage": 102,
    "effect": "enhancement"
  },
  {
    "id": "translation",
    "name": "Translation",
    "school": "enhancement",
    "requirements": "Meeting",
    "sourceMageryDc": 22,
    "sourceRange": "Medium",
    "sourceTarget": "One creature",
    "sourceDuration": "10 minutes",
    "elementalCategory": null,
    "sourcePage": 102,
    "effect": "enhancement"
  },
  {
    "id": "translation-mass",
    "name": "Translation, Mass",
    "school": "enhancement",
    "requirements": "Translation",
    "sourceMageryDc": 25,
    "sourceRange": "Medium",
    "sourceTarget": "Any selected creatures within range",
    "sourceDuration": "10 minutes",
    "elementalCategory": null,
    "sourcePage": 102,
    "effect": "enhancement"
  },
  {
    "id": "voice",
    "name": "Voice",
    "school": "enhancement",
    "requirements": "Alertness",
    "sourceMageryDc": 20,
    "sourceRange": "Touch",
    "sourceTarget": "One creature",
    "sourceDuration": "1 minute",
    "elementalCategory": null,
    "sourcePage": 102,
    "effect": "enhancement"
  },
  {
    "id": "writing",
    "name": "Writing",
    "school": "enhancement",
    "requirements": "Nimble Fingers",
    "sourceMageryDc": 22,
    "sourceRange": "Touch",
    "sourceTarget": "One creature",
    "sourceDuration": "1 minute",
    "elementalCategory": null,
    "sourcePage": 103,
    "effect": "enhancement"
  },
  {
    "id": "attune-to-all",
    "name": "Attune to All",
    "school": "creation",
    "requirements": "Greater Infusion, Attune to Race",
    "sourceMageryDc": 27,
    "sourceRange": null,
    "sourceTarget": null,
    "sourceDuration": null,
    "elementalCategory": null,
    "sourcePage": 106,
    "effect": "crafting"
  },
  {
    "id": "attune-to-group",
    "name": "Attune to Group",
    "school": "creation",
    "requirements": "Attune to Individual",
    "sourceMageryDc": 22,
    "sourceRange": null,
    "sourceTarget": null,
    "sourceDuration": null,
    "elementalCategory": null,
    "sourcePage": 106,
    "effect": "crafting"
  },
  {
    "id": "attune-to-individual",
    "name": "Attune to Individual",
    "school": "creation",
    "requirements": "Attune to Self",
    "sourceMageryDc": 18,
    "sourceRange": null,
    "sourceTarget": null,
    "sourceDuration": null,
    "elementalCategory": null,
    "sourcePage": 106,
    "effect": "crafting"
  },
  {
    "id": "attune-to-race",
    "name": "Attune to Race",
    "school": "creation",
    "requirements": "Attune to Group",
    "sourceMageryDc": 24,
    "sourceRange": null,
    "sourceTarget": null,
    "sourceDuration": null,
    "elementalCategory": null,
    "sourcePage": 106,
    "effect": "crafting"
  },
  {
    "id": "attune-to-self",
    "name": "Attune to Self",
    "school": "creation",
    "requirements": "Infusion",
    "sourceMageryDc": 10,
    "sourceRange": null,
    "sourceTarget": null,
    "sourceDuration": null,
    "elementalCategory": null,
    "sourcePage": 107,
    "effect": "crafting"
  },
  {
    "id": "enhancement-automatic-function",
    "name": "Enhancement, Automatic Function",
    "school": "creation",
    "requirements": "Free Action Enhancement, Deactivation Switch Enhancement",
    "sourceMageryDc": 23,
    "sourceRange": null,
    "sourceTarget": null,
    "sourceDuration": null,
    "elementalCategory": null,
    "sourcePage": 107,
    "effect": "crafting"
  },
  {
    "id": "enhancement-deactivation-switch",
    "name": "Enhancement, Deactivation Switch",
    "school": "creation",
    "requirements": "Attune to Individual",
    "sourceMageryDc": 16,
    "sourceRange": null,
    "sourceTarget": null,
    "sourceDuration": null,
    "elementalCategory": null,
    "sourcePage": 107,
    "effect": "crafting"
  },
  {
    "id": "enhancement-dust-size",
    "name": "Enhancement, Dust Size",
    "school": "creation",
    "requirements": "Attune to Group",
    "sourceMageryDc": 14,
    "sourceRange": null,
    "sourceTarget": null,
    "sourceDuration": null,
    "elementalCategory": null,
    "sourcePage": 107,
    "effect": "crafting"
  },
  {
    "id": "enhancement-enlarged-battery",
    "name": "Enhancement, Enlarged Battery",
    "school": "creation",
    "requirements": "Attune to All, Will Powering",
    "sourceMageryDc": 25,
    "sourceRange": null,
    "sourceTarget": null,
    "sourceDuration": null,
    "elementalCategory": null,
    "sourcePage": 107,
    "effect": "crafting"
  },
  {
    "id": "enhancement-free-action-activation",
    "name": "Enhancement, Free Action Activation",
    "school": "creation",
    "requirements": "Attune to Self",
    "sourceMageryDc": 18,
    "sourceRange": null,
    "sourceTarget": null,
    "sourceDuration": null,
    "elementalCategory": null,
    "sourcePage": 107,
    "effect": "crafting"
  },
  {
    "id": "enhancement-hidden-power",
    "name": "Enhancement, Hidden Power",
    "school": "creation",
    "requirements": "Free Action Activation Enhancement",
    "sourceMageryDc": 20,
    "sourceRange": null,
    "sourceTarget": null,
    "sourceDuration": null,
    "elementalCategory": null,
    "sourcePage": 108,
    "effect": "crafting"
  },
  {
    "id": "enhancement-individual-control",
    "name": "Enhancement, Individual Control",
    "school": "creation",
    "requirements": "Attune to Self",
    "sourceMageryDc": 22,
    "sourceRange": null,
    "sourceTarget": null,
    "sourceDuration": null,
    "elementalCategory": null,
    "sourcePage": 108,
    "effect": "crafting"
  },
  {
    "id": "enhancement-self-destruct-switch",
    "name": "Enhancement, Self-Destruct Switch",
    "school": "creation",
    "requirements": "Deactivation Switch Enhancement",
    "sourceMageryDc": 24,
    "sourceRange": null,
    "sourceTarget": null,
    "sourceDuration": null,
    "elementalCategory": null,
    "sourcePage": 108,
    "effect": "crafting"
  },
  {
    "id": "enhancement-single-use",
    "name": "Enhancement, Single Use",
    "school": "creation",
    "requirements": "Self-Destruct Switch Enhancement",
    "sourceMageryDc": 20,
    "sourceRange": null,
    "sourceTarget": null,
    "sourceDuration": null,
    "elementalCategory": null,
    "sourcePage": 108,
    "effect": "crafting"
  },
  {
    "id": "imbue",
    "name": "Imbue",
    "school": "creation",
    "requirements": "Imbue Elixir",
    "sourceMageryDc": 24,
    "sourceRange": null,
    "sourceTarget": null,
    "sourceDuration": null,
    "elementalCategory": null,
    "sourcePage": 108,
    "effect": "crafting"
  },
  {
    "id": "imbue-elixir",
    "name": "Imbue Elixir",
    "school": "creation",
    "requirements": "Attune to Self, Mage Powering",
    "sourceMageryDc": 20,
    "sourceRange": null,
    "sourceTarget": null,
    "sourceDuration": null,
    "elementalCategory": null,
    "sourcePage": 109,
    "effect": "crafting"
  },
  {
    "id": "infusion",
    "name": "Infusion",
    "school": "creation",
    "requirements": "None",
    "sourceMageryDc": 15,
    "sourceRange": null,
    "sourceTarget": null,
    "sourceDuration": null,
    "elementalCategory": null,
    "sourcePage": 110,
    "effect": "crafting"
  },
  {
    "id": "infusion-greater",
    "name": "Infusion, Greater",
    "school": "creation",
    "requirements": "None",
    "sourceMageryDc": 22,
    "sourceRange": null,
    "sourceTarget": null,
    "sourceDuration": null,
    "elementalCategory": null,
    "sourcePage": 110,
    "effect": "crafting"
  },
  {
    "id": "powering-mage",
    "name": "Powering, Mage",
    "school": "creation",
    "requirements": "Attune to Self",
    "sourceMageryDc": 12,
    "sourceRange": null,
    "sourceTarget": null,
    "sourceDuration": null,
    "elementalCategory": null,
    "sourcePage": 110,
    "effect": "crafting"
  },
  {
    "id": "powering-self",
    "name": "Powering, Self",
    "school": "creation",
    "requirements": "Attune to Group, Will Powering",
    "sourceMageryDc": 28,
    "sourceRange": null,
    "sourceTarget": null,
    "sourceDuration": null,
    "elementalCategory": null,
    "sourcePage": 110,
    "effect": "crafting"
  },
  {
    "id": "powering-self-greater",
    "name": "Powering, Self, Greater",
    "school": "creation",
    "requirements": "Self Powering",
    "sourceMageryDc": 32,
    "sourceRange": null,
    "sourceTarget": null,
    "sourceDuration": null,
    "elementalCategory": null,
    "sourcePage": 110,
    "effect": "crafting"
  },
  {
    "id": "powering-will",
    "name": "Powering, Will",
    "school": "creation",
    "requirements": "Attune to Individual, Mage Powering",
    "sourceMageryDc": 20,
    "sourceRange": null,
    "sourceTarget": null,
    "sourceDuration": null,
    "elementalCategory": null,
    "sourcePage": 110,
    "effect": "crafting"
  }
] as const satisfies readonly TechnomageSpell[];

const SPELLS_BY_ID = new Map<string, TechnomageSpell>(
  TECHNOMAGE_SPELLS.map((spell) => [spell.id, spell]),
);
const SCHOOL_BY_ID = new Map(TECHNOMAGE_SCHOOLS.map((school) => [school.id, school]));

export function getTechnomageSchool(
  id: string | null | undefined,
): (typeof TECHNOMAGE_SCHOOLS)[number] | null {
  return id ? SCHOOL_BY_ID.get(id as TechnomageSchool) ?? null : null;
}

export function isTechnomageRole(role: string | null | undefined): boolean {
  return (role ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z]/g, "")
    .includes("technomage");
}

// Spellplätze werden aus gespeicherten Reason-Meilensteinen berechnet.
// Die Berechnung selbst liegt in technomageSpellSlots.ts und wird hier für
// bestehende Aufrufstellen des Spell-Katalogs mit exportiert.

export function technomageSchoolLabel(schoolId: string): string {
  const school = getTechnomageSchool(schoolId);
  return school ? school.label + " (" + school.original + ")" : schoolId;
}

export function technomageSpellFluff(spell: TechnomageSpell): string {
  switch (spell.school) {
    case "defence":
      return "Feine Lichtfäden ordnen sich um Körper und Ausrüstung zu einem flimmernden Schutzmuster.";
    case "elements":
      return "Leuchtende Glyphen lenken Energie und Materie, bis die Umgebung die gewünschte Form annimmt.";
    case "conjuration":
      return "Ein gezeichnetes Muster wird zu einer Projektion oder einem kurzzeitig greifbaren Konstrukt.";
    case "movement":
      return "Gravimetrische Linien flackern auf, während Richtung, Gewicht oder Trägheit neu berechnet werden.";
    case "healing":
      return "Goldene Impulse durchlaufen den Körper und bringen seine biologischen Systeme wieder in Einklang.";
    case "enhancement":
      return "Ein kaum hörbarer Signalton synchronisiert Wahrnehmung, Geist oder Körper auf ein neues Leistungsniveau.";
    case "creation":
      return "Runen schreiben sich in ein Objekt und prägen ihm eine techno-magische Funktion ein.";
  }
}

const TASKS: Record<TechnomageSchool, string> = {
  defence: "Kontrolle + Sicherheit",
  elements: "Wagemut + Technik",
  conjuration: "Verstand + Technik",
  movement: "Wagemut + Steuerung",
  healing: "Kontrolle + Medizin",
  enhancement: "Einsicht + Wissenschaft",
  creation: "Verstand + Technik",
};

export function technomageSpellDifficulty(spell: TechnomageSpell): number {
  if (spell.sourceMageryDc === null) return 2;
  return Math.max(
    1,
    Math.min(5, 1 + Math.floor((spell.sourceMageryDc - 14) / 5)),
  );
}

function staEffectText(effect: TechnomageEffect): string {
  switch (effect) {
    case "attack":
      return "Bei Erfolg löst der Spell einen Challenge mit 1 CD aus. Momentum kann zusätzliche Challenge-Würfel oder ein weiteres Ziel hinzufügen.";
    case "concealment":
      return "Der Spell verleiht einen passenden Merkmal-Trait wie „Verborgen“. Wer ihn durchschauen will, legt einen Gegen-Test mit Einsicht und Sicherheit oder Wissenschaft ab.";
    case "crafting":
      return "Ein erweitertes Technik-und-Verstand-Projekt erschafft ein Ausrüstungs-Asset. Momentum verbessert Qualität oder fügt eine passende Eigenschaft hinzu.";
    case "creation":
      return "Bei Erfolg entsteht ein temporäres Objekt oder eine Reparatur als Asset. Momentum erweitert Qualität, Haltbarkeit oder Umfang.";
    case "defence":
    case "protection":
      return "Bei Erfolg erhält das Ziel einen passenden Schutz-Trait. Momentum kann den Schutz auf ein weiteres Ziel ausdehnen oder bis zum Szenenende verlängern.";
    case "enhancement":
      return "Bei Erfolg erhält das Ziel einen passenden Trait oder einen Bonuswürfel für eine passende Aufgabe. Momentum kann Dauer oder Zahl der Ziele erhöhen.";
    case "healing":
      return "Ein Medizin-Test lindert eine passende Verletzung oder einen Zustand. Bei gewöhnlicher Heilung wird 1 Stress wiederhergestellt; Momentum kann ein weiteres Ziel behandeln.";
    case "illusion":
      return "Bei Erfolg entsteht ein täuschender Trait. Beobachtende können mit einem Gegen-Test aus Einsicht und Sicherheit oder Wissenschaft versuchen, die Täuschung zu erkennen.";
    case "manipulation":
      return "Bei Erfolg verändert der Spell die Umgebung und erzeugt dort einen passenden Trait. Momentum vergrößert den betroffenen Bereich oder verlängert die Wirkung.";
    case "movement":
      return "Bei Erfolg bewegt oder hält der Spell ein Ziel innerhalb der Reichweite oder verleiht einen passenden Bewegungs-Trait. Unwillige Ziele dürfen widerstehen.";
    case "perception":
      return "Ein Wissenschafts-Test enthüllt ein konkretes Signal, Muster oder Detail. Jeder Momentum kann eine zusätzliche Frage zum Befund beantworten.";
    case "summoning":
      return "Bei Erfolg erscheint ein kurzlebiges Konstrukt als Asset mit Qualität 1. Momentum kann seine Qualität, Dauer oder Zahl erhöhen.";
    case "utility":
      return "Der Spell löst eine passende Aufgabe oder schafft einen situativen Vorteil als Trait. Momentum erweitert Reichweite, Dauer oder Zahl der Ziele.";
  }
}

function staRange(sourceRange: string | null): string | null {
  if (!sourceRange) return null;
  const value = sourceRange.toLowerCase();
  if (value.includes("self")) return "Selbst";
  if (value.includes("long")) return "bis zu 3 Zonen";
  if (value.includes("medium")) return "bis zu 2 Zonen";
  if (value.includes("close")) return "gleiche Zone";
  if (value.includes("line of sight")) return "Sichtlinie";
  if (value.includes("touch")) return "Berührung";
  return "siehe Spell-Ziel";
}

function staDuration(
  sourceDuration: string | null,
  isPrimary: boolean,
  isWeak: boolean,
): string | null {
  if (!sourceDuration) return null;
  const value = sourceDuration.toLowerCase();
  if (value.includes("instant")) return "sofort";
  if (value.includes("permanent") || value.includes("until")) {
    return "anhaltend; Ende nach Spielsituation";
  }
  if (value.includes("ongoing")) return "anhaltend, bis aufgehoben oder Szenenende";
  if (value.includes("see text") || value.includes("varies")) {
    return "laut Spell-Detailtext; die Spielleitung legt die Dauer fest";
  }
  if (value.includes("round")) {
    const selected = value.match(
      isPrimary
        ? /(\d+)\s+rounds?\s*\(primary\)/
        : isWeak
          ? /(\d+)\s+rounds?\s*\(weak\)/
          : /(\d+)\s+rounds?\s*\(standard\)/,
    );
    const rounds = Number(selected?.[1] ?? value.match(/(\d+)\s+rounds?/)?.[1] ?? 1);
    return rounds === 1 ? "bis zum Ende der laufenden Runde" : rounds + " Kampfrunden";
  }
  return "bis zum Ende der Szene";
}

function staTarget(sourceTarget: string): string {
  return sourceTarget
    .replace(/One creature, object or location/gi, "eine Kreatur, ein Objekt oder ein Ort")
    .replace(/One creature or vehicle/gi, "eine Kreatur oder ein Fahrzeug")
    .replace(/One creature or object/gi, "eine Kreatur oder ein Objekt")
    .replace(/Creature or object touched/gi, "eine berührte Kreatur oder ein berührtes Objekt")
    .replace(/Creature touched/gi, "eine berührte Kreatur")
    .replace(/Object touched/gi, "ein berührtes Objekt")
    .replace(/All creatures within range/gi, "alle Kreaturen in Reichweite")
    .replace(/Any selected creatures within range/gi, "beliebig viele ausgewählte Kreaturen in Reichweite")
    .replace(/Any creatures within range/gi, "beliebige Kreaturen in Reichweite")
    .replace(/Any creatures in range/gi, "beliebige Kreaturen in Reichweite")
    .replace(/Up to (\d+) creatures/gi, "bis zu $1 Kreaturen")
    .replace(/One creature/gi, "eine Kreatur")
    .replace(/One object/gi, "ein Objekt")
    .replace(/One computer/gi, "ein Computer")
    .replace(/One container/gi, "ein Behälter")
    .replace(/One vehicle/gi, "ein Fahrzeug")
    .replace(/One point in space/gi, "ein Punkt im Raum")
    .replace(/One unoccupied/gi, "ein unbesetzter")
    .replace(/Self/gi, "Selbst")
    .replace(/creatures/gi, "Kreaturen")
    .replace(/creature/gi, "Kreatur")
    .replace(/vehicle/gi, "Fahrzeug")
    .replace(/object/gi, "Objekt")
    .replace(/location/gi, "Ort")
    .replace(/unoccupied/gi, "unbesetzt")
    .replace(/adjacent/gi, "angrenzend")
    .replace(/straight line/gi, "gerade Linie")
    .replace(/square/gi, "Quadrat")
    .replace(/sphere/gi, "Kugel")
    .replace(/cube/gi, "Würfel")
    .replace(/radius/gi, "Radius")
    .replace(/Cone extending away from the mage/gi, "Kegel vom Magier weg")
    .replace(/Cone extending from the mage’s hand/gi, "Kegel aus der Hand des Magiers")
    .replace(/Cone-shaped burst/gi, "kegelförmige Ausbreitung")
    .replace(/Hemispherical area facing away from the mage/gi, "Halbkugelbereich vom Magier weg")
    .replace(/within range/gi, "in Reichweite")
    .replace(/5-foot/gi, "1,5-m")
    .replace(/10-foot/gi, "3-m")
    .replace(/15-foot/gi, "4,5-m")
    .replace(/20-foot/gi, "6-m")
    .replace(/30-foot/gi, "9-m")
    .replace(/50-foot/gi, "15-m")
    .replace(/100-foot/gi, "30-m")
    .replace(/feet/gi, "Fuß")
    .replace(/foot/gi, "Fuß");
}

export function technomageSpellExplanation(
  spell: TechnomageSpell,
  primarySchool: TechnomageSchool | null,
  weakSchools: readonly TechnomageSchool[],
): string {
  const baseDifficulty = technomageSpellDifficulty(spell);
  const isPrimary = spell.school === primarySchool;
  const isWeak = weakSchools.includes(spell.school);
  const difficulty = baseDifficulty + (isWeak ? 1 : 0);
  const aptitude = isPrimary
    ? "Die Primärschule gibt 1 Bonuswürfel."
    : isWeak
      ? "Die schwache Schule erhöht die Schwierigkeit um 1."
      : "Für eine Standardschule gilt keine Änderung.";
  const range = staRange(spell.sourceRange);
  const duration = staDuration(spell.sourceDuration, isPrimary, isWeak);
  const frame = [
    "Task: " + TASKS[spell.school] + ", Schwierigkeit " + difficulty + ".",
    spell.sourceTarget ? "Ziel: " + staTarget(spell.sourceTarget) + "." : "",
    range ? "Reichweite: " + range + "." : "",
    duration ? "Dauer: " + duration + "." : "",
    aptitude,
  ]
    .filter(Boolean)
    .join(" ");
  return frame + " " + staEffectText(spell.effect);
}

function normalizeRequirement(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function nameVariants(spell: TechnomageSpell): string[] {
  const parts = spell.name.split(",").map((part) => part.trim());
  const variants = new Set<string>([spell.name, parts.join(" ")]);
  if (parts.length > 1) {
    const head = parts[0].split(/\s+/);
    const suffix = parts.slice(1).join(" ").split(/\s+/);
    const reversedSuffix = [...suffix].reverse();
    variants.add(suffix.join(" ") + " " + parts[0]);
    variants.add(reversedSuffix.join(" ") + " " + parts[0]);
    variants.add(head[0] + " " + suffix.join(" ") + " " + head.slice(1).join(" "));
    variants.add(head[0] + " " + reversedSuffix.join(" ") + " " + head.slice(1).join(" "));
    if (parts.length > 2) {
      variants.add(parts.at(-1) + " " + parts.at(-2) + " " + parts[0]);
      variants.add(parts.at(-1) + " " + parts.at(-2) + " " + head.slice(1).join(" "));
    }
  }
  return [...variants].map(normalizeRequirement).filter(Boolean);
}

const EXTRA_REQUIREMENT_ALIASES: Record<string, string> = {
  conjuresmallanimal: "conjure-creature-small",
  largevehicularshield: "shield-vehicular-large",
  smallvehicularshield: "shield-vehicular-small",
  minorelementalresistance: "elemental-resistance-lesser",
  standardelementalresistance: "elemental-resistance",
};

const ANY_OF_REQUIREMENTS: Record<string, string[][]> = {
  "elemental-resistance-lesser": [
    ["armour-lesser"],
    [
      "create-acid",
      "create-fire",
      "create-ice",
      "create-lightning",
      "create-sound",
    ],
  ],
};

const MANUAL_REQUIREMENTS: Record<string, string[][]> = {
  "monitor-lifesigns-mass": [
    ["monitor-lifesigns"],
    ["healing-lesser-mass"],
  ],
};

const VARIANT_INDEX = [
  ...TECHNOMAGE_SPELLS.flatMap((spell) =>
    nameVariants(spell).map((variant) => ({ variant, id: spell.id })),
  ),
  ...Object.entries(EXTRA_REQUIREMENT_ALIASES).map(([variant, id]) => ({
    variant,
    id,
  })),
].sort((a, b) => b.variant.length - a.variant.length);

export function spellPrerequisiteGroups(spellId: string): string[][] {
  const spell = SPELLS_BY_ID.get(spellId);
  if (!spell) return [];
  if (MANUAL_REQUIREMENTS[spellId]) return MANUAL_REQUIREMENTS[spellId];
  if (ANY_OF_REQUIREMENTS[spellId]) return ANY_OF_REQUIREMENTS[spellId];

  const text = normalizeRequirement(spell.requirements);
  const matches: { id: string; start: number; end: number }[] = [];
  for (const { variant, id } of VARIANT_INDEX) {
    if (id === spellId || variant.length < 4) continue;
    let start = text.indexOf(variant);
    while (start >= 0) {
      const end = start + variant.length;
      if (!matches.some((match) => start < match.end && match.start < end)) {
        matches.push({ id, start, end });
      }
      start = text.indexOf(variant, start + 1);
    }
  }
  return matches
    .sort((a, b) => a.start - b.start)
    .map((match) => [match.id]);
}

export function getTechnomageSpell(
  id: string,
): TechnomageSpell | undefined {
  return SPELLS_BY_ID.get(id);
}
