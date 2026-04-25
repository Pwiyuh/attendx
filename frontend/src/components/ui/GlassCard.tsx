import React from 'react';
import classNames from 'classnames';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
}

const GlassCard: React.FC<GlassCardProps> = ({ children, className, glow = false }) => {
  return (
    <div 
      className={classNames(
        'relative overflow-hidden rounded-2xl md:rounded-3xl',
        'bg-white/5 backdrop-blur-2xl border border-white/10',
        'shadow-[0_0_40px_rgba(139,92,246,0.2)]', // Requested default shadow
        'transition-all duration-500 hover:-translate-y-1', // Lift effect and smooth transition
        {
          'hover:shadow-[0_0_60px_rgba(139,92,246,0.5)] hover:border-galaxy-purple/60': glow, // strong intensified glow
          'hover:shadow-[0_0_50px_rgba(139,92,246,0.3)] hover:border-white/20': !glow, // subtle glow intensification
        },
        className
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
      <div className="relative z-10 w-full h-full">
        {children}
      </div>
    </div>
  );
};

export default GlassCard;
