// components/ui/Motion.tsx
"use client";
import dynamic from 'next/dynamic';
import type { HTMLMotionProps } from 'framer-motion';

// Carga framer-motion solo cuando el componente se monta en el cliente
const MotionDiv = dynamic(
  () => import('framer-motion').then(mod => mod.motion.div),
  { ssr: false }
);

const MotionButton = dynamic(
  () => import('framer-motion').then(mod => mod.motion.button),
  { ssr: false }
);

const MotionLi = dynamic(
  () => import('framer-motion').then(mod => mod.motion.li),
  { ssr: false }
);

export { MotionDiv, MotionButton, MotionLi };