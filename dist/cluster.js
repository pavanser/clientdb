import orderBy from 'lodash/orderBy';
import cloneDeep from 'lodash/cloneDeep';

class Cluster {
  constructor(data) {
    this.data = cloneDeep(data);
    this.start_index = 0;
  }

  sort(fields, directions) {
    this.data = orderBy(this.data, fields, directions);
    return this;
  }

  offset(offset) {
    this.start_index = offset - 1;
    return this;
  }

  limit(count_elements) {
    this.data = this.data.slice(this.start_index, count_elements);
    return this;
  }

  exec() {
    return this.data;
  }

}

export default Cluster;