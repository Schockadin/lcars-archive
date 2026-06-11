import { DatapadLayout, MAIN_NAV } from '@/components/lcars';

export default function Home() {
  const nav = MAIN_NAV.map(item =>
    item.href === '/' ? { ...item, active: true } : item
  );

  return (
    <DatapadLayout
      title="Kampagnen-Archiv"
      nav={nav}
      statusLeft="BETRIEB NOMINAL"
      statusRight="STERNENFLOTTEN-DATENBANK // V.2409"
    >
      {/* Hier kommt später der Dashboard-Content */}
      <div className="lcars-card p-6 max-w-lg">
        <p className="lcars-label mb-2">System</p>
        <p className="lcars-heading text-xl">Layout aktiv</p>
        <p className="lcars-data mt-2">Datapad-Interface bereit.</p>
      </div>
    </DatapadLayout>
  );
}