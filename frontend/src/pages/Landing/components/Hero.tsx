import React from 'react';
import { ArrowRight, PlayCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import GlassCard from '../../../components/ui/GlassCard';

const Hero: React.FC = () => {
  return (
    <section id="home" className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden text-white">

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center z-10">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-extrabold tracking-tight mb-8">
            <span className="block mb-2">Smarter Attendance</span>
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-galaxy-light via-white to-galaxy-purple">Starts Here</span>
          </h1>
          <p className="mt-4 text-xl sm:text-2xl text-galaxy-light/80 mb-10 text-balance animate-float" style={{ animationDuration: '8s' }}>
            Automate, track, and manage attendance effortlessly with real-time insights tailored for modern institutions.
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
            <Link to="/get-started" className="w-full sm:w-auto px-8 py-4 flex items-center justify-center text-base font-semibold rounded-full bg-galaxy-purple hover:bg-galaxy-blue text-white transition-all shadow-[0_0_30px_rgba(109,40,217,0.5)] group">
              Get Started <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <button className="w-full sm:w-auto px-8 py-4 flex items-center justify-center text-base font-semibold text-white border border-white/20 rounded-full hover:bg-white/10 transition-colors group backdrop-blur-md">
              <PlayCircle className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" /> Book Demo
            </button>
          </div>
        </div>

        {/* Dashboard Mockup */}
        <div className="mt-20 mx-auto max-w-5xl relative animate-float">
          <GlassCard glow className="p-2 sm:p-4">
            <div className="rounded-xl overflow-hidden border border-white/10 bg-[#0B0B1A]/80 shadow-2xl relative aspect-[16/9] flex items-center justify-center">
              {/* Fake UI */}
              <div className="absolute inset-x-0 top-0 h-10 border-b border-white/10 bg-white/5 flex items-center px-4 space-x-2">
                <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
              </div>
              <div className="w-full h-full pt-10 px-6 flex flex-col gap-6">
                 {/* Mock UI elements */}
                 <div className="flex justify-between items-center mt-6">
                    <div className="w-1/3 h-8 bg-white/10 rounded-lg animate-pulse" />
                    <div className="w-32 h-8 bg-galaxy-purple/40 rounded-full" />
                 </div>
                 <div className="grid grid-cols-3 gap-4 h-24">
                   <div className="bg-white/5 rounded-xl border border-white/5 p-4 flex flex-col justify-center">
                     <div className="w-1/2 h-4 bg-white/10 rounded mb-3" />
                     <div className="w-3/4 h-6 bg-white/20 rounded" />
                   </div>
                   <div className="bg-white/5 rounded-xl border border-white/5 p-4 flex flex-col justify-center">
                     <div className="w-1/2 h-4 bg-white/10 rounded mb-3" />
                     <div className="w-3/4 h-6 bg-white/20 rounded" />
                   </div>
                   <div className="bg-white/5 rounded-xl border border-white/5 p-4 flex flex-col justify-center">
                     <div className="w-1/2 h-4 bg-white/10 rounded mb-3" />
                     <div className="w-3/4 h-6 bg-white/20 rounded" />
                   </div>
                 </div>
                 <div className="flex-1 bg-white/5 rounded-xl border border-white/5 mt-2" />
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </section>
  );
};

export default Hero;
