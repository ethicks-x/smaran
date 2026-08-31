import {
  Patient,
  Caregiver,
  PatientCaregiver,
  MemorySubject,
  GameSession,
  QuestionEvent,
  CasualPlayLog,
} from "./types";

export const caregiver: Caregiver = {
  id: "cg-1",
  user_id: "user-cg-1",
  full_name: "Sarah Chen",
  avatar_url: "https://i.pravatar.cc/120?img=68",
};

export const patients: Patient[] = [
  {
    id: "pat-1",
    user_id: "user-1",
    full_name: "Ramesh Das",
    avatar_url: "https://i.pravatar.cc/240?img=51",
    dob: "1954-03-12",
    address: "Guwahati, Assam",
    contact_number: "+91 98765 43210",
    preferred_language: "as",
  },
  {
    id: "pat-2",
    user_id: "user-2",
    full_name: "Maya Devi",
    avatar_url: "https://i.pravatar.cc/240?img=47",
    dob: "1958-07-24",
    address: "Silchar, Assam",
    contact_number: "+91 98765 11223",
    preferred_language: "bn",
  },
  {
    id: "pat-3",
    user_id: "user-3",
    full_name: "Biren Sharma",
    avatar_url: "https://i.pravatar.cc/240?img=59",
    dob: "1950-01-05",
    address: "Imphal, Manipur",
    contact_number: "+91 98765 99887",
    preferred_language: "mni",
  },
];

export const patientCaregivers: PatientCaregiver[] = [
  { id: "pc-1", patient_id: "pat-1", caregiver_id: "cg-1", relationship: "son" },
  { id: "pc-2", patient_id: "pat-2", caregiver_id: "cg-1", relationship: "daughter" },
  { id: "pc-3", patient_id: "pat-3", caregiver_id: "cg-1", relationship: "ASHA worker" },
];

export const memorySubjects: MemorySubject[] = [
  {
    id: "ms-1",
    patient_id: "pat-1",
    kind: "person",
    name: "Priya",
    relationship: "daughter",
    photo_url: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=400&auto=format&fit=crop",
    is_active: true,
    created_by: "user-cg-1",
    created_at: "2025-07-01T10:00:00Z",
  },
  {
    id: "ms-2",
    patient_id: "pat-1",
    kind: "person",
    name: "Arjun",
    relationship: "grandson",
    photo_url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=400&auto=format&fit=crop",
    is_active: true,
    created_by: "user-cg-1",
    created_at: "2025-07-10T10:00:00Z",
  },
  {
    id: "ms-3",
    patient_id: "pat-1",
    kind: "place",
    name: "College Street, Kolkata",
    relationship: null,
    photo_url: "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?q=80&w=400&auto=format&fit=crop",
    is_active: true,
    created_by: "user-cg-1",
    created_at: "2025-07-15T10:00:00Z",
  },
  {
    id: "ms-4",
    patient_id: "pat-1",
    kind: "object",
    name: "His old radio",
    relationship: null,
    photo_url: "https://images.unsplash.com/photo-1495001258031-d1b407bc1776?q=80&w=400&auto=format&fit=crop",
    is_active: true,
    created_by: "user-cg-1",
    created_at: "2025-07-20T10:00:00Z",
  },
  {
    id: "ms-5",
    patient_id: "pat-2",
    kind: "person",
    name: "Anita",
    relationship: "daughter",
    photo_url: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?q=80&w=400&auto=format&fit=crop",
    is_active: true,
    created_by: "user-cg-1",
    created_at: "2025-07-05T10:00:00Z",
  },
];

export const gameSessions: GameSession[] = [
  {
    id: "gs-1",
    patient_id: "pat-1",
    started_at: "2025-08-29T09:00:00Z",
    ended_at: "2025-08-29T09:12:00Z",
    questions_planned: 10,
    questions_answered: 10,
  },
  {
    id: "gs-2",
    patient_id: "pat-1",
    started_at: "2025-08-30T09:30:00Z",
    ended_at: "2025-08-30T09:41:00Z",
    questions_planned: 10,
    questions_answered: 8,
  },
  {
    id: "gs-3",
    patient_id: "pat-2",
    started_at: "2025-08-30T08:15:00Z",
    ended_at: "2025-08-30T08:22:00Z",
    questions_planned: 8,
    questions_answered: 8,
  },
];

