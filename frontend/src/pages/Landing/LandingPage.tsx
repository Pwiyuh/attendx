import React from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Stats from './components/Stats';
import Features from './components/Features';
import HowItWorks from './components/HowItWorks';
import Customization from './components/Customization';
import Pricing from './components/Pricing';
import CallToAction from './components/CallToAction';
import Footer from './components/Footer';

const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-galaxy-900 text-text-primary selection:bg-galaxy-purple selection:text-white font-sans overflow-x-hidden">
      <Navbar />
      <main>
        <Hero />
        <Stats />
        <Features />
        <HowItWorks />
        <Customization />
        <Pricing />
        <CallToAction />
      </main>
      <Footer />
    </div>
  );
};

export default LandingPage;
