"use client";
import dynamic from 'next/dynamic';

export const MotionDiv = dynamic(
  () => import('framer-motion').then(mod => mod.motion.div),
  { ssr: false }
);

export const MotionButton = dynamic(
  () => import('framer-motion').then(mod => mod.motion.button),
  { ssr: false }
);

export const MotionLi = dynamic(
  () => import('framer-motion').then(mod => mod.motion.li),
  { ssr: false }
);

export const MotionH1 = dynamic(
  () => import('framer-motion').then(mod => mod.motion.h1),
  { ssr: false }
);