import { Metadata } from "next";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Puzzle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Extensions — Admin" };

export default async function AdminExtensionsPage() {
  const session = await auth();
  const sessionUser = session?.user as { role?: string } | undefined;
  if (!session || sessionUser?.role !== "admin") redirect("/dashboard");

  const extensions = await db.extension.findMany({
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Extensions</h1>
        <p className="text-muted-foreground mt-1">
          Manage installed extensions and integrations
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Puzzle className="h-5 w-5" />
            Installed Extensions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {extensions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Path</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {extensions.map((ext) => (
                  <TableRow key={ext.id}>
                    <TableCell className="font-medium">{ext.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {ext.type}
                      </Badge>
                    </TableCell>
                    <TableCell>v{ext.version}</TableCell>
                    <TableCell className="text-muted-foreground text-sm font-mono">
                      {ext.path}
                    </TableCell>
                    <TableCell>
                      <Badge variant={ext.enabled ? "success" : "secondary"}>
                        {ext.enabled ? "Enabled" : "Disabled"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Puzzle className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No extensions installed</p>
              <p className="text-sm mt-1">
                Extensions can be added to extend platform functionality.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
