import { describe, it, expect } from "vitest";
import { scheduleTasks, CycleError } from "./index";
import type { TaskDTO, DependencyDTO } from "@flow/shared";

const t = (id: string, start: string, dur: number): TaskDTO => ({
  id,
  projectId: "p1",
  name: id,
  startDate: start,
  durationDays: dur,
  progress: 0,
});

describe("scheduleTasks", () => {
  it("FS: B starts at A end", () => {
    const tasks = [t("A", "2026-03-05T00:00:00.000Z", 3), t("B", "2026-03-05T00:00:00.000Z", 2)];
    const deps: DependencyDTO[] = [
      { id: "d1", projectId: "p1", fromTaskId: "A", toTaskId: "B", type: "FS", lagDays: 0 },
    ];

    const res = scheduleTasks(tasks, deps);
    const A = res.find(x => x.id === "A")!;
    const B = res.find(x => x.id === "B")!;
    expect(A.endDate).toBe("2026-03-08T00:00:00.000Z");
    expect(B.startDate).toBe("2026-03-08T00:00:00.000Z");
  });

  it("FS + lag: B starts at A end + lag", () => {
    const tasks = [t("A", "2026-03-05T00:00:00.000Z", 1), t("B", "2026-03-05T00:00:00.000Z", 1)];
    const deps: DependencyDTO[] = [
      { id: "d1", projectId: "p1", fromTaskId: "A", toTaskId: "B", type: "FS", lagDays: 2 },
    ];

    const res = scheduleTasks(tasks, deps);
    const B = res.find(x => x.id === "B")!;
    expect(B.startDate).toBe("2026-03-08T00:00:00.000Z"); // A end 06 + 2 jours => 08 (selon addDays)
  });

  it("Cascade: A -> B -> C", () => {
    const tasks = [
      t("A", "2026-03-05T00:00:00.000Z", 2),
      t("B", "2026-03-05T00:00:00.000Z", 2),
      t("C", "2026-03-05T00:00:00.000Z", 1),
    ];
    const deps: DependencyDTO[] = [
      { id: "d1", projectId: "p1", fromTaskId: "A", toTaskId: "B", type: "FS", lagDays: 0 },
      { id: "d2", projectId: "p1", fromTaskId: "B", toTaskId: "C", type: "FS", lagDays: 0 },
    ];

    const res = scheduleTasks(tasks, deps);
    expect(res.find(x => x.id === "B")!.startDate).toBe("2026-03-07T00:00:00.000Z");
    expect(res.find(x => x.id === "C")!.startDate).toBe("2026-03-09T00:00:00.000Z");
  });

  it("Cycle throws CycleError", () => {
    const tasks = [t("A", "2026-03-05T00:00:00.000Z", 1), t("B", "2026-03-05T00:00:00.000Z", 1)];
    const deps: DependencyDTO[] = [
      { id: "d1", projectId: "p1", fromTaskId: "A", toTaskId: "B", type: "FS", lagDays: 0 },
      { id: "d2", projectId: "p1", fromTaskId: "B", toTaskId: "A", type: "FS", lagDays: 0 },
    ];
    expect(() => scheduleTasks(tasks, deps)).toThrow(CycleError);
  });

  it("skips weekends when computing endDate", () => {
    const tasks = [
      t("A", "2026-03-06T00:00:00.000Z", 1), // vendredi
    ];

    const res = scheduleTasks(tasks, [], { skipWeekends: true });
    expect(res[0].endDate).toBe("2026-03-09T00:00:00.000Z");
  });
});
