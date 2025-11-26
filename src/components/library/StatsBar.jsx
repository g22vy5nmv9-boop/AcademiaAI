import React from "react";
import { Card } from "@/components/ui/card";
import { BookOpen, Target, TrendingUp } from "lucide-react";

export default function StatsBar({ materials }) {
  const totalMaterials = materials.length;
  const byDifficulty = materials.reduce((acc, m) => {
    acc[m.difficulty] = (acc[m.difficulty] || 0) + 1;
    return acc;
  }, {});

  const stats = [
    {
      label: "Total Materials",
      value: totalMaterials,
      icon: BookOpen,
      color: "var(--sage-500)"
    },
    {
      label: "Easy",
      value: byDifficulty.easy || 0,
      icon: Target,
      color: "#10b981"
    },
    {
      label: "Medium",
      value: byDifficulty.medium || 0,
      icon: TrendingUp,
      color: "#f59e0b"
    },
    {
      label: "Hard",
      value: byDifficulty.hard || 0,
      icon: TrendingUp,
      color: "#ef4444"
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {stats.map((stat, index) => (
        <Card 
          key={index}
          className="p-4 rounded-2xl border shadow-sm hover:shadow-md transition-all duration-300"
          style={{ borderColor: 'var(--sage-200)' }}
        >
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${stat.color}15` }}
            >
              <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-xs text-gray-600">{stat.label}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}