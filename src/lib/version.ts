// Versionsnummer ist wie folgt aufgebaut: <MajorVersion>.<MinorVersion>.<Subversion>
// Die Major-Version wird nur händisch erhöht
// Die Minor-Version erhöht sich bei jedem Pullrequest (reset auf 0 bei neuer Major-Version)
// Die Sub-Version erhöht sich bei jedem Commit im aktuellen PR (reset auf 0 bei neuem PR)
export const APP_VERSION: string = "1.16.10";
