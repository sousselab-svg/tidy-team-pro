DROP INDEX IF EXISTS public.sms_messages_job_kind_uniq;
CREATE UNIQUE INDEX sms_messages_job_kind_uniq
  ON public.sms_messages (job_id, kind);