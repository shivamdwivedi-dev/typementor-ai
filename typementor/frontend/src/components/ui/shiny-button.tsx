import type React from 'react';
import './shiny-button.css';

interface ShinyButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  className?: string;
}

export function ShinyButton({ children, className = '', type = 'button', ...props }: ShinyButtonProps) {
  return (
    <button className={`shiny-cta ${className}`} type={type} {...props}>
      <span>{children}</span>
    </button>
  );
}