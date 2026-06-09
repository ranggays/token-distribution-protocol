export type DocsArticleSection = {
  id: string;
  title: string;
  body: string[];
  image?: {
    src: string;
    alt: string;
    width: number;
    height: number;
  };
};

export type DocsArticle = {
  slug: string;
  title: string;
  description: string;
  updatedAt: string;
  readTime: string;
  sections: DocsArticleSection[];
  relatedSlugs: string[];
};

export type DocsCollection = {
  slug: "vesting" | "claim";
  title: string;
  description: string;
  articles: DocsArticle[];
};

export const docsCollections: DocsCollection[] = [
  {
    slug: "vesting",
    title: "Vesting",
    description:
      "Create token release plans, lock allocations in the vault, and define when recipients can claim.",
    articles: [
      {
        slug: "what-is-vesting",
        title: "What is vesting in Velora?",
        description:
          "Understand how Velora turns a token allocation into a predictable release plan.",
        updatedAt: "June 9, 2026",
        readTime: "3 min read",
        relatedSlugs: ["create-vesting-schedule", "claim-available-tokens"],
        sections: [
          {
            id: "overview",
            title: "Overview",
            body: [
              "Vesting in Velora is a token release plan between a creator and a recipient. The creator chooses the token amount, recipient wallet, schedule type, and cancellation rules before tokens move.",
              "Once created, tokens are held in the vault and become claimable only when the schedule unlocks them.",
            ],
          },
          {
            id: "when-to-use",
            title: "When to use vesting",
            body: [
              "Use vesting for team allocations, contributor rewards, grants, or any distribution that should unlock gradually instead of all at once.",
              "Velora supports linear, cliff, and milestone-style release planning so teams can match the unlock behavior to the agreement.",
            ],
          },
          {
            id: "what-recipients-see",
            title: "What recipients see",
            body: [
              "Recipients see the connected streams available to their wallet, the unlocked amount, the claimed amount, and what remains locked.",
              "They can claim only the amount Velora calculates as available at the current time.",
            ],
          },
        ],
      },
      {
        slug: "create-vesting-schedule",
        title: "Create a vesting schedule",
        description:
          "A step-by-step guide for creating a Velora release plan from token setup to review.",
        updatedAt: "June 9, 2026",
        readTime: "5 min read",
        relatedSlugs: ["what-is-vesting", "vesting-troubleshooting"],
        sections: [
          {
            id: "choose-type",
            title: "Step 1: Choose a vesting type",
            body: [
              "Start by selecting the release pattern that matches the agreement. Linear unlocks tokens gradually, cliff releases unlock after a waiting period, and milestone schedules support progress-based distributions.",
              "This choice defines the structure Velora uses for the rest of the creation flow.",
            ],
            image: {
              src: "/images/docs/create/type.png",
              alt: "Velora create vesting type selection screen.",
              width: 1144,
              height: 657,
            },
          },
          {
            id: "add-recipient",
            title: "Step 2: Add the recipient",
            body: [
              "Enter the wallet that should receive the unlocked tokens and confirm the token allocation for the stream.",
              "Use a verified recipient address before continuing. The release plan is created for the wallet submitted in this step.",
            ],
            image: {
              src: "/images/docs/create/recipient.png",
              alt: "Velora create vesting recipient and allocation screen.",
              width: 687,
              height: 760,
            },
          },
          {
            id: "configure-schedule",
            title: "Step 3: Configure the schedule",
            body: [
              "Set the start date, unlock timing, and schedule details for the stream.",
              "Review cancellation settings carefully. These rules decide who can cancel a stream and what happens to locked tokens.",
            ],
            image: {
              src: "/images/docs/create/configuration.png",
              alt: "Velora create vesting schedule configuration screen.",
              width: 839,
              height: 683,
            },
          },
          {
            id: "review-create",
            title: "Step 4: Review and create",
            body: [
              "Use the review page to confirm the recipient, amount, schedule, and unlock behavior before signing.",
              "After approval, Velora locks the tokens in the vault and creates the release plan on-chain.",
            ],
            image: {
              src: "/images/docs/create/review.png",
              alt: "Velora create vesting review screen before creation.",
              width: 596,
              height: 733,
            },
          },
        ],
      },
      {
        slug: "vesting-troubleshooting",
        title: "Troubleshooting vesting setup",
        description:
          "Common setup problems when creating or managing a Velora vesting stream.",
        updatedAt: "June 9, 2026",
        readTime: "4 min read",
        relatedSlugs: ["create-vesting-schedule", "claim-troubleshooting"],
        sections: [
          {
            id: "missing-balance",
            title: "Wallet balance does not appear",
            body: [
              "Confirm the wallet is connected and uses the token account that holds the selected token.",
              "Refresh the dashboard after funding the wallet or changing token accounts.",
            ],
          },
          {
            id: "wrong-recipient",
            title: "Recipient address looks wrong",
            body: [
              "Do not create the stream until the recipient wallet is verified. Token release plans are tied to the recipient address submitted during creation.",
              "If a created stream allows recipient changes, use the configured authority rules. Otherwise, create a new stream with the correct recipient.",
            ],
          },
          {
            id: "cancel-rules",
            title: "Cancellation does not work",
            body: [
              "Check the cancellation authority selected during creation. Velora enforces whether the creator, recipient, both, or neither can cancel.",
              "Cancelled streams stop future claims, while already unlocked amounts follow the stream’s cancellation rules.",
            ],
          },
        ],
      },
    ],
  },
  {
    slug: "claim",
    title: "Claim",
    description:
      "Track connected streams, see claimable amounts, and withdraw unlocked tokens to the recipient wallet.",
    articles: [
      {
        slug: "what-claiming-means",
        title: "What claiming means in Velora",
        description:
          "Learn how Velora calculates claimable tokens and keeps locked allocations protected.",
        updatedAt: "June 9, 2026",
        readTime: "3 min read",
        relatedSlugs: ["claim-available-tokens", "what-is-vesting"],
        sections: [
          {
            id: "overview",
            title: "Overview",
            body: [
              "Claiming is the recipient action that withdraws unlocked tokens from a Velora release plan.",
              "Locked tokens stay in the vault until the schedule makes them available.",
            ],
          },
          {
            id: "claimable-amount",
            title: "Claimable amount",
            body: [
              "Velora compares the stream schedule, current time, unlocked amount, and amount already claimed.",
              "The claimable amount is the unlocked balance that has not yet been withdrawn.",
            ],
          },
          {
            id: "recipient-view",
            title: "Recipient view",
            body: [
              "The claim page shows incoming streams for the connected wallet, including claimable amount, unlocked amount, schedule type, and remaining time.",
            ],
          },
        ],
      },
      {
        slug: "claim-available-tokens",
        title: "Claim available tokens",
        description:
          "A step-by-step guide for withdrawing unlocked tokens from a Velora stream.",
        updatedAt: "June 9, 2026",
        readTime: "4 min read",
        relatedSlugs: ["what-claiming-means", "claim-troubleshooting"],
        sections: [
          {
            id: "connect-wallet",
            title: "Step 1: Connect the recipient wallet",
            body: [
              "Open the Velora app and connect the wallet that was added as the stream recipient.",
              "Velora loads streams connected to that address and separates incoming claim activity from creator activity.",
            ],
          },
          {
            id: "open-claim",
            title: "Step 2: Open the claim page",
            body: [
              "Go to the Claim page to see streams with available or upcoming withdrawals.",
              "Use the claim overview to check total incoming streams and the number ready to claim.",
            ],
          },
          {
            id: "withdraw",
            title: "Step 3: Withdraw unlocked tokens",
            body: [
              "Choose a stream with a positive claimable amount and confirm the withdrawal in your wallet.",
              "After the transaction confirms, the claimed amount updates and the remaining locked tokens continue following the schedule.",
            ],
          },
        ],
      },
      {
        slug: "claim-troubleshooting",
        title: "Troubleshooting claim issues",
        description:
          "Common reasons a stream cannot be claimed yet and what recipients should check.",
        updatedAt: "June 9, 2026",
        readTime: "4 min read",
        relatedSlugs: ["claim-available-tokens", "vesting-troubleshooting"],
        sections: [
          {
            id: "nothing-ready",
            title: "No tokens are ready to claim",
            body: [
              "Check the stream start date and schedule. A stream can be visible before any tokens are unlocked.",
              "If the claimable amount is zero, wait until the next unlock point or review the schedule details.",
            ],
          },
          {
            id: "wrong-wallet",
            title: "The stream is missing",
            body: [
              "Confirm you connected the recipient wallet, not the creator wallet.",
              "If the stream was created for another address, it will not appear in the connected wallet’s claim list.",
            ],
          },
          {
            id: "cancelled-stream",
            title: "The stream was cancelled",
            body: [
              "Cancelled streams cannot continue unlocking future tokens.",
              "Review the stream status and cancellation rules to understand whether any unlocked amount remains withdrawable.",
            ],
          },
        ],
      },
    ],
  },
];

export type DocsSearchResult = {
  collectionSlug: DocsCollection["slug"];
  collectionTitle: string;
  articleSlug: string;
  articleTitle: string;
  description: string;
  href: string;
};

export function getDocsCollection(slug: string) {
  return docsCollections.find((collection) => collection.slug === slug);
}

export function getDocsArticle(collectionSlug: string, articleSlug: string) {
  const collection = getDocsCollection(collectionSlug);
  const article = collection?.articles.find((item) => item.slug === articleSlug);

  if (!collection || !article) return null;

  return { collection, article };
}

export function getAllDocsSearchResults(): DocsSearchResult[] {
  return docsCollections.flatMap((collection) =>
    collection.articles.map((article) => ({
      collectionSlug: collection.slug,
      collectionTitle: collection.title,
      articleSlug: article.slug,
      articleTitle: article.title,
      description: article.description,
      href: `/docs/${collection.slug}/${article.slug}`,
    })),
  );
}
