import _chunk from 'lodash/chunk';
import _pick from 'lodash/pick';
import orderBy from 'lodash/orderBy';
import cloneDeep from 'lodash/cloneDeep';

class Cluster {
  #all_data;

  constructor(data) {
    this.#all_data = cloneDeep(data);
    this.pages = [];
    this.current_page = 0;
    this.data = cloneDeep(data);
  }

  /**
   * Sort elements by one field or array of fields, and show by required direction
   * Note: directions also could be set as array of directions
   * */
  sort(fields, directions){
    this.data = orderBy(this.#all_data, fields, directions);

    return this;
  }

  /**
   * Hide first {offset} elements
   * */
  offset(offset) {
    this.data = this.#all_data.slice(offset);

    return this;
  }

  /**
   * Change active page
   * */
  page(page) {

    this.current_page = page;
    this.data = this.pages.length ? this.pages[this.current_page] : this.data;

    const fields = ['data', 'exec', 'current_page', 'pages'];

    if (!this.pages.length) {
      fields.push('sort', 'offset', 'limit');
    }

    return this;
  }

  /**
   * Set limit docs on the page and returns new array of pages
   * */
  limit(elements_on_page){
    this.pages = _chunk(this.#all_data, elements_on_page);
    this.data = this.pages[this.current_page];

    return this;
  }

  /**
   * Current data ill be returned
   * */
  exec(){
    return this.data;
  }
}

export default Cluster;
