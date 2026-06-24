import React, { useEffect } from 'react';
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
  useEffect(() => {
    document.title = "AttendX | Galactic Attendance Tracking & Accreditation Compliance System";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute(
        'content',
        "AttendX is an automated college attendance management system. Simplify student tracking, resolve 75% attendance shortages, and compile compliance audit reports."
      );
    }
  }, []);

  return (
    <div className="relative">
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
