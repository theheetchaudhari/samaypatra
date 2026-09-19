import Hero from '../components/home/Hero';
import HowItWorks from '../components/home/HowItWorks';
import WhySamaypatra from '../components/home/WhySamaypatra';
import SupportedInputs from '../components/home/SupportedInputs';
import Features from '../components/home/Features';
import DemoPreview from '../components/home/DemoPreview';
import FinalCTA from '../components/home/FinalCTA';
import '../components/home/home.css';

export default function Home() {
  return (
    <div className="home-container">
      <Hero />
      <HowItWorks />
      <WhySamaypatra />
      <SupportedInputs />
      <Features />
      <DemoPreview />
      <FinalCTA />
    </div>
  );
}
