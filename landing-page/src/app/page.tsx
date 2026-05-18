import { VeloraNav } from "@/components/velora-nav";
import { VeloraMotion } from "@/components/velora-motion";
import { VeloraLoader } from "@/components/velora-loader";
import {
  CapabilitiesSection,
  CasesSection,
  ContactSection,
  HeroSection,
  VeloraFooter,
  IntroSection,
  VisionSection,
} from "@/components/velora-sections";

export default function Home() {
  return (
    <>
      <VeloraLoader />
      <div className="noise-effect" aria-hidden="true" />
      <VeloraMotion />
      <VeloraNav />
      <main className="main-content" id="main-content">
        <HeroSection />
        <IntroSection />
        <CapabilitiesSection />
        <CasesSection />
        <VisionSection />
        <ContactSection />
      </main>
      <VeloraFooter />
    </>
  );
}
