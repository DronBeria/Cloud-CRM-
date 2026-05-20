"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ShoppingCart, Loader2, ArrowRight, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CartItem } from "@/components/cart/CartItem";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/utils";

interface Cart {
  id: string;
  items: Array<{
    id: string;
    plan: {
      name: string;
      billingPeriod: number;
      billingUnit: string;
      product: { name: string };
      prices: {
        price: number;
        setupFee: number;
        currency: { prefix: string; suffix: string; code: string };
      }[];
    };
  }>;
  coupon?: { code: string; type: string; value: number } | null;
}

export default function CartPage() {
    const router = useRouter();
  const [cart, setCart] = useState<Cart | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [removingItemId, setRemovingItemId] = useState<string | null>(null);

  useEffect(() => {
    fetchCart();
  }, []);

  const fetchCart = async () => {
    try {
      const res = await fetch("/api/cart");
      if (!res.ok) throw new Error("Failed to fetch cart");
      const data = await res.json();
      setCart(data);
    } catch {
      toast.error("Failed to load cart");
    } finally {
      setIsLoading(false);
    }
  };

  const removeItem = async (itemId: string) => {
    setRemovingItemId(itemId);
    try {
      const res = await fetch(`/api/cart/items/${itemId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      await fetchCart();
      toast.success("Item removed");
    } catch {
      toast.error("Failed to remove item");
    } finally {
      setRemovingItemId(null);
    }
  };

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    setIsApplyingCoupon(true);
    try {
      const res = await fetch("/api/cart", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ couponCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Invalid coupon code");
        return;
      }
      await fetchCart();
      toast.success("Coupon applied!");
      setCouponCode("");
    } catch {
      toast.error("Failed to apply coupon");
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const checkout = async () => {
    if (!session) {
      router.push("/login?callbackUrl=/cart");
      return;
    }
    setIsCheckingOut(true);
    try {
      const res = await fetch("/api/cart/checkout", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Checkout failed");
        return;
      }
      toast.success("Order placed! Redirecting to invoice...");
      router.push(`/invoices/${data.invoiceId}`);
    } catch {
      toast.error("Checkout failed. Please try again.");
    } finally {
      setIsCheckingOut(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const items = cart?.items ?? [];
  const prefix = items[0]?.plan?.prices[0]?.currency.prefix ?? "$";
  const suffix = items[0]?.plan?.prices[0]?.currency.suffix ?? "";

  const subtotal = items.reduce((sum, item) => {
    const price = item.plan.prices[0];
    return sum + (price ? Number(price.price) + Number(price.setupFee) : 0);
  }, 0);

  let discount = 0;
  if (cart?.coupon) {
    if (cart.coupon.type === "percent") {
      discount = subtotal * (cart.coupon.value / 100);
    } else {
      discount = cart.coupon.value;
    }
  }

  const total = Math.max(0, subtotal - discount);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Shopping Cart</h1>
        <p className="text-muted-foreground mt-1">
          {items.length} item{items.length !== 1 ? "s" : ""} in your cart
        </p>
      </div>

      {items.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="p-6">
                {items.map((item) => (
                  <CartItem
                    key={item.id}
                    item={item}
                    onRemove={removeItem}
                    isRemoving={removingItemId === item.id}
                  />
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(subtotal, prefix, suffix)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                    <span>Discount ({cart?.coupon?.code})</span>
                    <span>-{formatCurrency(discount, prefix, suffix)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>{formatCurrency(total, prefix, suffix)}</span>
                </div>
              </CardContent>
              <CardFooter className="flex-col gap-3">
                {/* Coupon Code */}
                <div className="flex gap-2 w-full">
                  <Input
                    placeholder="Coupon code"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={applyCoupon}
                    disabled={isApplyingCoupon}
                  >
                    {isApplyingCoupon ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Tag className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                <Button
                  className="w-full"
                  onClick={checkout}
                  disabled={isCheckingOut}
                >
                  {isCheckingOut ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowRight className="mr-2 h-4 w-4" />
                  )}
                  {session ? "Checkout" : "Sign In to Checkout"}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      ) : (
        <div className="text-center py-16 text-muted-foreground border rounded-lg">
          <ShoppingCart className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-medium">Your cart is empty</h3>
          <p className="text-sm mt-1">Add some services to get started.</p>
          <Button className="mt-4" asChild>
            <Link href="/">Browse Products</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
