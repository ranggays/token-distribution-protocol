import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DocsArticleView } from "@/components/velora-docs";
import { docsCollections, getDocsArticle } from "@/lib/velora-docs";

type ArticlePageProps = {
  params: Promise<{ collection: string; slug: string }>;
};

export function generateStaticParams() {
  return docsCollections.flatMap((collection) =>
    collection.articles.map((article) => ({
      collection: collection.slug,
      slug: article.slug,
    })),
  );
}

export async function generateMetadata({
  params,
}: ArticlePageProps): Promise<Metadata> {
  const { collection: collectionSlug, slug } = await params;
  const result = getDocsArticle(collectionSlug, slug);

  if (!result) {
    return {
      title: "Velora Docs",
    };
  }

  return {
    title: `${result.article.title} - Velora Docs`,
    description: result.article.description,
  };
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { collection: collectionSlug, slug } = await params;
  const result = getDocsArticle(collectionSlug, slug);

  if (!result) notFound();

  return <DocsArticleView article={result.article} collection={result.collection} />;
}
