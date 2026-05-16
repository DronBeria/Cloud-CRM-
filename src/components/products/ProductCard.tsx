import Link from "next/link";
import { Package, ArrowRight } from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

interface ProductCardProps {
  product: {
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
        currency: { prefix: string; suffix: string; code: string };
      }[];
    }[];
  };
}

export function ProductCard({ product }: ProductCardProps) {
  const lowestPrice = product.plans
    .flatMap((p) => p.prices)
    .reduce(
      (min, price) => (price.price < min.price ? price : min),
      product.plans[0]?.prices[0] ?? { price: 0, currency: { prefix: "$", suffix: "", code: "USD" } }
    );

  const startingPlan = product.plans.find((p) =>
    p.prices.some((pr) => pr.price === lowestPrice.price)
  );

  return (
    <Card className="flex flex-col hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5">
      <CardContent className="flex-1 p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
            <Package className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            {product.category && (
              <Badge variant="secondary" className="mb-2 text-xs">
                {product.category.name}
              </Badge>
            )}
            <h3 className="font-bold text-lg leading-tight">{product.name}</h3>
            {product.description && (
              <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">
                {product.description}
              </p>
            )}
          </div>
        </div>

        {product.plans.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-2">
              Starting from
            </p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-primary">
                {formatCurrency(
                  lowestPrice.price,
                  lowestPrice.currency.prefix,
                  lowestPrice.currency.suffix
                )}
              </span>
              <span className="text-sm text-muted-foreground">
                /{startingPlan?.billingPeriod === 1 ? "" : startingPlan?.billingPeriod}
                {startingPlan?.billingUnit}
              </span>
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="p-6 pt-0">
        <Button className="w-full" asChild>
          <Link
            href={`/products/${product.category?.slug ?? "uncategorized"}/${product.slug}`}
          >
            Order Now
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
