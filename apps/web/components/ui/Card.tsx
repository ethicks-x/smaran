import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
	return (
		<div
			className={cn(
				"rounded-2xl border border-black/[0.06] dark:border-white/[0.08] bg-surface shadow-[0_2px_8px_rgba(44,31,88,0.06)] dark:shadow-none",
				className,
			)}
			{...props}
		/>
	);
}

export function CardHeader({
	className,
	...props
}: HTMLAttributes<HTMLDivElement>) {
	return <div className={cn("p-5 pb-3", className)} {...props} />;
}

export function CardContent({
	className,
	...props
}: HTMLAttributes<HTMLDivElement>) {
	return <div className={cn("p-5 pt-0", className)} {...props} />;
}

export function CardTitle({
	className,
	...props
}: HTMLAttributes<HTMLHeadingElement>) {
	return (
		<h3
			className={cn(
				"font-display text-lg font-semibold text-ink-900",
				className,
			)}
			{...props}
		/>
	);
}
