import type { Metadata } from "next";

import { DocsHome } from "@/components/velora-docs";
import { docsCollections } from "@/lib/velora-docs";

export const metadata: Metadata = {
  title: "Velora Docs - Help Center",
  description:
    "Find Velora documentation for vesting schedules, claim flows, and token release plans.",
};

export default function DocsPage() {
  return <DocsHome collections={docsCollections} />;
}
