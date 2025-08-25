import LeConnectionsLooker from '../lookers/LeConnectionLooker'
import HoopGridsLooker from '../lookers/HoopGridsLooker';
import Looker from '../lookers/lookerBase';
import LeConnectionsHOFLooker from '../lookers/LeConnectionsHOFLooker';
class GrabberService {
  private lookers: { [key: string]: Looker } = {
    "leconnections": new LeConnectionsLooker(),
    "hoopgrids": new HoopGridsLooker(),
    "leconnectionshof": new LeConnectionsHOFLooker()
  };
  
  async getByName(name: string) {
    const cls = this.lookers[name];
    if (!cls) {
      throw new Error(`No looker registered for name "${name}"`);
    }
    return await cls.getSolution();
  }
}
  
  export default GrabberService;
  