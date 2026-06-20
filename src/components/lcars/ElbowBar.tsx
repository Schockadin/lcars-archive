export default function ElbowBar() {
  return (
    <div
      className="flex flex-col gap-[5px]"
      style={{
        position: "sticky",
        top: "calc(var(--lcars-header-h) - 20px)",
        marginTop: "-20px",
        marginLeft: "-64px",
        background: "var(--lcars-bg)",
      }}
    >
      <div className="lcars-elbow-bar">
        <div className="w-[35%] h-[20px] bg-[var(--lcars-blue)] mr-[5px]" />
        <div className="w-[5%] h-[20px] bg-[var(--lcars-amber)] mr-[5px]" />
        <div className="w-[20%] h-[20px] bg-[var(--lcars-purple)] mr-[5px]" />
        <div className="w-[35%] h-[20px] bg-[var(--lcars-purple)] mr-[5px]" />
        <div className="w-[5%] h-[20px] bg-[var(--lcars-red)]" />
      </div>
      <div className="lcars-elbow-bar">
        <div className="w-[35%] h-[20px] bg-[var(--lcars-red)] mr-[5px]" />
        <div className="w-[5%] h-[20px] bg-[var(--lcars-orange)] mr-[5px]" />
        <div className="w-[20%] h-[10px] bg-[var(--lcars-amber)] mr-[5px]" />
        <div className="w-[35%] h-[20px] bg-[var(--lcars-purple)] mr-[5px]" />
        <div className="w-[5%] h-[20px] bg-[var(--lcars-orange)]" />
      </div>
    </div>
  );
}
