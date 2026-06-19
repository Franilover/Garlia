"use client";
import React from "react";

import { MotionMain } from "@/components/ui/Motion";
import SobreMi from "@/features/personal/views/sobre-mi";

export default function Home() {
  return (
    <MotionMain 
      animate={{ opacity: 1, y: 0 }}
      className="min-h-svh bg-bg-main"
      initial={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.5 }}
    >
      <SobreMi />
    </MotionMain>
  );
}