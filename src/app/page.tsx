import { LcarsStats } from "@/components/lcars";
import LandingPage from "./LandingPage";

export default function Page() {
  return <LandingPage stats={<LcarsStats />} />;
}
