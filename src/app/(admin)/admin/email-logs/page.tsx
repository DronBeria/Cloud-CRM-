"use client";

import { useState, useEffect } from "react";
import { Mail, Loader2, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { toast } from "sonner";

interface EmailLog {
  id: string;
  to: string;
  subject: string;
  status: string;
  error?: string;
  templateKey?: string;
  createdAt: string;
}

export default function EmailLogsPage() {
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  const fetch_ = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (status) params.set("status", status);
      const res = await fetch(`/api/admin/email-logs?${params}`);
      const data = await res.json();
      setLogs(data.logs ?? []);
      setTotal(data.total ?? 0);
      setPages(data.pages ?? 1);
    } catch { toast.error("Failed to load"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetch_(); }, [page, status]);

  const sent = logs.filter((l) => l.status === "sent").length;
  const failed = logs.filter((l) => l.status === "failed").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Email Logs</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} emails tracked</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetch_} className="gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" />Refresh
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Sent", value: total, icon: Mail, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Successful", value: sent, icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Failed", value: failed, icon: XCircle, color: "text-red-500", bg: "bg-red-50" },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-white border border-gray-100 rounded-xl p-4 flex items-center gap-3">
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${s.bg} shrink-0`}>
                <Icon className={`h-4 w-4 ${s.color}`} />
              </div>
              <div>
                <p className="text-xs text-gray-400">{s.label}</p>
                <p className="text-xl font-bold text-gray-900">{s.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      <Card className="border-gray-100">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Mail className="h-4 w-4 text-gray-400" />Email History
            </CardTitle>
            <Select value={status} onValueChange={(v) => { setStatus(v === "all" ? "" : v); setPage(1); }}>
              <SelectTrigger className="h-8 w-32 text-xs bg-gray-50 border-gray-200">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
          ) : logs.length === 0 ? (
            <div className="text-center py-10">
              <Mail className="h-10 w-10 mx-auto mb-2 text-gray-200" />
              <p className="text-sm text-gray-400">No emails logged yet</p>
              <p className="text-xs text-gray-300 mt-1">Emails will appear here once SMTP is configured</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {logs.map((log) => (
                <div key={log.id} className="flex items-start gap-3 py-3">
                  <div className={`flex h-7 w-7 items-center justify-center rounded-full shrink-0 mt-0.5 ${log.status === "sent" ? "bg-emerald-50" : "bg-red-50"}`}>
                    {log.status === "sent"
                      ? <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                      : <XCircle className="h-3.5 w-3.5 text-red-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{log.subject}</p>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">To: {log.to}</p>
                    {log.error && <p className="text-xs text-red-500 mt-0.5 truncate">{log.error}</p>}
                    {log.templateKey && (
                      <Badge variant="outline" className="text-[10px] h-4 px-1.5 mt-1">{log.templateKey}</Badge>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 shrink-0 mt-0.5">
                    {format(new Date(log.createdAt), "dd MMM, HH:mm")}
                  </p>
                </div>
              ))}
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
