export default function LcarsHeaderBox () {
    return (
        <>
            {/* Titelbox */}
            <div style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            paddingLeft: "24px",
            paddingBottom: "2px",
            }}>
            <div style={{
                fontFamily: "'Antonio', 'Helvetica Neue', Arial, sans-serif",
                fontSize: "11px",
                letterSpacing: "0.25em",
                color: "var(--lcars-orange)",
                opacity: 0.6,
                marginBottom: "2px",
            }}>
                ARCHIV-TERMINAL · SEKTION 7
            </div>
            <div style={{
                fontFamily: "'Antonio', 'Helvetica Neue', Arial, sans-serif",
                fontSize: "28px",
                fontWeight: 700,
                letterSpacing: "0.15em",
                color: "var(--lcars-amber)",
                lineHeight: 1,
            }}>
                NEOVERSE
            </div>
            </div>
        </>
    );
}