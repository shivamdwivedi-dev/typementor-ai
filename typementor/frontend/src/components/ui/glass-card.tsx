import * as React from 'react';
import { ArrowUpRight, Brain } from 'lucide-react';

export interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  accentClassName?: string;
  actionLabel?: string;
}

const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  ({
    className = '',
    title = 'TypeMentor AI',
    description = 'Practice with focused feedback that helps you build speed and accuracy.',
    icon = <Brain className="h-5 w-5" aria-hidden="true" />,
    accentClassName = 'text-brand-primary',
    actionLabel,
    ...props
  }, ref) => {
    return (
      <div
        ref={ref}
        className={`group h-[280px] w-full max-w-[290px] [perspective:1000px] ${className}`}
        {...props}
      >
        <div className="relative h-full overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-br from-slate-900 via-brand-bg to-slate-950 shadow-2xl transition-all duration-500 ease-in-out [transform-style:preserve-3d] group-hover:[box-shadow:rgba(0,0,0,0.4)_24px_36px_24px_-30px,rgba(99,102,241,0.2)_0px_20px_30px_0px] group-hover:[transform:rotate3d(1,1,0,8deg)]">
          <div className="absolute inset-2 rounded-[28px] border-b border-l border-white/15 bg-gradient-to-b from-white/10 to-transparent backdrop-blur-sm [transform-style:preserve-3d] [transform:translate3d(0,0,25px)]" />

          <div className="relative z-10 flex h-full flex-col justify-between p-7 [transform:translate3d(0,0,26px)]">
            <div>
              <div className={`mb-5 grid h-11 w-11 place-content-center rounded-2xl border border-white/10 bg-white/10 ${accentClassName}`}>
                {icon}
              </div>
              <h3 className="text-xl font-black text-white">{title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-300">{description}</p>
            </div>

            {actionLabel && (
              <span className="flex items-center gap-1.5 text-xs font-bold text-white transition-transform duration-200 group-hover:translate-x-1">
                {actionLabel}
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </span>
            )}
          </div>

          <div className="absolute right-0 top-0 [transform-style:preserve-3d]" aria-hidden="true">
            {[170, 140, 110, 80].map((size, index) => (
              <div
                key={size}
                className="absolute aspect-square rounded-full bg-brand-primary/10 shadow-[-10px_10px_20px_rgba(100,100,111,0.12)] transition-all duration-500 ease-in-out group-hover:bg-brand-primary/20"
                style={{
                  width: `${size}px`,
                  top: `${8 + index * 3}px`,
                  right: `${8 + index * 3}px`,
                  transform: `translate3d(0, 0, ${(index + 1) * 20}px)`,
                  transitionDelay: `${index * 100}ms`,
                }}
              />
            ))}
            <div className="absolute right-[30px] top-[30px] grid aspect-square w-[50px] place-content-center rounded-full border border-white/20 bg-brand-primary text-white shadow-[-10px_10px_20px_rgba(100,100,111,0.2)] transition-all duration-500 [transform:translate3d(0,0,100px)] group-hover:[transform:translate3d(0,0,120px)]">
              {icon}
            </div>
          </div>
        </div>
      </div>
    );
  }
);

GlassCard.displayName = 'GlassCard';

export default GlassCard;
