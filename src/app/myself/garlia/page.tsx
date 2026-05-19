"use client";
import { AdminOnly } from "@/components/forms/AdminOnly";
import EditorEntidades from "@/components/paginas/myself/jardin/editorGarlia";

export default function DashboardPage() {
  return (
    <AdminOnly>
      <EditorEntidades />
    </AdminOnly>
  );
}