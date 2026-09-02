"use client";
import { useParams, usePathname, useRouter } from "next/navigation";
import Switch from "@/components/lcars/Switch";

// Umschalter zwischen den beiden Ansichten eines eigenen Charakters: dem
// Charakterbogen (/stats) und den Stammdaten der Akte (/edit). Beide Seiten
// gehören zusammen, sind aber eigene Routen — der Schalter wechselt deshalb
// die Route, statt den Inhalt umzuschalten. Er steht im Layout und damit über
// beiden Seiten.
type Tab = "stats" | "edit";

export default function CharacterTabs() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams<{ characterId: string }>();

  const active: Tab = pathname.endsWith("/edit") ? "edit" : "stats";

  return (
    <Switch<Tab>
      options={[
        { key: "stats", label: "Charakterbogen" },
        { key: "edit", label: "Stammdaten" },
      ]}
      active={active}
      onChange={(tab) =>
        router.push(`/user/characters/${params.characterId}/${tab}`)
      }
      className="mb-[12px] max-w-[420px]"
    />
  );
}
