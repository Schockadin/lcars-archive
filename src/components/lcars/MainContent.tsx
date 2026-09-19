import { Suspense } from "react";
import HashScrollRestorer from "./HashScrollRestorer";
import PullToRefresh from "./PullToRefresh";
import ScrollTopButton from "./ScrollTopButton";

export default function MainContent({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="lcars-main-content flex-1 overflow-y-auto min-h-0 lcars-scroll py-[5px]">
      <PullToRefresh />
      {/* HashScrollRestorer liest usePathname() (rendert selbst nur null) —
          unter cacheComponents braucht das auf dynamischen Routen eine
          Suspense-Grenze. */}
      <Suspense fallback={null}>
        <HashScrollRestorer />
      </Suspense>
      <main id="lcars-main" tabIndex={-1} className="flex-1 w-full flex flex-col">
        <div className="w-full h-full">{children}</div>
      </main>
      {/* Letztes Kind der Scrollfläche: Von hier aus findet der Knopf sie per
          closest, und sein klebender Kasten liegt über allem, was darüber
          steht (siehe .scroll-top-dock in shared.css). */}
      <ScrollTopButton />
    </div>
  );
}
