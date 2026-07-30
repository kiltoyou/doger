import React from "react";
import { API_URL } from "../lib/api";

interface AvatarProps {
  url?: string | null;
  color?: string;
  name: string;
  size?: number;
  className?: string;
}

export default function Avatar({ url, color = "#2D7CFF", name, size = 40, className = "" }: AvatarProps) {
  if (url) {
    return (
      <img
        src={url.startsWith("http") ? url : `${API_URL}${url}`}
        alt={name}
        className={`rounded-full object-cover shrink-0 ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className={`rounded-full flex items-center justify-center text-white font-semibold shrink-0 ${className}`}
      style={{ width: size, height: size, background: color, fontSize: size * 0.4 }}
    >
      {name[0]?.toUpperCase()}
    </div>
  );
}
