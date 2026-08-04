"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type Product = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  image_url: string | null;
  price_cents: number;
  stock_int: number;
  status: string;
  created_at: string;
};

type FormState = {
  id: string | null;
  name: string;
  description: string;
  category: string;
  imageUrl: string;
  price: string;
  stock: string;
  status: "draft" | "active" | "archived";
};

const EMPTY_FORM: FormState = {
  id: null,
  name: "",
  description: "",
  category: "",
  imageUrl: "",
  price: "",
  stock: "0",
  status: "draft",
};

const STATUS_TONE: Record<string, string> = {
  draft: "border-zinc-400/30 bg-zinc-500/10 text-zinc-300",
  active: "border-emerald-400/30 bg-emerald-500/10 text-emerald-300",
  archived: "border-red-400/30 bg-red-500/10 text-red-300",
};

function formatPeso(cents: number) {
  return `₱${(cents / 100).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
}

/** Peso input ("129.50") to integer cents, so money never round-trips as a float. */
function toCents(value: string) {
  const pesos = Number(value);
  return Number.isFinite(pesos) ? Math.round(pesos * 100) : NaN;
}

export function MerchantProductsPanel({ canPublish }: { canPublish: boolean }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function fetchProducts() {
    const res = await fetch("/api/products");
    const body = await res.json();

    if (!res.ok) {
      throw new Error(body.error ?? "Unable to load products.");
    }

    return (body.products ?? []) as Product[];
  }

  function applyProducts(rows: Product[]) {
    setProducts(rows);
    setError("");
  }

  async function reload() {
    try {
      applyProducts(await fetchProducts());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load products.");
    }
  }

  useEffect(() => {
    fetchProducts()
      .then(applyProducts)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Unable to load products."))
      .finally(() => setLoading(false));
  }, []);

  function editProduct(product: Product) {
    setForm({
      id: product.id,
      name: product.name,
      description: product.description ?? "",
      category: product.category ?? "",
      imageUrl: product.image_url ?? "",
      price: (product.price_cents / 100).toFixed(2),
      stock: String(product.stock_int),
      status: product.status as FormState["status"],
    });
    setError("");
  }

  async function handleUpload(file: File) {
    setUploading(true);

    try {
      const data = new FormData();
      data.set("file", file);

      const res = await fetch("/api/upload", { method: "POST", body: data });
      const body = await res.json();

      if (!res.ok) {
        throw new Error(body.error ?? "Unable to upload image.");
      }

      setForm((current) => ({ ...current, imageUrl: body.url }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to upload image.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    const priceCents = toCents(form.price);

    if (form.name.trim().length < 2) {
      setError("Product name must be at least 2 characters.");
      return;
    }

    if (!Number.isFinite(priceCents) || priceCents < 0) {
      setError("Enter a valid price.");
      return;
    }

    setSaving(true);
    setError("");

    const payload = {
      name: form.name.trim(),
      description: form.description,
      category: form.category,
      imageUrl: form.imageUrl,
      priceCents,
      stockInt: Number(form.stock) || 0,
      status: form.status,
    };

    try {
      const res = await fetch(form.id ? `/api/products/${form.id}` : "/api/products", {
        method: form.id ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      const body = await res.json();

      if (!res.ok) {
        throw new Error(body.error ?? "Unable to save product.");
      }

      setForm(EMPTY_FORM);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save product.");
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive(id: string) {
    setBusyId(id);

    try {
      const res = await fetch(`/api/products/${id}`, { method: "DELETE" });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "Unable to archive product.");
      }

      if (form.id === id) {
        setForm(EMPTY_FORM);
      }

      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to archive product.");
    } finally {
      setBusyId(null);
    }
  }

  const inputClass =
    "w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500 focus-visible:border-red-400/40";

  return (
    <div className="flex flex-col gap-6">
      {error ? <p className="text-sm text-red-300">{error}</p> : null}

      <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-6 sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-red-300">Catalog</p>
        <h2 className="mt-2 text-2xl font-semibold text-white">{form.id ? "Edit product" : "Add a product"}</h2>
        {!canPublish ? (
          <p className="mt-2 text-sm text-amber-300">
            Your merchant account is not verified yet, so products can only be saved as drafts.
          </p>
        ) : null}

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <input
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            placeholder="Product name"
            className={inputClass}
          />
          <input
            value={form.category}
            onChange={(event) => setForm({ ...form, category: event.target.value })}
            placeholder="Category (e.g. Mains)"
            className={inputClass}
          />
          <input
            value={form.price}
            onChange={(event) => setForm({ ...form, price: event.target.value })}
            inputMode="decimal"
            placeholder="Price in pesos (e.g. 129.50)"
            className={inputClass}
          />
          <input
            value={form.stock}
            onChange={(event) => setForm({ ...form, stock: event.target.value })}
            inputMode="numeric"
            placeholder="Stock on hand"
            className={inputClass}
          />
          <textarea
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
            placeholder="Description"
            rows={3}
            className={`${inputClass} sm:col-span-2`}
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4">
          <label className="cursor-pointer rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-300 transition hover:bg-white/10">
            {uploading ? "Uploading…" : form.imageUrl ? "Replace image" : "Upload image"}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  void handleUpload(file);
                }
                event.target.value = "";
              }}
            />
          </label>

          {form.imageUrl ? (
            <span className="flex items-center gap-3 text-xs text-zinc-400">
              <Image
                src={form.imageUrl}
                alt="Product preview"
                width={48}
                height={48}
                unoptimized
                className="h-12 w-12 rounded-xl object-cover"
              />
              Image attached
            </span>
          ) : null}

          <select
            value={form.status}
            onChange={(event) => setForm({ ...form, status: event.target.value as FormState["status"] })}
            className="rounded-full border border-white/10 bg-black/30 px-4 py-2 text-sm text-white outline-none focus-visible:border-red-400/40"
          >
            <option value="draft">Draft</option>
            <option value="active" disabled={!canPublish}>
              Active (visible to shoppers)
            </option>
            <option value="archived">Archived</option>
          </select>
        </div>

        <div className="mt-6 flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving || uploading}
            className="rounded-full bg-gradient-to-r from-red-500 to-rose-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving…" : form.id ? "Save changes" : "Create product"}
          </button>
          {form.id ? (
            <button
              onClick={() => setForm(EMPTY_FORM)}
              className="rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-300 transition hover:bg-white/10"
            >
              Cancel
            </button>
          ) : null}
        </div>
      </div>

      <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-6 sm:p-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-red-300">Inventory</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Your products</h2>
          </div>
          <span className="text-xs font-medium text-zinc-500">{products.length} total</span>
        </div>

        {loading ? (
          <p className="mt-6 text-sm text-zinc-400">Loading products…</p>
        ) : products.length === 0 ? (
          <p className="mt-6 text-sm text-zinc-400">No products yet — create your first one above.</p>
        ) : (
          <div className="mt-6 space-y-3">
            {products.map((product) => (
              <div
                key={product.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/20 p-4"
              >
                <div className="flex items-center gap-4">
                  {product.image_url ? (
                    <Image
                      src={product.image_url}
                      alt={product.name}
                      width={48}
                      height={48}
                      unoptimized
                      className="h-12 w-12 rounded-xl object-cover"
                    />
                  ) : null}
                  <div>
                    <p className="font-medium text-white">{product.name}</p>
                    <p className="mt-1 text-sm text-zinc-400">
                      {formatPeso(product.price_cents)} · {product.stock_int} in stock
                      {product.category ? ` · ${product.category}` : ""}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-medium capitalize ${STATUS_TONE[product.status] ?? "border-white/10 text-zinc-300"}`}
                  >
                    {product.status}
                  </span>
                  <button
                    onClick={() => editProduct(product)}
                    className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:bg-white/10"
                  >
                    Edit
                  </button>
                  {product.status !== "archived" ? (
                    <button
                      onClick={() => handleArchive(product.id)}
                      disabled={busyId === product.id}
                      className="rounded-full border border-red-400/30 px-3 py-1.5 text-xs font-medium text-red-300 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Archive
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
