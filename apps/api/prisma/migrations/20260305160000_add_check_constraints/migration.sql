ALTER TABLE "Dependency"
ADD CONSTRAINT "Dependency_no_self_reference_chk"
CHECK ("fromTaskId" <> "toTaskId");

ALTER TABLE "Task"
ADD CONSTRAINT "Task_progress_range_chk"
CHECK ("progress" >= 0 AND "progress" <= 100);
