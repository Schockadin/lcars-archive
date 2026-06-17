import LcarsSidebar from "./LcarsSidebar"

export default function LcarsMainContent ({ children }: { children: React.ReactNode }) {
    return (
        <div className="lcars-main-content">
            <LcarsSidebar/>
        <main className="w-full flex justify-center p-[16px]">{children}</main>
        </div>
    );
}