export const questionEvents: QuestionEvent[] = [
  {
    id: "qe-1",
    session_id: "gs-1",
    patient_id: "pat-1",
    subject_id: "ms-1",
    activity: "who_is_this",
    n_options: 3,
    is_correct: true,
    time_taken_ms: 4200,
    hints_used: 0,
    reason: "new",
    asked_at: "2025-08-29T09:01:00Z",
  },
  {
    id: "qe-2",
    session_id: "gs-1",
    patient_id: "pat-1",
    subject_id: "ms-3",
    activity: "where_is_this",
    n_options: 2,
    is_correct: false,
    time_taken_ms: 8100,
    hints_used: 1,
    reason: "new",
    asked_at: "2025-08-29T09:03:00Z",
  },
  {
    id: "qe-3",
    session_id: "gs-2",
    patient_id: "pat-1",
    subject_id: "ms-3",
    activity: "where_is_this",
    n_options: 2,
    is_correct: true,
    time_taken_ms: 5000,
    hints_used: 0,
    reason: "yesterday_miss",
    asked_at: "2025-08-30T09:31:00Z",
  },
  {
    id: "qe-4",
    session_id: "gs-3",
    patient_id: "pat-2",
    subject_id: "ms-5",
    activity: "who_is_this",
    n_options: 4,
    is_correct: true,
    time_taken_ms: 3600,
    hints_used: 0,
    reason: "repeat",
    asked_at: "2025-08-30T08:16:00Z",
  },
];

export const casualPlayLogs: CasualPlayLog[] = [
  { id: "cp-1", patient_id: "pat-1", game_key: "chess", played_at: "2025-08-29T17:00:00Z", duration_sec: 900 },
  { id: "cp-2", patient_id: "pat-1", game_key: "sudoku", played_at: "2025-08-30T18:00:00Z", duration_sec: 420 },
  { id: "cp-3", patient_id: "pat-2", game_key: "sudoku", played_at: "2025-08-30T16:30:00Z", duration_sec: 600 },
];

// --- Helper functions (these are the shape your DB queries will eventually replace) ---

export function getPatientsForCaregiver(caregiverId: string) {
  const links = patientCaregivers.filter((pc) => pc.caregiver_id === caregiverId);
  return links.map((link) => ({
    ...patients.find((p) => p.id === link.patient_id)!,
    relationship: link.relationship,
  }));
}

export function getPatient(id: string) {
  return patients.find((p) => p.id === id);
}

export function getMemorySubjects(patientId: string, kind?: MemorySubject["kind"]) {
  return memorySubjects.filter(
    (m) => m.patient_id === patientId && m.is_active && (!kind || m.kind === kind)
  );
}

export function getSessionsForPatient(patientId: string) {
  return gameSessions.filter((s) => s.patient_id === patientId);
}

export function getQuestionEventsForSession(sessionId: string) {
  return questionEvents.filter((q) => q.session_id === sessionId);
}

export function getQuestionEventsForPatient(patientId: string) {
  return questionEvents.filter((q) => q.patient_id === patientId);
}

export function getCasualPlayForPatient(patientId: string) {
  return casualPlayLogs.filter((c) => c.patient_id === patientId);
}

// Derived stats
export function getPatientAccuracy(patientId: string) {
  const events = getQuestionEventsForPatient(patientId).filter((e) => e.is_correct !== null);
  if (events.length === 0) return 0;
  const correct = events.filter((e) => e.is_correct).length;
  return Math.round((correct / events.length) * 100);
}

export const notifications = [
  {
    id: "n1",
    type: "activity" as const,
    title: "Ramesh completed a session",
    description: "8/10 answered, 75% accuracy.",
    time: "10 minutes ago",
    read: false,
  },
  {
    id: "n2",
    type: "memory" as const,
    title: "New memory subject added for Maya",
    description: "\u201cAnita, daughter\u201d added.",
    time: "1 hour ago",
    read: false,
  },
  {
    id: "n3",
    type: "alert" as const,
    title: "Biren has been inactive",
    description: "No sessions recorded in 2 days.",
    time: "3 hours ago",
    read: false,
  },
];

export function getSessionSummaries(patientId: string) {
  return getSessionsForPatient(patientId).map((session) => {
    const events = getQuestionEventsForSession(session.id);
    const answered = events.filter((e) => e.is_correct !== null);
    const correct = answered.filter((e) => e.is_correct).length;
    const accuracy = answered.length ? Math.round((correct / answered.length) * 100) : 0;
    const avgTimeMs = answered.length
      ? Math.round(answered.reduce((sum, e) => sum + e.time_taken_ms, 0) / answered.length)
      : 0;
    return {
      id: session.id,
      date: session.started_at.slice(0, 10),
      questionsAnswered: session.questions_answered,
      questionsPlanned: session.questions_planned,
      accuracy,
      avgTimeMs,
    };
  });
}

export function getActivityBreakdown(patientId: string) {
  const events = getQuestionEventsForPatient(patientId).filter((e) => e.is_correct !== null);
  const activities: QuestionEvent["activity"][] = ["who_is_this", "what_is_this", "where_is_this"];
  return activities
    .map((activity) => {
      const subset = events.filter((e) => e.activity === activity);
      if (subset.length === 0) return null;
      const correct = subset.filter((e) => e.is_correct).length;
      return {
        activity,
        label:
          activity === "who_is_this" ? "Who is this?" : activity === "what_is_this" ? "What is this?" : "Where is this?",
        accuracy: Math.round((correct / subset.length) * 100),
        count: subset.length,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
}