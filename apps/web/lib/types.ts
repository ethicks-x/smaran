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
