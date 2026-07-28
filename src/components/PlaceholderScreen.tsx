import React from "react";

export default function PlaceholderScreen({ title }: { title: string }) {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-[#8A93A6] text-sm">{title} — скоро здесь будет контент</div>
    </div>
  );
}
