"use client";

import { useParams } from "next/navigation";
import PersonalUsername from "@/components/paginas/garlia/personalUsername";

export default function Page() {
  const params   = useParams();
  const username = params?.username as string;

  return <PersonalUsername username={username} />;
}