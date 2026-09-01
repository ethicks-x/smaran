export type MemoryKind = "person" | "place" | "object";
export type ActivityType = "who_is_this" | "what_is_this" | "where_is_this";
export type QuestionReason = "new" | "repeat" | "yesterday_miss";

export interface Patient {
	id: string;
	user_id: string;
	full_name: string;
	avatar_url: string | null;
	dob: string;
	address: string;
	contact_number: string;
	preferred_language: "as" | "bn" | "ne" | "mni";
}

export interface Caregiver {
	id: string;
	user_id: string;
	full_name: string;
	avatar_url: string | null;
}

export interface PatientCaregiver {
	id: string;
	patient_id: string;
	caregiver_id: string;
	relationship: string; // "son", "wife", "ASHA worker", etc.
}

export interface MemorySubject {
	id: string;
	patient_id: string;
	kind: MemoryKind;
	name: string;
	relationship: string | null; // only meaningful when kind === "person"
	photo_url: string | null;
	is_active: boolean;
	created_by: string;
	created_at: string;
}

export interface GameSession {
	id: string;
	patient_id: string;
	started_at: string;
	ended_at: string | null;
	questions_planned: number;
	questions_answered: number;
}

export interface QuestionEvent {
	id: string;
	session_id: string;
	patient_id: string;
	subject_id: string;
	activity: ActivityType;
	n_options: number; // 2-4, difficulty
	is_correct: boolean | null; // null = skipped
	time_taken_ms: number;
	hints_used: number;
	reason: QuestionReason;
	asked_at: string;
}

export interface CasualPlayLog {
	id: string;
	patient_id: string;
	game_key: string; // "chess", "sudoku"
	played_at: string;
	duration_sec: number;
}

export interface PatientProfileApi {
	id: string;
	dob: string | null;
	address: string | null;
	contact_number: string | null;
	preferred_language: string | null;
}

export interface UserProfileApi {
	user_id: string;
	roles: string[];
	is_caregiver: boolean;
	patient: PatientProfileApi | null;
	smaran_id: number | null;
}

export interface PatientCardApi {
	id: string;
	user_id: string | null;
	full_name: string;
	avatar_url: string | null;
	dob: string | null;
	address: string | null;
	contact_number: string | null;
	preferred_language: string | null;
	relationship: string | null;
	sessions_count: number;
	overall_accuracy: number;
	last_active_at: string | null;
}

export interface PatientDetailApi extends PatientCardApi {
	memory_subjects_count: number;
}

export interface DashboardSummaryApi {
	total_patients: number;
	activities_today: number;
	total_memory_subjects: number;
	needs_attention: number;
	patients: PatientCardApi[];
}

export type CareLinkStatus = "none" | "pending" | "active" | "revoked";

export interface CareRequestApi {
	id: string;
	patient_id: string;
	status: CareLinkStatus;
	patient_name?: string | null;
	patient_avatar_url?: string | null;
	patient_email?: string | null;
	patient_phone?: string | null;
}

export interface MemorySubjectApi {
	id: string;
	patient_id: string;
	kind: string;
	name: string | null;
	relation: string | null;
	photo_url: string | null;
	is_active: boolean;
	created_by: string | null;
	created_at: string;
}

/** A stored memory: one object in the S3 bucket, plus what the caregiver said about it. */
export interface MemoryAssetApi {
	id: string;
	patient_id: string;
	subject_id: string | null;
	kind: string; // "photo" | "audio" | "story"
	file_name: string | null; // the caregiver's own name for the picture
	description: string | null;
	content_type: string | null;
	size_bytes: number | null;
	status: string; // "pending" | "ready" | "failed"
	created_at: string;
	/** Signed and short-lived unless the bucket is public — never store this anywhere. */
	view_url: string | null;
}

/** Where to PUT the file. The browser uploads to `upload_url` directly, not via the API. */
export interface MemoryUploadTicketApi {
	asset_id: string;
	upload_url: string;
	object_key: string;
	/** Must be sent back as the PUT's Content-Type: it is part of what the URL is signed over. */
	content_type: string;
	expires_in: number;
}

export interface SessionSummaryApi {
	id: string;
	date: string;
	questions_planned: number | null;
	questions_answered: number | null;
	accuracy: number;
	avg_time_ms: number;
	started_at: string;
	ended_at: string | null;
}

export interface ActivityBreakdownApi {
	activity: string;
	label: string;
	accuracy: number;
	count: number;
}

export interface PatientProgressApi {
	patient_id: string;
	total_sessions: number;
	overall_accuracy: number;
	sessions: SessionSummaryApi[];
	activity_breakdown: ActivityBreakdownApi[];
}

export interface CasualPlayApi {
	id: string;
	patient_id: string;
	game_key: string;
	played_at: string;
	duration_sec: number | null;
}

export interface QuestionEventApi {
	id: string;
	session_id: string;
	patient_id: string;
	patient_name: string | null;
	patient_avatar_url: string | null;
	subject_id: string | null;
	subject_name: string | null;
	activity: string;
	activity_label: string;
	n_options: number | null;
	is_correct: boolean | null;
	time_taken_ms: number | null;
	hints_used: number;
	reason: string | null;
	asked_at: string;
}

export interface ActivityFeedApi {
	events: QuestionEventApi[];
	total: number;
}

export type ReminderKind =
	| "medicine"
	| "hydration"
	| "activity"
	| "appointment";

export interface ReminderApi {
	id: string;
	patient_id: string;
	kind: ReminderKind;
	title: string;
	detail: string | null;
	schedule: string; // "HH:MM|1111111" format
	active: boolean;
	created_by: string | null;
	created_at: string;
	updated_at: string;
}

export interface ReminderCreateInput {
	kind: ReminderKind;
	title: string;
	detail?: string | null;
	schedule: string; // "HH:MM|1111111" format
	active?: boolean;
}

export interface ReminderUpdateInput {
	kind?: ReminderKind;
	title?: string;
	detail?: string | null;
	schedule?: string;
	active?: boolean;
}
