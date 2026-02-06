import { Suspense } from "react";
import MeditationClient from "./MeditationClient";

export default function MeditationPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <MeditationClient />
    </Suspense>
  );
}
