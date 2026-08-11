import { Suspense } from "react";
import { LcarsHeaderBar } from ".";
import HeaderContent from "./HeaderContent";
import HeaderSkeleton from "./HeaderSkeleton";

export default function Header() {
  return (
    <header
      style={{
        width: "100%",
        height:
          "calc(var(--lcars-header-h) + 5px + calc(2 * var(--lcars-bar-h)))",
      }}
    >
      {/* HeaderContent liest usePathname() — unter cacheComponents braucht das
          auf dynamischen Routen eine Suspense-Grenze. Fallback ist dasselbe
          Skeleton, das HeaderContent selbst zeigt, solange die Session lädt. */}
      <Suspense
        fallback={
          <div className="lcars-header-content">
            <HeaderSkeleton columns={3} />
          </div>
        }
      >
        <HeaderContent />
      </Suspense>
      <LcarsHeaderBar />
    </header>
  );
}
