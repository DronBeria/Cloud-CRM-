"use client";

import { formatDistanceToNow } from "date-fns";
import { UserPlus, CreditCard, MessageSquare, Server, TrendingUp } from "lucide-react";

type ActivityType = "client_joined" | "payment_received" | "ticket_opened" | "service_created" | "lead_created";

interface ActivityItem {
  id: string;
  type: ActivityType;
  title: string;
  subtitle: string;
  time: string;
}

interface Props {
  items: ActivityItem[];
}

const CONFIG: Record<ActivityType, { icon: React.ElementType; bg: string; color: string }> = {
  client_joined:    { icon: UserPlus,      bg: "bg-blue-50",    color: "text-blue-500"   },
  payment_received: { icon: CreditCard,    bg: "bg-green-50",   color: "text-green-500"  },
  ticket_opened:    { icon: MessageSquare, bg: "bg-yellow-50",  color: "text-yellow-500" },
  service_created:  { icon: Server,        bg: "bg-violet-50",  color: "text-violet-500" },
  lead_created:     { icon: TrendingUp,    bg: "bg-orange-50",  color: "text-orange-500" },
};

export function ActivityFeed({ items }: Props) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-400">
        <Server className="h-8 w-8 mb-2 opacity-30" />
        <p className="text-sm">No activity yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {items.map((item, i) => {
        const cfg = CONFIG[item.type] ?? CONFIG.service_created;
        const Icon = cfg.icon;
        return (
          <div key={`${item.id}-${i}`} className="flex items-start gap-3 px-1 py-2.5 rounded-lg hover:bg-gray-50 transition-colors">
            <div className={`flex h-7 w-7 items-center justify-center rounded-full ${cfg.bg} shrink-0 mt-0.5`}>
              <Icon className={`h-3.5 w-3.5 ${cfg.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 leading-none">{item.title}</p>
              <p className="text-xs text-gray-400 mt-0.5 truncate">{item.subtitle}</p>
            </div>
            <p className="text-[11px] text-gray-400 shrink-0 mt-0.5">
              {formatDistanceToNow(new Date(item.time), { addSuffix: true })}
            </p>
          </div>
        );
      })}
    </div>
  );
}
