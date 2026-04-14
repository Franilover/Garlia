"use client";
import { MotionButton } from '@/components/ui/Motion';
import React from "react";
import { ChevronRight as ChevronR } from "lucide-react";
import { useToast } from "@/hooks/ui/useToast";
import { useConfirm } from "@/components/ui/ConfirmModal";
import { ToastContainer } from "@/components/ui/ToastContainer";

export function ChoiceButton({ label, onSelect }: { label: string; onSelect: () => void }) {
  return (
    <MotionButton
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      onClick={onSelect}
      className="flex items-center justify-between w-full my-3 p-4 rounded-[var(--radius-btn)] border border-primary/20 bg-primary/5 hover:bg-primary text-primary hover:text-white transition-all group"
    >
      <span className="font-black uppercase text-xs tracking-widest">{label}</span>
      <ChevronR size={16} className="opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
    </MotionButton>
  );
}

export function UseWord({ word, itemId, targetSuccess, targetFail, onNavigate }: {
  word: string;
  itemId: string;
  targetSuccess: string;
  targetFail?: string;
  onNavigate: (capId: string) => void;
}) {
  const { toasts, toast, dismiss } = useToast();
  const { confirm, ConfirmModal } = useConfirm();

  const handleUse = async () => {
    const ok = await confirm({
      title: "Usar objeto",
      message: `¿Quieres usar "${word}"?`,
      confirmLabel: "Usar",
    });
    if (ok) {
      onNavigate(targetSuccess);
    } else {
      if (targetFail) {
        onNavigate(targetFail);
      } else {
        toast.warning("No tienes el objeto necesario o decidiste no usarlo.");
      }
    }
  };

  return (
    <>
      <button onClick={handleUse} className="relative inline font-serif cursor-pointer group text-amber-600 hover:text-amber-700 font-bold transition-colors">
        <span style={{ borderBottom: "2px dotted currentColor" }}>{word}</span>
      </button>
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
      <ConfirmModal />
    </>
  );
}
