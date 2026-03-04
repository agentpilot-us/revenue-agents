'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CatalogProductForm } from '@/app/dashboard/my-company/CatalogProductForm';
import { ProductRelationshipEditor } from '@/app/components/products/ProductRelationshipEditor';
import type { CatalogProductItem, Relationship } from '@/app/dashboard/my-company/MyCompanyClient';

type DiscoveredProduct = {
  name: string;
  description: string;
  useCases: string[];
  sourceContentIds: string[];
};

type ProfileData = {
  oneLiner?: string;
  elevatorPitch?: string;
  valueProps?: string[];
  painPoints?: string[];
  objectionHandlers?: { objection: string; response: string }[];
  competitivePositioning?: string[];
  priceRangeText?: string;
  salesCycle?: string;
};

type Props = {
  catalogProducts: CatalogProductItem[];
  hasContentLibrary: boolean;
};

export function ProductsTab({ catalogProducts: initialProducts, hasContentLibrary }: Props) {
  const router = useRouter();
  const [products, setProducts] = useState(initialProducts);
  const [discovering, setDiscovering] = useState(false);
  const [discoveredProducts, setDiscoveredProducts] = useState<DiscoveredProduct[]>([]);
  const [discoverError, setDiscoverError] = useState<string | null>(null);
  const [confirmingIds, setConfirmingIds] = useState<Set<number>>(new Set());
  const [generatingProfileFor, setGeneratingProfileFor] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<Record<string, ProfileData>>({});
  const [expandedProfiles, setExpandedProfiles] = useState<Set<string>>(new Set());

  const handleDiscover = async () => {
    setDiscovering(true);
    setDiscoverError(null);
    setDiscoveredProducts([]);
    try {
      const res = await fetch('/api/catalog-products/discover', { method: 'POST' });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setDiscoverError(data?.error ?? 'Discovery failed.');
        return;
      }
      const data = await res.json();
      if (data.products.length === 0) {
        setDiscoverError('No new products found in your content library.');
      } else {
        setDiscoveredProducts(data.products);
      }
    } catch (e) {
      setDiscoverError(e instanceof Error ? e.message : 'Discovery failed.');
    } finally {
      setDiscovering(false);
    }
  };

  const handleConfirmProduct = async (idx: number) => {
    const product = discoveredProducts[idx];
    if (!product) return;
    setConfirmingIds((prev) => new Set(prev).add(idx));
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: product.name,
          description: product.description,
          useCases: product.useCases,
        }),
      });
      if (res.ok) {
        const created = await res.json();
        setProducts((prev) => [
          ...prev,
          {
            id: created.id,
            name: created.name,
            slug: created.slug,
            description: created.description,
            relationships: [],
          },
        ]);
        setDiscoveredProducts((prev) => prev.filter((_, i) => i !== idx));
      }
    } finally {
      setConfirmingIds((prev) => {
        const next = new Set(prev);
        next.delete(idx);
        return next;
      });
    }
  };

  const handleConfirmAll = async () => {
    for (let i = discoveredProducts.length - 1; i >= 0; i--) {
      await handleConfirmProduct(i);
    }
  };

  const handleGenerateProfile = async (productId: string) => {
    setGeneratingProfileFor(productId);
    try {
      const res = await fetch(
        `/api/catalog-products/${encodeURIComponent(productId)}/profile/generate`,
        { method: 'POST' }
      );
      if (res.ok) {
        const profile = await res.json();
        setProfiles((prev) => ({ ...prev, [productId]: profile }));
        setExpandedProfiles((prev) => new Set(prev).add(productId));
      }
    } finally {
      setGeneratingProfileFor(null);
    }
  };

  const toggleProfile = (productId: string) => {
    setExpandedProfiles((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  };

  const handleLoadProfile = async (productId: string) => {
    if (profiles[productId]) {
      toggleProfile(productId);
      return;
    }
    try {
      const res = await fetch(`/api/catalog-products/${encodeURIComponent(productId)}/profile`);
      if (res.ok) {
        const profile = await res.json();
        setProfiles((prev) => ({ ...prev, [productId]: profile }));
        setExpandedProfiles((prev) => new Set(prev).add(productId));
      } else if (res.status === 204) {
        setExpandedProfiles((prev) => new Set(prev).add(productId));
      }
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-8">
      {/* Product catalog */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Product catalog
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Your products and their sales profiles. Profiles power AI-generated content, chat, and plays.
            </p>
          </div>
        </div>

        {/* Discovery section */}
        {products.length === 0 && (
          <div className="rounded-xl border-2 border-dashed border-border bg-card/30 p-8 text-center">
            {hasContentLibrary ? (
              <>
                <h3 className="text-base font-medium text-foreground mb-2">
                  Discover products from your content
                </h3>
                <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
                  AI will analyze your content library to identify the products you sell
                  and create catalog entries automatically.
                </p>
                <button
                  type="button"
                  onClick={handleDiscover}
                  disabled={discovering}
                  className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                >
                  {discovering ? (
                    <>
                      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                      Analyzing content...
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                      Discover products
                    </>
                  )}
                </button>
                {discoverError && (
                  <p className="mt-3 text-sm text-amber-500">{discoverError}</p>
                )}
              </>
            ) : (
              <>
                <h3 className="text-base font-medium text-foreground mb-2">
                  Set up your company first
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Import content from your website so AI can identify your products.
                </p>
                <a
                  href="/dashboard/company-setup"
                  className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  Go to company setup
                </a>
              </>
            )}
          </div>
        )}

        {/* Discovery results */}
        {discoveredProducts.length > 0 && (
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  Found {discoveredProducts.length} product{discoveredProducts.length !== 1 ? 's' : ''} in your content
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Review and confirm each product to add it to your catalog.
                </p>
              </div>
              <button
                type="button"
                onClick={handleConfirmAll}
                className="text-xs font-medium text-primary hover:text-primary/80"
              >
                Confirm all
              </button>
            </div>
            <div className="space-y-3">
              {discoveredProducts.map((dp, idx) => (
                <div
                  key={`${dp.name}-${idx}`}
                  className="rounded-lg border border-border bg-card/60 p-4 flex items-start justify-between gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{dp.name}</p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {dp.description}
                    </p>
                    {dp.useCases.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {dp.useCases.map((uc) => (
                          <span
                            key={uc}
                            className="inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary"
                          >
                            {uc}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleConfirmProduct(idx)}
                      disabled={confirmingIds.has(idx)}
                      className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                    >
                      {confirmingIds.has(idx) ? 'Adding...' : 'Confirm'}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setDiscoveredProducts((prev) => prev.filter((_, i) => i !== idx))
                      }
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Existing products */}
        {products.length > 0 && (
          <div className="space-y-3">
            {products.map((cp) => {
              const profile = profiles[cp.id];
              const isExpanded = expandedProfiles.has(cp.id);
              const isGenerating = generatingProfileFor === cp.id;

              return (
                <div
                  key={cp.id}
                  className="rounded-xl border border-border bg-card/60 shadow-sm"
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-foreground">
                          {cp.name}
                        </h3>
                        {cp.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {cp.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {profile ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-400 border border-emerald-500/20">
                            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                            Profile generated
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-400 border border-amber-500/20">
                            No profile
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-3">
                      <button
                        type="button"
                        onClick={() => handleGenerateProfile(cp.id)}
                        disabled={isGenerating}
                        className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 border border-primary/20 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 disabled:opacity-60 transition-colors"
                      >
                        {isGenerating ? (
                          <>
                            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
                            Generating...
                          </>
                        ) : profile ? (
                          'Regenerate profile'
                        ) : (
                          <>
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v3m6.366-.366-2.12 2.12M21 12h-3m.366 6.366-2.12-2.12M12 21v-3m-6.366.366 2.12-2.12M3 12h3m-.366-6.366 2.12 2.12"/></svg>
                            Generate with AI
                          </>
                        )}
                      </button>
                      {profile && (
                        <button
                          type="button"
                          onClick={() => handleLoadProfile(cp.id)}
                          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {isExpanded ? 'Hide profile' : 'View profile'}
                        </button>
                      )}
                      {!profile && !isGenerating && (
                        <button
                          type="button"
                          onClick={() => handleLoadProfile(cp.id)}
                          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          Load existing
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expanded profile view */}
                  {isExpanded && profile && (
                    <div className="border-t border-border bg-background/40 p-5 space-y-4">
                      <ProfileField label="One-liner" value={profile.oneLiner} />
                      <ProfileField label="Elevator pitch" value={profile.elevatorPitch} />
                      <ProfileListField label="Value propositions" items={profile.valueProps} />
                      <ProfileListField label="Pain points addressed" items={profile.painPoints} />
                      {profile.objectionHandlers && profile.objectionHandlers.length > 0 && (
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                            Objection handlers
                          </p>
                          <div className="space-y-2">
                            {profile.objectionHandlers.map((oh, i) => (
                              <div key={i} className="rounded-lg border border-border/40 bg-background/60 p-2.5">
                                <p className="text-xs font-medium text-foreground">
                                  &ldquo;{oh.objection}&rdquo;
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {oh.response}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <ProfileListField label="Competitive positioning" items={profile.competitivePositioning} />
                      <div className="grid grid-cols-2 gap-4">
                        <ProfileField label="Price range" value={profile.priceRangeText} />
                        <ProfileField label="Sales cycle" value={profile.salesCycle} />
                      </div>
                    </div>
                  )}

                  {isExpanded && !profile && (
                    <div className="border-t border-border bg-background/40 p-5">
                      <p className="text-xs text-muted-foreground">
                        No profile yet. Click &ldquo;Generate with AI&rdquo; to create one from your content library.
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Add product manually + re-discover */}
        <div className="flex items-center gap-3">
          <CatalogProductForm />
          {products.length > 0 && hasContentLibrary && (
            <button
              type="button"
              onClick={handleDiscover}
              disabled={discovering}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors disabled:opacity-60"
            >
              {discovering ? 'Discovering...' : 'Discover more products'}
            </button>
          )}
        </div>
      </section>

      {/* Product relationships */}
      {products.length >= 2 && (
        <section className="rounded-xl border border-border bg-card/60 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-foreground mb-1">
            Product relationships
          </h2>
          <p className="text-xs text-muted-foreground mb-4">
            Define how your products relate to each other. These relationships inform
            how AI positions products per account.
          </p>
          <div className="space-y-4">
            {products.map((cp) => (
              <div key={cp.id} className="border border-border/40 rounded-lg p-3">
                <p className="text-sm font-medium text-foreground">{cp.name}</p>
                <ProductRelationshipEditor
                  productId={cp.id}
                  productName={cp.name}
                  initialRelationships={cp.relationships}
                  catalogProducts={products.map((p) => ({ id: p.id, name: p.name }))}
                />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function ProfileField({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
        {label}
      </p>
      <p className="text-sm text-foreground">{value}</p>
    </div>
  );
}

function ProfileListField({ label, items }: { label: string; items?: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
        {label}
      </p>
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-foreground">
            <span className="text-muted-foreground mt-0.5 shrink-0">&bull;</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
