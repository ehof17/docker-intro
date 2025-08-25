type Entry<T> = { value: T; expiresAt: number };

export class TTLCache<K, V> {
  private m = new Map<K, Entry<V>>();
  constructor(private ttlMs: number) {}

  get(k: K) {
    const e = this.m.get(k);
    if (!e) return;
    if (Date.now() > e.expiresAt) { this.m.delete(k); return; }
    return e.value;
  }
  set(k: K, v: V) {
    this.m.set(k, { value: v, expiresAt: Date.now() + this.ttlMs });
  }
  
}