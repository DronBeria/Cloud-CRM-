"use client";

import { useState, useEffect } from "react";
import { Activity, Search, Filter, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { formatDistanceToNow } from "date-fns";

const ACTION_COLORS: Record<string, string> = {
  create: "bg-emerald-50 text-emerald-700",
  update: "bg-blue-50 text-blue-700",
  delete: "bg-red-50 text-red-700",
  invoice_paid: "bg-green-50 text-green-700",
  service_suspended: "bg-yellow-50 text-yellow-700",
  client_created: "bg-violet-50 text-violet-700",
  settings_updated: "bg-orange-50 text-orange-700",
  login: "bg-gray-100 text-gray-700",
};

interface Log {
  id: string;
  userId?: string;
  action: string;
  entity: string;
  entityId?: string;
  oldData?: unknown;
  newData?: unknown;
  ipAddress?: string;
  createdAt: string;
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [action, setAction] = useState("");
  const [entity, setEntity] = useState("");
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (action) params.set("action", action);
    if (entity) params.set("entity", entity);

    fetch(`/api/admin/audit?${params}`)
      .then((r) => r.json())
      .then((d) => { setLogs(d.logs ?? []); setTotal(d.total ?? 0); setPages(d.pages ?? 1); })
      .finally(() => setLoading(false));
  }, [page, action, entity]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
        <p className="text-sm text-gray-500 mt-0.5">{total} events recorded · Full activity trail</p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Select value={action} onValueChange={setAction}>
          <SelectTrigger className="h-9 w-44 text-sm bg-gray-50 border-gray-200">
            <SelectValue placeholder="All actions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All actions</SelectItem>
            {["create", "update", "delete", "invoice_paid", "service_suspended", "client_created", "login"].map((a) => (
              <SelectItem key={a} value={a}>{a.replace(/_/g, " ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={entity} onValueChange={setEntity}>
          <SelectTrigger className="h-9 w-44 text-sm bg-gray-50 border-gray-200">
            <SelectValue placeholder="All entities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All entities</SelectItem>
            {["invoice", "service", "user", "settings", "gateway", "product"].map((e) => (
              <SelectItem key={e} value={e}>{e}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(action || entity) && (
          <Button variant="ghost" size="sm" onClick={() => { setAction(""); setEntity(""); }}>
            Clear
          </Button>
        )}
      </div>

      <Card className="border-gray-100">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-gray-600 flex items-center gap-2">
            <Activity className="h-4 w-4 text-gray-400" />Activity Timeline
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Activity className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No audit events yet</p>
            </div>
          ) : (
            <div className="relative">
              <div className="absolute left-[18px] top-0 bottom-0 w-px bg-gray-100" />
              <div className="space-y-1">
                {logs.map((log) => (
                  <div key={log.id}>
                    <button
                      className="w-full flex items-start gap-4 py-3 pl-2 pr-3 hover:bg-gray-50 rounded-lg transition-colors text-left"
                      onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                    >
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white border-2 border-gray-200 shrink-0 z-10 mt-0.5">
                        <div className="h-2 w-2 rounded-full bg-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${ACTION_COLORS[log.action] ?? "bg-gray-100 text-gray-600"}`}>
                            {log.action.replace(/_/g, " ")}
                          </span>
                          <span className="text-sm text-gray-700 font-medium capitalize">{log.entity}</span>
                          {log.entityId && <span className="text-xs text-gray-400 font-mono">#{log.entityId.slice(-6)}</span>}
                        </div>
                        {log.ipAddress && <p className="text-xs text-gray-400 mt-0.5">IP: {log.ipAddress}</p>}
                      </div>
                      <span className="text-xs text-gray-400 shrink-0 mt-0.5">
                        {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                      </span>
                    </button>
                    {expanded === log.id && (log.oldData || log.newData) && (
                      <div className="ml-10 mb-2 p-3 bg-gray-50 rounded-lg text-xs font-mono space-y-2">
                        {log.oldData && (
                          <div>
                            <p className="text-red-500 font-semibold mb-1">Before</p>
                            <pre className="text-gray-600 whitespace-pre-wrap overflow-auto max-h-32">
                              {JSON.stringify(log.oldData, null, 2)}
                            </pre>
                          </div>
                        )}
                        {log.newData && (
                          <div>
                            <p className="text-emerald-600 font-semibold mb-1">After</p>
                            <pre className="text-gray-600 whitespace-pre-wrap overflow-auto max-h-32">
                              {JSON.stringify(log.newData, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {pages > 1 && (
            <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-50">
              <p className="text-xs text-gray-400">Page {page} of {pages}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
                <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
