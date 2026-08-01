"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

type Product = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  category_id: string | null;
  sku: string | null;
  price_cents: number;
  compare_at_price_cents: number | null;
  stock_int: number;
  low_stock_threshold: number;
  image_url: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

type Category = {
  id: string;
  name: string;
  slug: string;
};

function formatPeso(cents: number) {
  return `₱${(cents / 100).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
}

const STATUS_TONE: Record<string, string> = {
  draft: "border-zinc-400/30 bg-zinc-500/10 text-zinc-300",
  active: "border-emerald-400/30 bg-emerald-500/10 text-emerald-300",
  archived: "border-red-400/30 bg-red-500/10 text-red-300",
};

export function MerchantProductsPanel() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [merchantStatus, setMerchantStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formCategoryId, setFormCategoryId] = useState("");
  const [formSku, setFormSku] = useState("");
  const [formPriceCents, setFormPriceCents] = useState("");
  const [formCompareAt, setFormCompareAt] = useState("");
  const [formStock, setFormStock] = useState("");
  const [formLowStock, setFormLowStock] = useState("5");
  const [formImageUrl, setFormImageUrl] = useState("");
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  async function load() {
    setLoading(true);
    setError("");

    try {
      const [productsRes, categoriesRes] = await Promise.all([
        fetch("/api/merchant/products"),
        fetch("/api/categories"),
      ]);
      const productsBody = await productsRes.json();
      const categoriesBody = await categoriesRes.json();

      if (!productsRes.ok) throw new Error(productsBody.error ?? "Unable to load products.");
      if (!categoriesRes.ok) throw new Error(categoriesBody.error ?? "Unable to load categories.");

      setProducts(productsBody.products ?? []);
      setMerchantStatus(productsBody.merchantStatus ?? null);
      setCategories(categoriesBody.categories ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load products.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function resetForm() {
    setFormName("");
    setFormDescription("");
    setFormCategoryId("");
    setFormSku("");
    setFormPriceCents("");
    setFormCompareAt("");
    setFormStock("");
    setFormLowStock("5");
    setFormImageUrl("");
    setFormError("");
    setEditingProduct(null);
    setShowForm(false);
  }

  function openEdit(product: Product) {
    setEditingProduct(product);
    setFormName(product.name);
    setFormDescription(product.description ?? "");
    setFormCategoryId(product.category_id ?? "");
    setFormSku(product.sku ?? "");
    setFormPriceCents(String(product.price_cents));
    setFormCompareAt(product.compare_at_price_cents ? String(product.compare_at_price_cents) : "");
    setFormStock(String(product.stock_int));
    setFormLowStock(String(product.low_stock_threshold));
    setFormImageUrl(product.image_url ?? "");
    setFormError("");
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError("");

    const price = parseInt(formPriceCents, 10);
    if (!formName.trim()) {
      setFormError("Product name is required.");
      setFormSubmitting(false);
      return;
    }
    if (!Number.isFinite(price) || price <= 0) {
      setFormError("Price must be greater than 0.");
      setFormSubmitting(false);
      return;
    }

    const payload: Record<string, unknown> = {
      name: formName.trim(),
      description: formDescription.trim() || null,
      category_id: formCategoryId || null,
      sku: formSku.trim() || null,
      price_cents: price,
      compare_at_price_cents: formCompareAt ? parseInt(formCompareAt, 10) || null : null,
      stock_int: parseInt(formStock, 10) || 0,
      low_stock_threshold: parseInt(formLowStock, 10) || 5,
      image_url: formImageUrl.trim() || null,
    };

    try {
      if (editingProduct) {
        const res = await fetch(`/api/merchant/products/${editingProduct.id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const body = await res.json();
          throw new Error(body.error ?? "Unable to update product.");
        }
      } else {
        const res = await fetch("/api/merchant/products", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const body = await res.json();
          throw new Error(body.error ?? "Unable to create product.");
        }
      }

      resetForm();
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Unable to save product.");
    } finally {
      setFormSubmitting(false);
    }
  }

  async function publishProduct(id: string) {
    setActionId(id);
    try {
      const res = await fetch(`/api/merchant/products/${id}/publish`, { method: "POST" });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "Unable to publish product.");
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to publish product.");
    } finally {
      setActionId(null);
    }
  }

  async function archiveProduct(id: string) {
    setActionId(id);
    try {
      const res = await fetch(`/api/merchant/products/${id}/archive`, { method: "POST" });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "Unable to archive product.");
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to archive product.");
    } finally {
      setActionId(null);
    }
  }

  const isVerified = merchantStatus === "verified";

  return (
    <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-6 sm:p-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-red-300">Product catalog</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">My products</h2>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-zinc-500">{products.length} total</span>
          {isVerified ? (
            <button
              onClick={() => { resetForm(); setShowForm(true); }}
              className="rounded-full border border-emerald-400/30 px-4 py-1.5 text-xs font-medium text-emerald-300 transition hover:bg-emerald-500/10"
            >
              + New product
            </button>
          ) : null}
        </div>
      </div>

      {loading ? (
        <p className="mt-6 text-sm text-zinc-400">Loading products…</p>
      ) : error ? (
        <p className="mt-6 text-sm text-red-300">{error}</p>
      ) : !isVerified ? (
        <p className="mt-6 text-sm text-zinc-400">Your merchant account must be verified before you can create products.</p>
      ) : products.length === 0 && !showForm ? (
        <p className="mt-6 text-sm text-zinc-400">No products yet. Create your first product to start selling.</p>
      ) : null}

      {showForm ? (
        <motion.form
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          onSubmit={handleSubmit}
          className="mt-6 space-y-4 rounded-2xl border border-white/10 bg-black/20 p-5"
        >
          <p className="text-sm font-semibold text-white">
            {editingProduct ? "Edit product" : "New product"}
          </p>

          {formError ? <p className="text-sm text-red-300">{formError}</p> : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-zinc-400">Name *</label>
              <input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-400/40"
                placeholder="Product name"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-400">SKU</label>
              <input
                value={formSku}
                onChange={(e) => setFormSku(e.target.value)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-400/40"
                placeholder="SKU-001"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-zinc-400">Description</label>
              <textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={2}
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-400/40"
                placeholder="Product description"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-400">Category</label>
              <select
                value={formCategoryId}
                onChange={(e) => setFormCategoryId(e.target.value)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-400/40"
              >
                <option value="">No category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-400">Image URL</label>
              <input
                value={formImageUrl}
                onChange={(e) => setFormImageUrl(e.target.value)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-400/40"
                placeholder="https://example.com/image.jpg"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-400">Price (cents) *</label>
              <input
                type="number"
                value={formPriceCents}
                onChange={(e) => setFormPriceCents(e.target.value)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-400/40"
                placeholder="e.g. 19900 for ₱199"
                min={1}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-400">Compare at (cents)</label>
              <input
                type="number"
                value={formCompareAt}
                onChange={(e) => setFormCompareAt(e.target.value)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-400/40"
                placeholder="Original price for sale display"
                min={0}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-400">Stock</label>
              <input
                type="number"
                value={formStock}
                onChange={(e) => setFormStock(e.target.value)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-400/40"
                placeholder="0"
                min={0}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-400">Low stock threshold</label>
              <input
                type="number"
                value={formLowStock}
                onChange={(e) => setFormLowStock(e.target.value)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-400/40"
                placeholder="5"
                min={0}
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={formSubmitting}
              className="rounded-full border border-emerald-400/30 px-5 py-2 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {formSubmitting ? "Saving…" : editingProduct ? "Update product" : "Create product"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="rounded-full border border-white/10 px-5 py-2 text-sm font-medium text-zinc-400 transition hover:bg-white/5"
            >
              Cancel
            </button>
          </div>
        </motion.form>
      ) : null}

      {products.length > 0 ? (
        <div className="mt-6 space-y-3">
          {products.map((product) => {
            const isLowStock = product.stock_int <= product.low_stock_threshold && product.stock_int > 0;
            const isOutOfStock = product.stock_int <= 0;
            return (
              <div
                key={product.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/20 p-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium text-white">{product.name}</p>
                    {product.sku ? (
                      <span className="shrink-0 text-xs text-zinc-500">SKU: {product.sku}</span>
                    ) : null}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-zinc-400">
                    <span>{formatPeso(product.price_cents)}</span>
                    {product.compare_at_price_cents ? (
                      <span className="text-xs text-zinc-500 line-through">
                        {formatPeso(product.compare_at_price_cents)}
                      </span>
                    ) : null}
                    <span className={`${isOutOfStock ? "text-red-400" : isLowStock ? "text-amber-400" : "text-zinc-400"}`}>
                      {isOutOfStock ? "Out of stock" : `${product.stock_int} in stock`}
                    </span>
                    {product.category ? (
                      <span className="text-xs text-zinc-500">{product.category}</span>
                    ) : null}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`rounded-full border px-3 py-1 text-xs font-medium capitalize ${STATUS_TONE[product.status] ?? "border-white/10 text-zinc-300"}`}>
                    {product.status}
                  </span>

                  {product.status === "draft" ? (
                    <button
                      onClick={() => publishProduct(product.id)}
                      disabled={actionId === product.id}
                      className="rounded-full border border-emerald-400/30 px-3 py-1.5 text-xs font-medium text-emerald-300 transition hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Publish
                    </button>
                  ) : null}

                  {product.status === "active" ? (
                    <button
                      onClick={() => archiveProduct(product.id)}
                      disabled={actionId === product.id}
                      className="rounded-full border border-red-400/30 px-3 py-1.5 text-xs font-medium text-red-300 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Archive
                    </button>
                  ) : null}

                  <button
                    onClick={() => openEdit(product)}
                    className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:bg-white/5"
                  >
                    Edit
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
