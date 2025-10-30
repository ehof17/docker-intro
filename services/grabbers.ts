import LeConnectionsLooker from '../lookers/LeConnectionLooker'
import HoopGridsLooker from '../lookers/HoopGridsLooker';
import Looker from '../lookers/lookerBase';
import LeConnectionsHOFLooker from '../lookers/LeConnectionsHOFLooker';
import { TTLCache } from '../utils/cache';
import { solutionResult } from '../utils/types';
class GrabberService {
  private lookers: Record<string, Looker> = {
    leconnections: new LeConnectionsLooker(),
    hoopgrids: new HoopGridsLooker(),
    leconnectionshof: new LeConnectionsHOFLooker(),
  };
  private cache = new TTLCache<string, solutionResult[]>(10 * 60 * 1000); // 10 min
  private inflight = new Map<string, Promise<solutionResult[]>>();

  async getByName(name: string, id?: string) {
    const key = name.toLowerCase();
    const cached = this.cache.get(key);
    if (cached) return cached;

    const existing = this.inflight.get(key);
    if (existing) return existing;

    const looker = this.lookers[key];
    if (!looker) throw new Error(`No looker registered for "${name}"`);

    if (!id){
      const p = looker.getSolution()
      .then(res => { this.cache.set(key, res); this.inflight.delete(key); return res; })
      .catch(err => { this.inflight.delete(key); throw err; });

      this.inflight.set(key, p);
      return p;
    }
    else{
      const p = looker.getSolutionAtGameId(id)
      .then(res => { this.cache.set(key, res); this.inflight.delete(key); return res; })
      .catch(err => { this.inflight.delete(key); throw err; });

      this.inflight.set(key, p);
      return p;
    }
  }
}
  
  export default GrabberService;
  