import type { Metadata } from "next";
import { db } from "@/lib/db";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ProductCard } from "@/components/products/ProductCard";
import { Badge } from "@/components/ui/badge";
import { Package, Zap, Shield, HeadphonesIcon } from "lucide-react";

export const metadata: Metadata = {
  title: "Products & Services",
  description: "Browse our cloud services and hosting plans",
};

export default async function HomePage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let categories: any[] = [];
  try {
    categories = await db.category.findMany({
      where: { parentId: null },
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
      orderBy: { sort: "asc" },
    });
  } catch {
    // DB unavailable — render empty state
  }

  const features = [
    {
      icon: Zap,
      title: "Lightning Fast",
      description: "Optimized infrastructure for maximum performance",
    },
    {
      icon: Shield,
      title: "Secure & Reliable",
      description: "Enterprise-grade security with 99.9% uptime SLA",
    },
    {
      icon: HeadphonesIcon,
      title: "24/7 Support",
      description: "Expert support team ready to help anytime",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative py-20 px-4 text-center bg-gradient-to-br from-background via-background to-primary/5">
          <div className="container mx-auto max-w-4xl">
            <Badge variant="secondary" className="mb-4">
              Cloud Services Platform
            </Badge>
            <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-6">
              Power Your
              <span className="text-primary"> Digital Business</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              Professional cloud services with transparent pricing, instant
              provisioning, and world-class support. Get started in minutes.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              {features.map((feature) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={feature.title}
                    className="flex items-center gap-2 text-sm font-medium"
                  >
                    <Icon className="h-4 w-4 text-primary" />
                    {feature.title}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Product Catalog */}
        <section className="py-16 px-4">
          <div className="container mx-auto max-w-7xl">
            {categories.length > 0 ? (
              categories.map((category) => {
                if (category.products.length === 0) return null;
                return (
                  <div key={category.id} className="mb-16">
                    <div className="flex items-center gap-3 mb-8">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <Package className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold">{category.name}</h2>
                        <p className="text-sm text-muted-foreground">
                          {category.products.length} product
                          {category.products.length !== 1 ? "s" : ""} available
                        </p>
                      </div>
                    </div>

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
                  </div>
                );
              })
            ) : (
              <div className="text-center py-20">
                <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h2 className="text-2xl font-bold mb-2">
                  No products available
                </h2>
                <p className="text-muted-foreground">
                  Products will appear here once they&apos;re added by the
                  administrator.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16 px-4 bg-muted/50">
          <div className="container mx-auto max-w-5xl text-center">
            <h2 className="text-3xl font-bold mb-3">Why Choose Us?</h2>
            <p className="text-muted-foreground mb-12">
              We provide the best cloud infrastructure for your business
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {features.map((feature) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={feature.title}
                    className="flex flex-col items-center text-center p-6 bg-background rounded-xl border"
                  >
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 mb-4">
                      <Icon className="h-7 w-7 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
