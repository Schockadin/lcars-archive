export default function LcarsElbowBar() {

    return (
        <div className="lcars-elbow-bar">
            {/* Obere Bar */}
            <div className="flex w-full h-[16px]">
                <div className="lcars-elbow-top" />
                <div className="w-[35%] h-[16px] bg-[var(--lcars-blue)] mr-[5px]" />
                <div className="w-[5%] h-[16px] bg-[var(--lcars-amber)]  mr-[5px]" />
                <div className="w-[20%] h-[16px] bg-[var(--lcars-purple)]  mr-[5px]" />
                <div className="w-[35%] h-[16px] bg-[var(--lcars-purple)]  mr-[5px]" />
                <div className="w-[5%] h-[16px] bg-[var(--lcars-red)]" />
            </div>

            {/* Untere Bar */}
            <div className="flex w-full h-[16px]">
                <div className="lcars-elbow-bottom" />
                <div className="w-[35%] h-[16px] bg-[var(--lcars-red)]  mr-[5px]" />
                <div className="w-[5%] h-[16px] bg-[var(--lcars-amber-light)]  mr-[5px]" />
                <div className="w-[20%] h-[8px] bg-[var(--lcars-amber-light)]  mr-[5px]" />
                <div className="w-[35%] h-[16px] bg-[var(--lcars-purple)]  mr-[5px]" />
                <div className="w-[5%] h-[16px] bg-[var(--lcars-amber)]" />
            </div>
        </div>
    );
}