import LandingPage from "./LandingPage";
import LandingStats from "@/components/lcars/LandingStats";

export default function Page() {
  return <LandingPage stats={<LandingStats />} />;
}
