import type { TaskDTO, DependencyDTO, ID } from "@flow/shared";

// helpers date (MVP: 1 day = 24h, sans calendrier)
const addDays = (iso: string, days: number) => {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString();
};

const maxDate = (a: string, b: string) => (new Date(a) > new Date(b) ? a : b);

export class CycleError extends Error {
  constructor(message = "Cycle detected in dependencies") {
    super(message);
    this.name = "CycleError";
  }
}

/**
 * Recalcule endDate et décale les tâches selon dépendances FS.
 * - FS: to.start >= from.end + lagDays
 * - lance erreur si cycle
 */
export function scheduleTasks(tasks: TaskDTO[], deps: DependencyDTO[]): TaskDTO[] {
  const taskById = new Map<ID, TaskDTO>();
  tasks.forEach(t => taskById.set(t.id, { ...t }));

  // adjacency + inDegree pour topo sort
  const adj = new Map<ID, ID[]>();
  const inDeg = new Map<ID, number>();
  tasks.forEach(t => {
    adj.set(t.id, []);
    inDeg.set(t.id, 0);
  });

  for (const dep of deps) {
    if (!taskById.has(dep.fromTaskId) || !taskById.has(dep.toTaskId)) continue;
    adj.get(dep.fromTaskId)!.push(dep.toTaskId);
    inDeg.set(dep.toTaskId, (inDeg.get(dep.toTaskId) || 0) + 1);
  }

  // topo order
  const q: ID[] = [];
  for (const [id, deg] of inDeg.entries()) if (deg === 0) q.push(id);

  const order: ID[] = [];
  while (q.length) {
    const id = q.shift()!;
    order.push(id);
    for (const next of adj.get(id) || []) {
      inDeg.set(next, (inDeg.get(next) || 0) - 1);
      if (inDeg.get(next) === 0) q.push(next);
    }
  }
  if (order.length !== tasks.length) throw new CycleError();

  // calc endDate baseline
  for (const id of order) {
    const t = taskById.get(id)!;
    t.endDate = addDays(t.startDate, Math.max(1, t.durationDays));
    taskById.set(id, t);
  }

  // apply constraints FS (simple pass in topo order)
  // pour chaque tâche, on prend la contrainte max de ses prédécesseurs
  for (const id of order) {
    const current = taskById.get(id)!;

    const incoming = deps.filter(d => d.toTaskId === id);
    let minStart = current.startDate;

    for (const dep of incoming) {
      const from = taskById.get(dep.fromTaskId);
      if (!from?.endDate) continue;
      const required = addDays(from.endDate, dep.lagDays || 0);
      minStart = maxDate(minStart, required);
    }

    if (minStart !== current.startDate) {
      current.startDate = minStart;
      current.endDate = addDays(current.startDate, Math.max(1, current.durationDays));
      taskById.set(id, current);
    }
  }

  return Array.from(taskById.values());
}
