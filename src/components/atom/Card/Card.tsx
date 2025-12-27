// src/components/ui/Card.tsx
import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = "" }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-slate-100 ${className}`}>
    {children}
  </div>
);

export const CardHeader: React.FC<CardProps> = ({ children, className = "" }) => (
  <div
    className={`px-4 py-3 border-b border-slate-100 flex items-center justify-between ${className}`}
  >
    {children}
  </div>
);

export const CardBody: React.FC<CardProps> = ({ children, className = "" }) => (
  <div className={`px-4 py-4 ${className}`}>{children}</div>
);
