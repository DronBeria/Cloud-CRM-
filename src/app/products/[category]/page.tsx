import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ProductCard } from "@/components/products/ProductCard";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Package } from "lucide-react";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  const cat = await db.category.findUnique({ where: { slug: category } });
  return { title: cat?.name ?? "Products" };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category: slug } = await params;

  const category = await db.category.findUnique({
    where: { slug },
    include: {
      products: {
        where: { hidden: false },
        include: {
          category: true,
          plans: {
            include: {
              prices: {
                include: { currency: true },
                where: { currency: { enabled: true } },
                take: 1,
              },
            },
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: { sort: "asc" },
      },
    },
  });

  if (!category) notFound();

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container max-w-7xl mx-auto px-4 py-12">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{category.name}</h1>
            <p className="text-muted-foreground">
              {category.products.length} product
              {category.products.length !== 1 ? "s" : ""} available
            </p>
          </div>
        </div>

        {category.products.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {category.products.map((product) => (
              <ProductCard
                key={product.id}
                product={{
                  ...product,
                  plans: product.plans.map((plan) => ({
                    ...plan,
                    prices: plan.prices.map((p) => ({
                      price: Number(p.price),
                      currency: {
                        prefix: p.currency.prefix,
                        suffix: p.currency.suffix,
                        code: p.currency.code,
                      },
                    })),
                  })),
                }}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No products in this category yet.</p>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
