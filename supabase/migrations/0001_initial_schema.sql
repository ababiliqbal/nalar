CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Tabel Profil Siswa
CREATE TABLE public.students (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identity_key_hash    TEXT NOT NULL UNIQUE, -- SHA-256(nisn || ':' || lower(trim(sekolah)))
  nama                 TEXT NOT NULL CHECK (char_length(trim(nama)) > 0),
  nisn                 CHAR(10) NOT NULL CHECK (nisn ~ '^[0-9]{10}$'),
  kelas                TEXT NOT NULL CHECK (char_length(trim(kelas)) > 0),
  sekolah              TEXT NOT NULL CHECK (char_length(trim(sekolah)) > 0),
  pin_hash             TEXT NOT NULL,        -- Format: salt:scryptHashHex
  consent_at           TIMESTAMPTZ NOT NULL,
  initial_level        TEXT CHECK (initial_level IN ('EXPLORER', 'BUILDER', 'ARCHITECT')),
  current_level        TEXT CHECK (current_level IN ('EXPLORER', 'BUILDER', 'ARCHITECT')),
  pretest_score        SMALLINT CHECK (pretest_score BETWEEN 0 AND 6),
  pretest_completed_at TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Tabel Rekaman Pretest (1x per siswa, anti-retake)
CREATE TABLE public.pretest_attempts (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id     UUID NOT NULL UNIQUE REFERENCES public.students(id) ON DELETE CASCADE,
  answers_json   JSONB NOT NULL,             -- Contoh: {"1":"A","2":"D",...,"6":"C"}
  score          SMALLINT NOT NULL CHECK (score BETWEEN 0 AND 6),
  assigned_level TEXT NOT NULL CHECK (assigned_level IN ('EXPLORER', 'BUILDER', 'ARCHITECT')),
  duration_sec   INTEGER NOT NULL CHECK (duration_sec >= 0),
  submitted_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Tabel Progres 5 Misi (Stage Gating & Metrik Fading Scaffolding)
CREATE TABLE public.mission_progress (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id            UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  mission_id            SMALLINT NOT NULL CHECK (mission_id BETWEEN 1 AND 5),
  status                TEXT NOT NULL DEFAULT 'locked' CHECK (status IN ('locked', 'active', 'completed')),
  current_stage         TEXT NOT NULL DEFAULT 'logic' CHECK (current_stage IN ('logic', 'analysis', 'evaluation', 'coding')),
  logic_passed          BOOLEAN NOT NULL DEFAULT FALSE,
  analysis_passed       BOOLEAN NOT NULL DEFAULT FALSE,
  evaluation_passed     BOOLEAN NOT NULL DEFAULT FALSE,
  coding_passed         BOOLEAN NOT NULL DEFAULT FALSE,
  reflection_text       TEXT,
  failed_eval_count     INTEGER NOT NULL DEFAULT 0,
  hint_count            INTEGER NOT NULL DEFAULT 0,
  chat_count            INTEGER NOT NULL DEFAULT 0,
  coding_attempts_count INTEGER NOT NULL DEFAULT 0,
  started_at            TIMESTAMPTZ,
  completed_at          TIMESTAMPTZ,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, mission_id)
);

-- 4. Tabel Auto-Save Draf Jawaban per Tahap (Pemulihan Listrik Padam)
CREATE TABLE public.stage_drafts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id   UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  mission_id   SMALLINT NOT NULL CHECK (mission_id BETWEEN 1 AND 5),
  stage        TEXT NOT NULL CHECK (stage IN ('logic', 'analysis', 'evaluation', 'coding')),
  content_text TEXT NOT NULL DEFAULT '',
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, mission_id, stage)
);

-- 5. Tabel Log Interaksi AI (Append-Only Dataset Riset)
CREATE TABLE public.ai_interaction_logs (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id             UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  mission_id             SMALLINT NOT NULL CHECK (mission_id BETWEEN 1 AND 5),
  stage                  TEXT NOT NULL CHECK (stage IN ('logic', 'analysis', 'evaluation', 'coding')),
  interaction_type       TEXT NOT NULL CHECK (interaction_type IN ('hint', 'chat', 'evaluate', 'coding_feedback')),
  prompt_level           TEXT NOT NULL CHECK (prompt_level IN ('EXPLORER', 'BUILDER', 'ARCHITECT')),
  input_text             TEXT NOT NULL,
  response_text          TEXT NOT NULL,
  structured_result_json JSONB,
  model_used             TEXT,
  key_alias              TEXT,
  source                 TEXT NOT NULL DEFAULT 'ai' CHECK (source IN ('ai', 'fallback')),
  latency_ms             INTEGER,
  is_passed              BOOLEAN,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Tabel Log Eksekusi Kode Python (Append-Only Dataset Riset)
CREATE TABLE public.code_execution_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id        UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  mission_id        SMALLINT NOT NULL CHECK (mission_id BETWEEN 1 AND 5),
  code_snapshot     TEXT NOT NULL,
  stdout            TEXT,
  stderr            TEXT,
  error_type        TEXT,        -- SyntaxError | IndentationError | TimeoutError | AssertionError | NULL
  passed_tests      SMALLINT NOT NULL DEFAULT 0,
  total_tests       SMALLINT NOT NULL DEFAULT 0,
  all_passed        BOOLEAN NOT NULL DEFAULT FALSE,
  execution_time_ms INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Tabel Shared Circuit Breaker untuk Gemini API Key Pool (Serverless State)
CREATE TABLE public.api_key_health (
  key_alias       TEXT PRIMARY KEY,
  cooldown_until  TIMESTAMPTZ NOT NULL DEFAULT to_timestamp(0),
  last_error_code SMALLINT,
  failure_count   INTEGER NOT NULL DEFAULT 0,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indeks Performa Query & Ekspor Riset
CREATE INDEX idx_mission_progress_student ON public.mission_progress (student_id, mission_id);
CREATE INDEX idx_ai_logs_student_mission  ON public.ai_interaction_logs (student_id, mission_id, stage, created_at DESC);
CREATE INDEX idx_code_logs_student_mission ON public.code_execution_logs (student_id, mission_id, created_at DESC);
CREATE INDEX idx_api_key_health_cooldown  ON public.api_key_health (cooldown_until);

-- Aktifkan RLS (Default-Deny bagi akses anon publik; akses hanya via Service Role di server)
ALTER TABLE public.students            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pretest_attempts    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mission_progress    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stage_drafts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_interaction_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.code_execution_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_key_health      ENABLE ROW LEVEL SECURITY;