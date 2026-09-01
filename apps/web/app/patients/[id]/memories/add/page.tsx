"use client";

import {
	AlertCircle,
	ArrowLeft,
	Check,
	Loader,
	type LucideIcon,
	MapPin,
	Package,
	UploadCloud,
	User,
	X,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useApi } from "@/hooks/use-api";
import type {
	MemoryAssetApi,
	MemoryKind,
	MemorySubjectApi,
	MemoryUploadTicketApi,
} from "@/lib/types";

const kinds: { key: MemoryKind; label: string; icon: LucideIcon }[] = [
	{ key: "person", label: "Person", icon: User },
	{ key: "place", label: "Place", icon: MapPin },
	{ key: "object", label: "Object", icon: Package },
];

/**
 * Mirrors `ALLOWED_CONTENT_TYPES` and `S3_MAX_UPLOAD_BYTES` in `apps/api`. Checking here is
 * a courtesy so the caregiver hears about it before waiting on an upload — not the
 * enforcement. The API refuses the same things, and re-reads the real size from the bucket
 * afterwards, because a presigned PUT accepts whatever the browser sends it.
 */
const ACCEPTED = [
	"image/jpeg",
	"image/png",
	"image/webp",
	"image/heic",
	"image/heif",
];
const MAX_BYTES = 25 * 1024 * 1024;

