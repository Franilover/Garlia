"use client";
import React from "react";

export function LectorSkeleton() {
  return (
    <div className="min-h-screen bg-bg-main pb-24 animate-pulse">
      <div className="sticky top-0 z-50 bg-bg-main/80 backdrop-blur-md border-b border-primary/5 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
          <div className="w-6 h-6 rounded-[var(--radius-input)] bg-primary/10" />
          <div className="flex flex-col items-center gap-2">
            <div className="h-2 w-24 rounded-full bg-primary/10" />
            <div className="h-6 w-32 rounded-[var(--radius-btn)] bg-primary/10" />
          </div>
          <div className="w-6 h-6 rounded-[var(--radius-input)] bg-primary/10" />
        </div>
      </div>
      <div className="max-w-2xl mx-auto px-6 py-12 md:py-20">
        <div className="space-y-4">
          {[100, 85, 95, 70, 90, 60, 80, 75].map((w, i) => (
            <div key={i} className="h-4 rounded-full bg-primary/8" style={{ width: `${w}%` }} />
          ))}
        </div>
      </div>
    </div>
  );
}
