import { apiRequest } from './apiClient';
import { getPlanningContext, type PlanningContext } from './planningContext';

// Budget and packing use the same trip-scoped cache and serialized write path.
// Dirty records survive reloads and are retried before fetching server state.
export function createTripStore<T>(namespace: string, route: string, field: string, defaults: (context: PlanningContext) => T) {
  let pending = Promise.resolve();
  const keyFor = (id: string) => `${namespace}:${id}`;
  const dirtyFor = (id: string) => `${keyFor(id)}:dirty`;

  function read(context = getPlanningContext()): T {
    try {
      const raw = localStorage.getItem(keyFor(context.id));
      if (raw) return JSON.parse(raw);
    } catch { /* Fall back to a fresh trip record. */ }
    return defaults(context);
  }

  function save(state: T, sync = true, context = getPlanningContext()): void {
    localStorage.setItem(keyFor(context.id), JSON.stringify(state));
    if (!sync) return;
    localStorage.setItem(dirtyFor(context.id), 'true');
    pending = pending.then(async () => {
      const result = await apiRequest(`${route}/${encodeURIComponent(context.id)}`, {
        method: 'PUT', body: JSON.stringify({ ...state, id: context.id, tripId: context.id }),
      });
      // A newer save may have arrived while this request was running.
      if (result.ok && localStorage.getItem(keyFor(context.id)) === JSON.stringify(state)) {
        localStorage.removeItem(dirtyFor(context.id));
      }
    }).catch(error => console.warn(`Could not sync ${namespace}`, error));
  }

  async function load(): Promise<T> {
    const context = getPlanningContext();
    await pending;
    if (localStorage.getItem(dirtyFor(context.id))) {
      save(read(context), true, context);
      await pending;
      if (localStorage.getItem(dirtyFor(context.id))) return read(context);
    }
    const result = await apiRequest<Record<string, T>>(`${route}/${encodeURIComponent(context.id)}?destination=${encodeURIComponent(context.destination)}`);
    if (result.ok && result.data?.[field]) {
      save(result.data[field], false, context);
      return result.data[field];
    }
    return read(context);
  }

  return { read, save, load, flush: () => pending };
}
