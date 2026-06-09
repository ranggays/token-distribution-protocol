import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DocsCollectionView } from "@/components/velora-docs";
import { docsCollections, getDocsCollection } from "@/lib/velora-docs";

type CollectionPageProps = {
  params: Promise<{ collection: string }>;
};

export function generateStaticParams() {
  return docsCollections.map((collection) => ({
    collection: collection.slug,
  }));
}

export async function generateMetadata({
  params,
}: CollectionPageProps): Promise<Metadata> {
  const { collection: collectionSlug } = await params;
  const collection = getDocsCollection(collectionSlug);

  if (!collection) {
    return {
      title: "Velora Docs",
    };
  }

  return {
    title: `${collection.title} - Velora Docs`,
    description: collection.description,
  };
}

export default async function CollectionPage({ params }: CollectionPageProps) {
  const { collection: collectionSlug } = await params;
  const collection = getDocsCollection(collectionSlug);

  if (!collection) notFound();

  return <DocsCollectionView collection={collection} />;
}
