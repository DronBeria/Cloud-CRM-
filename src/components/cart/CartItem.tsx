"use client";

import { Trash2, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";

interface CartItemProps {
  item: {
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
  };
  onRemove: (itemId: string) => void;
  isRemoving?: boolean;
}

export function CartItem({ item, onRemove, isRemoving }: CartItemProps) {
  const price = item.plan.prices[0];
  const billingLabel =
    item.plan.billingPeriod === 1
      ? item.plan.billingUnit
      : `${item.plan.billingPeriod} ${item.plan.billingUnit}s`;

  return (
    <div className="flex items-center justify-between gap-4 py-4 border-b last:border-0">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Package className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="font-medium">{item.plan.product.name}</p>
          <p className="text-sm text-muted-foreground">
            {item.plan.name} — {billingLabel}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {price && (
          <div className="text-right">
            <p className="font-semibold">
              {formatCurrency(price.price, price.currency.prefix, price.currency.suffix)}
              <span className="text-sm font-normal text-muted-foreground">
                /{billingLabel}
              </span>
            </p>
            {price.setupFee > 0 && (
              <p className="text-xs text-muted-foreground">
                +{formatCurrency(price.setupFee, price.currency.prefix, price.currency.suffix)} setup
              </p>
            )}
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={() => onRemove(item.id)}
          disabled={isRemoving}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