export default function AddMemorySubjectPage() {
	const router = useRouter();
	const api = useApi();
	const params = useParams<{ id: string }>();
	const [selected, setSelected] = useState<MemoryKind | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [photo, setPhoto] = useState<File | null>(null);
	const [photoPreview, setPhotoPreview] = useState<string | null>(null);
	const photoInput = useRef<HTMLInputElement>(null);
	const [formData, setFormData] = useState({
		name: "",
		relation: "",
		description: "",
	});

	// An object URL is a document-lifetime handle, not a string. Without the revoke the page
	// leaks one for every picture the caregiver tries before settling on the one they want.
	useEffect(() => {
		if (!photo) {
			setPhotoPreview(null);
			return;
		}
		const url = URL.createObjectURL(photo);
		setPhotoPreview(url);
		return () => URL.revokeObjectURL(url);
	}, [photo]);

	const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0] ?? null;
		setError(null);
		if (file && !ACCEPTED.includes(file.type)) {
			setError(
				"That file is not a photo we can use. Try a JPEG, PNG or HEIC picture.",
			);
			return;
		}
		if (file && file.size > MAX_BYTES) {
			setError("That picture is too large. Try a smaller one.");
			return;
		}
		setPhoto(file);
	};

	const clearPhoto = () => {
		setPhoto(null);
		if (photoInput.current) photoInput.current.value = "";
	};

	const handleInputChange = (
		e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
	) => {
		const { name, value } = e.target;
		setFormData((prev) => ({ ...prev, [name]: value }));
	};

	const handleSave = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!selected || !formData.name.trim()) {
			setError("Please fill in all required fields");
			return;
		}

		setLoading(true);
		setError(null);

		try {
			const subject = await api<MemorySubjectApi>(
				`/dashboard/patients/${params.id}/memories`,
				{
					method: "POST",
					body: {
						kind: selected,
						name: formData.name.trim(),
						...(selected === "person" &&
							formData.relation && { relation: formData.relation.trim() }),
						is_active: true,
					},
				},
			);

			if (photo) {
				// Three steps, and the middle one does not touch our API at all. The API signs a
				// URL and later confirms what landed; the bytes go straight from this browser to
				// the bucket, so a photo on a slow connection never occupies an API worker, and
				// the picture never sits in a database column as base64 (`decisions.md` D-33).
				const ticket = await api<MemoryUploadTicketApi>(
					`/dashboard/patients/${params.id}/memories/uploads`,
					{
						method: "POST",
						body: {
							file_name: photo.name,
							content_type: photo.type,
							size_bytes: photo.size,
							kind: "photo",
							description: formData.description.trim() || null,
							subject_id: subject.id,
						},
					},
				);

				const put = await fetch(ticket.upload_url, {
					method: "PUT",
					body: photo,
					// Signed into the URL, so it has to match exactly or the bucket refuses it.
					headers: { "Content-Type": ticket.content_type },
				});
				if (!put.ok) {
					throw new Error(
						"The picture did not finish uploading. Please try again.",
					);
				}

				// Nothing treats the picture as real until the API has seen it in the bucket.
				await api<MemoryAssetApi>(
					`/dashboard/patients/${params.id}/memories/uploads/${ticket.asset_id}/confirm`,
					{ method: "POST", body: {} },
				);
			}

			router.push(`/patients/${params.id}?tab=memories`);
		} catch (err) {
			setError(
				err instanceof Error
					? err.message
					: "Failed to save memory subject. Please try again.",
			);
		} finally {
			setLoading(false);
		}
	};

	const handleReset = () => {
		setSelected(null);
		clearPhoto();
		setFormData({ name: "", relation: "", description: "" });
		setError(null);
	};

	return (
		<DashboardShell>
			<div className="mx-auto max-w-xl">
				<Link
					href={`/patients/${params.id}?tab=memories`}
					className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-900"
				>
					<ArrowLeft size={15} /> Back to Memory Subjects
				</Link>

				<h1 className="font-display text-2xl font-bold text-ink-900 sm:text-3xl">
					Add a Memory Subject
				</h1>
				<p className="mt-1.5 text-sm text-ink-500">
					This will be used to personalize cognitive recognition games and
					synced to the patient's device.
				</p>

				<div className="mt-8">
					{!selected ? (
						<div className="grid grid-cols-3 gap-4">
							{kinds.map((k) => (
								<button
									type="button"
									key={k.key}
									onClick={() => setSelected(k.key)}
									className="flex flex-col items-center gap-3 rounded-2xl border border-black/6 bg-surface p-6 text-center shadow-[0_2px_8px_rgba(44,31,88,0.06)] hover:border-indigo-300"
								>
									<span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
										<k.icon size={20} />
									</span>
									<span className="text-sm font-medium text-ink-900">
										{k.label}
									</span>
								</button>
							))}
						</div>
					) : (
						<Card className="p-6 sm:p-8">
							<div className="mb-6 flex items-center justify-between">
								<p className="font-display text-lg font-semibold text-ink-900 capitalize">
									{selected}
								</p>
								<button
									type="button"
									onClick={handleReset}
									className="text-xs font-medium text-ink-500 hover:text-ink-900"
									disabled={loading}
								>
									Change type
								</button>
							</div>

							{error && (
								<div className="mb-4 flex gap-2 rounded-xl border border-coral-200 bg-coral-50/40 p-3">
									<AlertCircle size={18} className="shrink-0 text-coral-600" />
									<p className="text-sm text-coral-600">{error}</p>
								</div>
							)}

							<form className="space-y-5" onSubmit={handleSave}>
								<div>
									<span className="mb-1.5 block text-sm font-medium text-ink-700">
										Upload Photo (Optional)
									</span>
									<input
										id="photo"
										ref={photoInput}
										type="file"
										accept={ACCEPTED.join(",")}
										onChange={handlePhotoChange}
										className="hidden"
										disabled={loading}
									/>

									{photoPreview ? (
										<div className="relative overflow-hidden rounded-xl border border-black/10">
											{/* biome-ignore lint/performance/noImgElement: a local object URL, not a remote asset */}
											<img
												src={photoPreview}
												alt={photo?.name ?? "The picture you chose"}
												className="h-48 w-full object-cover"
											/>
											<button
												type="button"
												onClick={clearPhoto}
												disabled={loading}
												className="absolute top-2 right-2 rounded-lg bg-black/60 p-1.5 text-white hover:bg-black/75 disabled:opacity-50"
												aria-label="Remove this picture"
											>
												<X size={14} />
											</button>
										</div>
									) : (
										<label
											htmlFor="photo"
											className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-black/15 py-10 text-ink-400 hover:border-indigo-300 hover:text-indigo-500"
										>
											<UploadCloud size={26} />
											<span className="text-xs font-medium">
												Click or drag a photo to upload
											</span>
										</label>
									)}
									{photo && (
										<p className="mt-1.5 truncate text-xs text-ink-500">
											{photo.name}
										</p>
									)}
								</div>

								<div>
									<label
										htmlFor="name"
										className="mb-1.5 block text-sm font-medium text-ink-700"
									>
										Name <span className="text-coral-500">*</span>
									</label>
									<input
										required
										id="name"
										name="name"
										value={formData.name}
										onChange={handleInputChange}
										placeholder={
											selected === "person"
												? "e.g. Priya"
												: selected === "place"
													? "e.g. College Street"
													: "e.g. His old radio"
										}
										className="w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm focus:border-indigo-400 focus:outline-none disabled:bg-black/5"
										disabled={loading}
									/>
								</div>

								{selected === "person" && (
									<div>
										<label
											htmlFor="relationship"
											className="mb-1.5 block text-sm font-medium text-ink-700"
										>
											Relationship (Optional)
										</label>
										<input
											id="relationship"
											name="relation"
											value={formData.relation}
											onChange={handleInputChange}
											placeholder="e.g. daughter, grandson"
											className="w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm focus:border-indigo-400 focus:outline-none disabled:bg-black/5"
											disabled={loading}
										/>
									</div>
								)}

								<div>
									<label
										htmlFor="description"
										className="mb-1.5 block text-sm font-medium text-ink-700"
									>
										Description (Optional)
									</label>
									<textarea
										id="description"
										name="description"
										rows={3}
										value={formData.description}
										onChange={handleInputChange}
										placeholder="e.g. Priya on her birthday, at the house in Shillong"
										className="w-full resize-y rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm focus:border-indigo-400 focus:outline-none disabled:bg-black/5"
										disabled={loading}
									/>
									<p className="mt-1.5 text-xs text-ink-500">
										Saved with the picture, and read aloud on the phone.
									</p>
								</div>

								<div className="flex justify-end gap-3 border-t border-black/6 pt-5">
									<Button
										type="button"
										variant="ghost"
										onClick={handleReset}
										disabled={loading}
									>
										Cancel
									</Button>
									<Button type="submit" disabled={loading} className="gap-2">
										{loading ? (
											<>
												<Loader size={16} className="animate-spin" />
												{photo ? "Uploading..." : "Saving..."}
											</>
										) : (
											<>
												<Check size={16} /> Save &amp; Sync
											</>
										)}
									</Button>
								</div>
							</form>
						</Card>
					)}
				</div>
			</div>
		</DashboardShell>
	);
}
