import React from 'react';
import GlassCard from '../../../components/ui/GlassCard';

const Stats: React.FC = () => {
  const stats = [
    { value: '10,000+', label: 'Students Managed' },
    { value: '250+', label: 'Institutions' },
    { value: '1M+', label: 'Attendance Records' }
  ];

  return (
    <section className="py-24 relative z-10 bg-galaxy-900 border-t border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {stats.map((stat, index) => (
            <GlassCard key={index} className="px-6 py-12 text-center" glow>
              <div className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-galaxy-purple mb-2">
                {stat.value}
              </div>
              <div className="text-lg text-galaxy-light/70 font-medium">
                {stat.label}
              </div>
            </GlassCard>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Stats;
