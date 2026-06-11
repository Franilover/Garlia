"use client";
import { AdminOnly } from "@/components/forms/AdminOnly";
import EditorEntidades from "@/features/myself/garlia/views/editorGarlia";

export default function DashboardPage() {
  return (
    <AdminOnly>
      <EditorEntidades />
    </AdminOnly>
  );
}