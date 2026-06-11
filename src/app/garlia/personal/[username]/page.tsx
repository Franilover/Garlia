"use client";

import { useParams } from "next/navigation";
import PersonalUsername from "@/features/garlia/views/personalUsername";

export default function Page() {
  const params   = useParams();
  const username = params?.username as string;

  return <PersonalUsername username={username} />;
}