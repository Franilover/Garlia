"use client";

import React from "react";

import { IDIOMAS } from "../../constants";
import type { IdiomaKey } from "../../types";

export const IdiomaTab = ({
  value, onChange, exclude,
}: {
  value: IdiomaKey;
  onChange: (v: IdiomaKey) => void;
  exclude?: IdiomaKey;
}) => (
  <div className="flex gap-1 p-1 bg-primary/5 rounded-xl border border-primary/10">
    {IDIOMAS.filter(i => i.id !== exclude).map(({ id, label }) => (
      <button
        key={id}
        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
          value === id
            ? "bg-primary text-bg-main shadow-md shadow-primary/20"
            : "text-primary/40 hover:text-primary"
        }`}
        onClick={() => onChange(id)}
      >
        {label}
      </button>
    ))}
  </div>
);
