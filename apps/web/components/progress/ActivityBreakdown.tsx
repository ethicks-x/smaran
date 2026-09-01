export function ActivityBreakdown({
	data,
}: {
	data: { activity: string; label: string; accuracy: number; count: number }[];
}) {
	return (
		<div className="space-y-4">
			{data.map((a) => (
				<div key={a.activity}>
					<div className="mb-1.5 flex items-center justify-between text-sm">
						<span className="font-medium text-ink-700">
							{a.label} <span className="text-ink-500">({a.count} asked)</span>
						</span>
						<span className="font-semibold text-ink-900">{a.accuracy}%</span>
					</div>
					<div className="h-2 w-full overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.08]">
						<div
							className="h-full rounded-full bg-indigo-500 transition-all duration-700"
							style={{ width: `${a.accuracy}%` }}
						/>
					</div>
				</div>
			))}
			{data.length === 0 && (
				<p className="text-sm text-ink-500">No answered questions yet.</p>
			)}
		</div>
	);
}
