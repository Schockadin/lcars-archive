import { useNeo } from "@/hooks/useNeo";
import { MAIN_NAV } from "@/lib/nav";
import LcarsMenuItem from "./MenuItem";

export default function SideBarMenu() {
  const { activeSection } = useNeo();

  return (
    <div className="flex flex-1 min-h-0">
      <div className="flex flex-col flex-1 min-h-0">
        <div className="lcars-elbow-bottom h-[150px]" />
        <div className="flex flex-col items-stretch flex-1 min-h-0">
          {MAIN_NAV.map((nav) => (
            <LcarsMenuItem
              id={nav.id}
              text={nav.label}
              href={nav.href}
              key={nav.id}
              active={activeSection === nav.href.split("/")[1]}
              type="bar"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
