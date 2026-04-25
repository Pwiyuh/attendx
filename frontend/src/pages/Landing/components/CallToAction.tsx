import React from 'react';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const CallToAction: React.FC = () => {
  return (
    <section className="py-20 relative overflow-hidden bg-[#0B0B1A]">
      <div className="absolute inset-0 w-full h-full">
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-galaxy-purple/30 rounded-full mix-blend-screen filter blur-[150px] pointer-events-none" />
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
        <h2 className="text-4xl sm:text-5xl font-extrabold text-white mb-6 tracking-tight">
          Ready to transform attendance management?
        </h2>
        <p className="text-xl text-galaxy-light/80 mb-10 max-w-2xl mx-auto">
          Join hundreds of forward-thinking institutions already saving time and improving academic outcomes.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link 
            to="/get-started" 
            className="w-full sm:w-auto px-8 py-4 rounded-full bg-white text-galaxy-900 font-bold text-lg hover:bg-galaxy-light transition-colors flex items-center justify-center group"
          >
            Get Started <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <button className="w-full sm:w-auto px-8 py-4 rounded-full border border-white/20 text-white font-bold text-lg hover:bg-white/10 transition-colors backdrop-blur-md">
            Talk to Sales
          </button>
        </div>
      </div>
    </section>
  );
};

export default CallToAction;
