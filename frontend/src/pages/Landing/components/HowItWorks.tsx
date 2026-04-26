import React from 'react';
import { UserPlus, Settings, CalendarCheck } from 'lucide-react';
import GlassCard from '../../../components/ui/GlassCard';

const HowItWorks: React.FC = () => {
  const steps = [
    {
      icon: <UserPlus className="h-6 w-6 text-white" />,
      title: '1. Sign Up & Setup',
      description: 'Register your institution and invite admins, teachers, and students in minutes.'
    },
    {
      icon: <Settings className="h-6 w-6 text-white" />,
      title: '2. Customize Workflow',
      description: 'Set up your unique class structures, subjects, rules, and branding.'
    },
    {
      icon: <CalendarCheck className="h-6 w-6 text-white" />,
      title: '3. Start Tracking',
      description: 'Begin registering attendance. Get automated insights and notifications instantly.'
    }
  ];

  return (
    <section id="how-it-works" className="py-24 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-6 text-white">
            Simple to <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-galaxy-purple">launch</span>
          </h2>
          <p className="text-lg text-galaxy-light/70">
            From zero to fully operational in three straightforward steps.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          <div className="hidden md:block absolute top-1/2 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-galaxy-purple/50 to-transparent -translate-y-1/2 z-0" />
          
          {steps.map((step, index) => (
            <div key={index} className="relative z-10 pt-8 md:pt-0">
               <div className="flex flex-col items-center text-center">
                 <div className="w-16 h-16 rounded-full bg-galaxy-800/80 border-4 border-white/5 flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(109,40,217,0.4)] relative">
                    <div className="absolute inset-0 bg-galaxy-purple opacity-20 rounded-full animate-ping" style={{ animationDuration: '3s' }} />
                    {step.icon}
                 </div>
                 <GlassCard className="p-6 w-full" glow>
                   <h3 className="text-xl font-bold text-white mb-3">{step.title}</h3>
                   <p className="text-galaxy-light/60">
                     {step.description}
                   </p>
                 </GlassCard>
               </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
