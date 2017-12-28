const got = require('got');

let urls = new Map();

let myPlugin = {
  resolveId(id) {
    if(/https/.test(id)) {
      let idx = id.lastIndexOf('/');
      let pth = id.substr(idx + 1);
      let newId = pth.split('.').shift();
      urls.set(newId, id);
      return newId;
    }
  },
  load(id) {
    if(urls.has(id)) {
      return got(urls.get(id)).then(function(resp){
        return resp.body;
      });
    }
  }
}

export default {
  plugins: [myPlugin]
}
