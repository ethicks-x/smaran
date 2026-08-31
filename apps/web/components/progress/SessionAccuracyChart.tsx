"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export function SessionAccuracyChart({ data }: { data: { date: string; accuracy: number }[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#EDE9F9" />
          <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#6C6789" }} />
          <YAxis domain={[0, 100]} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#6C6789" }} />
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              border: "1px solid rgba(44,31,88,0.08)",
              boxShadow: "0 4px 24px rgba(44,31,88,0.1)",
              fontSize: 13,
            }}
          />
          <Line type="monotone" dataKey="accuracy" stroke="#6C4FCB" strokeWidth={2.5} dot={{ r: 4 }} name="Accuracy %" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}