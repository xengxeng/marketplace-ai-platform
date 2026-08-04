"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiError, fetchJson } from "@/lib/api/client";
import { errorMessage } from "@/lib/errors";

export function AddToCartButton({ productId, inStock }: { productId: string; inStock: boolean }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "loading" | "added" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleClick() {
    setState("loading");
    setMessage("");

    try {
      await fetchJson("/api/cart/items", {
        method: "POST",
        json: { productId, quantity: 1 },
        fallbackError: "Unable to add to cart.",
      });

      setState("added");
      setTimeout(() => setState("idle"), 1500);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.push("/auth");
        return;
      }

      setState("error");
      setMessage(errorMessage(err, "Unable to add to cart."));
    }
  }

  if (!inStock) {
    return (
      <span className="rounded-full border border-white/10 px-3 py-2 text-sm text-zinc-500">Out of stock</span>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleClick}
        disabled={state === "loading"}
        className="rounded-full border border-white/10 px-3 py-2 text-sm text-zinc-300 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {state === "loading" ? "Adding…" : state === "added" ? "Added ✓" : "Add to cart"}
      </button>
      {message ? <span className="text-xs text-red-300">{message}</span> : null}
    </div>
  );
}
