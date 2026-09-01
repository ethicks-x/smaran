"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, X } from "lucide-react";
import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useState,
} from "react";

interface ToastItem {
	id: number;
	message: string;
}

const ToastContext = createContext<{ showToast: (msg: string) => void } | null>(
	null,
);

export function ToastProvider({ children }: { children: ReactNode }) {
	const [toasts, setToasts] = useState<ToastItem[]>([]);

	const showToast = useCallback((message: string) => {
		const id = Date.now();
		setToasts((t) => [...t, { id, message }]);
		setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3000);
	}, []);

	return (
		<ToastContext.Provider value={{ showToast }}>
			{children}
			<div className="pointer-events-none fixed bottom-5 right-5 z-[100] flex flex-col gap-2.5">
				<AnimatePresence>
					{toasts.map((t) => (
						<motion.div
							key={t.id}
							initial={{ opacity: 0, y: 20, scale: 0.95 }}
							animate={{ opacity: 1, y: 0, scale: 1 }}
							exit={{ opacity: 0, scale: 0.95 }}
							className="pointer-events-auto flex items-center gap-2.5 rounded-xl border border-black/[0.06] bg-surface px-4 py-3 shadow-2xl shadow-indigo-900/15"
						>
							<CheckCircle2 size={17} className="shrink-0 text-mint-500" />
							<span className="text-sm font-medium text-ink-900">
								{t.message}
							</span>
							<button
								type="button"
								onClick={() =>
									setToasts((ts) => ts.filter((x) => x.id !== t.id))
								}
								className="ml-1 text-ink-300 hover:text-ink-700"
							>
								<X size={14} />
							</button>
						</motion.div>
					))}
				</AnimatePresence>
			</div>
		</ToastContext.Provider>
	);
}

export function useToast() {
	const ctx = useContext(ToastContext);
	if (!ctx) throw new Error("useToast must be used inside ToastProvider");
	return ctx;
}
