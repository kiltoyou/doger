import React from "react";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export default function GlassCard({ children, className = "", style = {} }: GlassCardProps) {
  return (
    <div
      className={`backdrop-blur-xl border border-white/10 ${className}`}
      style={{ background: "rgba(255,255,255,0.04)", ...style }}
    >
      {children}
    </div>
  );
}
