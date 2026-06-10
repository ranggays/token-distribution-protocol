"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

import {
  type DocsArticle,
  type DocsCollection,
  getAllDocsSearchResults,
} from "@/lib/velora-docs";

type DocsHomeProps = {
  collections: DocsCollection[];
};

type DocsCollectionProps = {
  collection: DocsCollection;
};

type DocsArticleProps = {
  article: DocsArticle;
  collection: DocsCollection;
};

const searchResults = getAllDocsSearchResults();
const veloraLogoSrc = "/images/velora/icons/velora4.webp";

function DocsTopBar() {
  return (
    <header className="docs-topbar">
      <Link href="/" className="docs-brand">
        <Image
          className="docs-brand-mark"
          src={veloraLogoSrc}
          alt=""
          width={40}
          height={40}
          priority
        />
        <span>Velora Docs</span>
      </Link>
      <div className="docs-topbar-links">
        <Link href="/docs">All collections</Link>
        <Link href="/app">Open app</Link>
      </div>
    </header>
  );
}

function DocsSearch({ collectionSlug }: { collectionSlug?: string }) {
  const [query, setQuery] = useState("");

  const filteredResults = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const scopedResults = collectionSlug
      ? searchResults.filter((result) => result.collectionSlug === collectionSlug)
      : searchResults;

    if (!normalizedQuery) return scopedResults.slice(0, 4);

    return scopedResults
      .filter((result) => {
        const haystack = [
          result.collectionTitle,
          result.articleTitle,
          result.description,
        ]
          .join(" ")
          .toLowerCase();

        return haystack.includes(normalizedQuery);
      })
      .slice(0, 6);
  }, [collectionSlug, query]);

  return (
    <div className="docs-search">
      <label htmlFor="docs-search-input">Search for articles</label>
      <input
        id="docs-search-input"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search for articles..."
      />
      {query ? (
        <div className="docs-search-results">
          {filteredResults.length > 0 ? (
            filteredResults.map((result) => (
              <Link href={result.href} key={`${result.collectionSlug}-${result.articleSlug}`}>
                <span>{result.collectionTitle}</span>
                <strong>{result.articleTitle}</strong>
                <small>{result.description}</small>
              </Link>
            ))
          ) : (
            <p>No matching articles. Try vesting, claim, or troubleshooting.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}

function DocsBreadcrumbs({
  collection,
  article,
}: {
  collection?: DocsCollection;
  article?: DocsArticle;
}) {
  return (
    <nav className="docs-breadcrumbs" aria-label="Docs breadcrumbs">
      <Link href="/docs">All collections</Link>
      {collection ? (
        <>
          <span>/</span>
          <Link href={`/docs/${collection.slug}`}>{collection.title}</Link>
        </>
      ) : null}
      {article ? (
        <>
          <span>/</span>
          <span>{article.title}</span>
        </>
      ) : null}
    </nav>
  );
}

export function DocsHome({ collections }: DocsHomeProps) {
  return (
    <main className="docs-page">
      <DocsTopBar />
      <section className="docs-hero">
        <p>Velora Documentation & Help Center</p>
        <h1>How can we help?</h1>
        <DocsSearch />
      </section>

      <section className="docs-collections" aria-label="Docs collections">
        {collections.map((collection) => (
          <Link className="docs-collection-card" href={`/docs/${collection.slug}`} key={collection.slug}>
            <span>{collection.articles.length} articles</span>
            <h2>{collection.title}</h2>
            <p>{collection.description}</p>
          </Link>
        ))}
      </section>
    </main>
  );
}

export function DocsCollectionView({ collection }: DocsCollectionProps) {
  return (
    <main className="docs-page docs-page-narrow">
      <DocsTopBar />
      <DocsSearch collectionSlug={collection.slug} />
      <DocsBreadcrumbs collection={collection} />

      <section className="docs-collection-header">
        <span>{collection.articles.length} articles</span>
        <h1>{collection.title}</h1>
        <p>{collection.description}</p>
      </section>

      <section className="docs-article-list" aria-label={`${collection.title} articles`}>
        {collection.articles.map((article) => (
          <Link
            className="docs-article-row"
            href={`/docs/${collection.slug}/${article.slug}`}
            key={article.slug}
          >
            <div>
              <h2>{article.title}</h2>
              <p>{article.description}</p>
            </div>
            <span>{article.readTime}</span>
          </Link>
        ))}
      </section>
    </main>
  );
}

export function DocsArticleView({ article, collection }: DocsArticleProps) {
  const relatedArticles = article.relatedSlugs
    .map((slug) => searchResults.find((result) => result.articleSlug === slug))
    .filter((result): result is NonNullable<typeof result> => Boolean(result));

  return (
    <main className="docs-page docs-page-article">
      <DocsTopBar />
      <DocsSearch />
      <DocsBreadcrumbs collection={collection} article={article} />

      <article className="docs-article">
        <header className="docs-article-header">
          <h1>{article.title}</h1>
          <p>{article.description}</p>
          <span>{article.updatedAt} · {article.readTime}</span>
          {article.video ? (
            <figure className="docs-article-video">
              <iframe
                src={article.video.src}
                title={article.video.title}
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
              />
              <figcaption>{article.video.title}</figcaption>
            </figure>
          ) : null}
        </header>

        <aside className="docs-toc" aria-label="Table of contents">
          <p>Table of contents</p>
          {article.sections.map((section) => (
            <a href={`#${section.id}`} key={section.id}>
              {section.title}
            </a>
          ))}
        </aside>

        <div className="docs-article-body">
          {article.sections.map((section) => (
            <section id={section.id} key={section.id}>
              <h2>{section.title}</h2>
              {section.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              {section.image ? (
                <figure className="docs-article-image">
                  <Image
                    src={section.image.src}
                    alt={section.image.alt}
                    width={section.image.width}
                    height={section.image.height}
                    sizes="(max-width: 900px) 100vw, 760px"
                  />
                  <figcaption>{section.image.alt}</figcaption>
                </figure>
              ) : null}
            </section>
          ))}
        </div>

        <footer className="docs-article-footer">
          <section>
            <h2>Related articles</h2>
            <div className="docs-related">
              {relatedArticles.map((related) => (
                related ? (
                  <Link href={related.href} key={related.href}>
                    <span>{related.collectionTitle}</span>
                    {related.articleTitle}
                  </Link>
                ) : null
              ))}
            </div>
          </section>
          <section className="docs-feedback">
            <h2>Did this answer your question?</h2>
            <div>
              <button type="button">Yes</button>
              <button type="button">Not yet</button>
            </div>
          </section>
        </footer>
      </article>
    </main>
  );
}
