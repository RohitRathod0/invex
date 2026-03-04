import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { HeroSection } from '@/components/sections/HeroSection';
import { TrustedBy } from '@/components/sections/TrustedBy';
import { CashFlowSection } from '@/components/sections/CashFlowSection';
import { AIAdvisorSection } from '@/components/sections/AIAdvisorSection';
import { TestimonialsSection } from '@/components/sections/TestimonialsSection';
import { DashboardSection } from '@/components/sections/DashboardSection';
import { CTASection } from '@/components/sections/CTASection';

export default function HomePage() {
  return (
    <main>
      <Navbar />
      <HeroSection />
      <TrustedBy />
      <CashFlowSection />
      <AIAdvisorSection />
      <TestimonialsSection />
      <DashboardSection />
      <CTASection />
      <Footer />
    </main>
  );
}
