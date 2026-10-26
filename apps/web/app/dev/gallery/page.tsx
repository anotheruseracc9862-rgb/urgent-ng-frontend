import { notFound } from "next/navigation";
import { PrimitiveGallery } from "@/features/ui/primitive-gallery";

export const metadata = { title: "Component gallery — Urgent.ng" };
export const dynamic = "force-dynamic";

export default function ComponentGalleryPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <PrimitiveGallery />;
}
