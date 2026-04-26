import React from 'react';
import { Clock, Shield, BarChart3, Bell, Users } from 'lucide-react';
import GlassCard from '../../../components/ui/GlassCard';

const Features: React.FC = () => {
  const features = [
    {
      icon: <Clock className="h-8 w-8 text-galaxy-purple" />,
      title: 'Real-time Attendance',
      description: 'Track attendance instantly with live syncing across all teacher and admin dashboards.'
    },
    {
      icon: <Shield className="h-8 w-8 text-blue-400" />,
      title: 'Role-based Dashboards',
      description: 'Secure, tailor-made interfaces for Admins, Teachers, and Students.'
    },
    {
      icon: <BarChart3 className="h-8 w-8 text-emerald-400" />,
      title: 'Reports & Analytics',
      description: 'Generate detailed exportable reports on class, subject, or student-level attendance patterns.'
    },
    {
      icon: <Bell className="h-8 w-8 text-yellow-400" />,
      title: 'Notifications',
      description: 'Automated alerts for parents and students regarding short attendance or absences.'
    },
    {
      icon: <Users className="h-8 w-8 text-pink-400" />,
      title: 'Multi-class Management',
      description: 'Effortlessly oversee multiple sections, branches, and semesters from a unified hub.'
    }
  ];

  return (
    <section id="features" className="py-24 relative">
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-6 text-white">
            Everything you need to <span className="text-transparent bg-clip-text bg-gradient-to-r from-galaxy-light to-galaxy-purple">succeed</span>
          </h2>
          <p className="text-lg text-galaxy-light/70">
            A comprehensive suite of tools designed exclusively for modern academic environments.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <GlassCard 
              key={index} 
              className={`p-8 ${index === 3 ? 'md:col-span-2 lg:col-span-1' : ''} ${index === 4 ? 'lg:col-span-2' : ''}`}
              glow
            >
              <div className="bg-white/5 w-16 h-16 rounded-2xl flex items-center justify-center mb-6">
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
              <p className="text-galaxy-light/60 leading-relaxed">
                {feature.description}
              </p>
            </GlassCard>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
