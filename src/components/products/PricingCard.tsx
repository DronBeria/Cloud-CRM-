"use client";

import { Check, ShoppingCart } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface PricingCardProps {
  plan: {
    id: string;
    name: string;
    billingPeriod: number;
    billingUnit: string;
    prices: {
      price: number;
      setupFee: number;
      currency: { prefix: string; suffix: string; code: string };
    }[];
  };
  features?: string[];
  isPopular?: boolean;
  onSelect?: (planId: string) => void;
  isSelected?: boolean;
}

export function PricingCard({
  plan,
  features = [],
  isPopular = false,
  onSelect,
  isSelected = false,
}: PricingCardProps) {
  const price = plan.prices[0];
  if (!price) return null;

  const billingLabel =
    plan.billingPeriod === 1
      ? plan.billingUnit
      : `${plan.billingPeriod} ${plan.billingUnit}s`;

  return (
    <Card
      className={cn(
        "flex flex-col transition-all duration-200",
        isPopular && "border-primary shadow-lg scale-105",
        isSelected && "border-primary ring-2 ring-primary ring-offset-2",
        !isSelected && !isPopular && "hover:shadow-md hover:-translate-y-0.5"
      )}
    >
      {isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="shadow-sm">Most Popular</Badge>
        </div>
      )}

      <CardHeader className="pb-4">
        <h3 className="text-xl font-bold">{plan.name}</h3>
        <p className="text-sm text-muted-foreground">
          Billed every {billingLabel}
        </p>
        <div className="mt-2">
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-extrabold">
              {formatCurrency(price.price, price.currency.prefix, price.currency.suffix)}
            </span>
            <span className="text-muted-foreground text-sm">/{billingLabel}</span>
          </div>
          {price.setupFee > 0 && (
            <p className="text-sm text-muted-foreground mt-1">
              +{formatCurrency(price.setupFee, price.currency.prefix, price.currency.suffix)} setup fee
            </p>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1">
        {features.length > 0 && (
          <ul className="space-y-2">
            {features.map((feature, i) => (
              <li key={i} className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-green-500 shrink-0" />
                {feature}
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <CardFooter>
        <Button
          className="w-full"
          variant={isSelected ? "secondary" : isPopular ? "default" : "outline"}
          onClick={() => onSelect?.(plan.id)}
        >
          <ShoppingCart className="mr-2 h-4 w-4" />
          {isSelected ? "Selected" : "Select Plan"}
        </Button>
      </CardFooter>
    </Card>
  );
}
