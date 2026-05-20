"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Package, ShoppingCart, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { PricingCard } from "@/components/products/PricingCard";

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: { name: string; slug: string } | null;
  plans: {
    id: string;
    name: string;
    billingPeriod: number;
    billingUnit: string;
    prices: {
      price: number;
      setupFee: number;
      currency: { prefix: string; suffix: string; code: string };
    }[];
  }[];
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  // session removed
  const [product, setProduct] = useState<Product | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    fetch(`/api/products/${params.category}/${params.product}`)
      .then((res) => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then((data) => {
        setProduct(data);
        if (data.plans.length > 0) setSelectedPlanId(data.plans[0].id);
      })
      .catch(() => router.push("/"))
      .finally(() => setIsLoading(false));
  }, []);

  const addToCart = async () => {
    if (!selectedPlanId) {
      toast.error("Please select a plan");
      return;
    }

    if (!session) {
      router.push(`/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    setIsAdding(true);
    try {
      const res = await fetch("/api/cart/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: selectedPlanId }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Failed to add to cart");
        return;
      }

      toast.success("Added to cart!");
      router.push("/cart");
    } catch {
      toast.error("Failed to add to cart");
    } finally {
      setIsAdding(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!product) return null;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container max-w-6xl mx-auto px-4 py-12">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/products/${product.category?.slug ?? ""}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{product.name}</h1>
            {product.category && (
              <p className="text-muted-foreground">{product.category.name}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="mb-8">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 shrink-0">
                  <Package className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">{product.name}</h2>
                  {product.description && (
                    <p className="mt-2 text-muted-foreground">
                      {product.description}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <h3 className="text-lg font-semibold mb-4">Choose a Plan</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {product.plans.map((plan, index) => (
                <PricingCard
                  key={plan.id}
                  plan={plan}
                  isPopular={index === 1}
                  isSelected={selectedPlanId === plan.id}
                  onSelect={setSelectedPlanId}
                />
              ))}
            </div>
          </div>

          <div>
            <div className="sticky top-24">
              <div className="border rounded-xl p-6 space-y-4 bg-card">
                <h3 className="font-semibold text-lg">Order Summary</h3>

                {selectedPlanId && (() => {
                  const plan = product.plans.find((p) => p.id === selectedPlanId);
                  const price = plan?.prices[0];
                  if (!plan || !price) return null;

                  return (
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Product</span>
                        <span className="font-medium">{product.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Plan</span>
                        <span className="font-medium">{plan.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Billing</span>
                        <span className="font-medium">
                          Every {plan.billingPeriod} {plan.billingUnit}
                          {plan.billingPeriod > 1 ? "s" : ""}
                        </span>
                      </div>
                      {price.setupFee > 0 && (
                        <div className="flex justify-between text-orange-600 dark:text-orange-400">
                          <span>Setup Fee</span>
                          <span>
                            {price.currency.prefix}{Number(price.setupFee).toFixed(2)}{price.currency.suffix}
                          </span>
                        </div>
                      )}
                      <hr className="border-border" />
                      <div className="flex justify-between font-bold text-base">
                        <span>Price</span>
                        <span>
                          {price.currency.prefix}{Number(price.price).toFixed(2)}{price.currency.suffix}
                          <span className="text-sm font-normal text-muted-foreground">
                            /{plan.billingUnit}
                          </span>
                        </span>
                      </div>
                    </div>
                  );
                })()}

                <Button
                  className="w-full"
                  onClick={addToCart}
                  disabled={isAdding || !selectedPlanId}
                >
                  {isAdding ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ShoppingCart className="mr-2 h-4 w-4" />
                  )}
                  {session ? "Add to Cart" : "Sign In to Order"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
