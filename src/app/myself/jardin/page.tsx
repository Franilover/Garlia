"use client";
import { AdminOnly } from "@/components/forms/AdminOnly";
import EditorEntidades from "@/components/paginas/myself/jardin/editorEntidades";

export default function DashboardPage() {
  return (
    <AdminOnly>
      <EditorEntidades />
    </AdminOnly>
  );
}