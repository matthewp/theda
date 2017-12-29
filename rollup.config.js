const got = require('got');

function http() {
  let urls = new Map();

  return {
    resolveId(id) {
      if(/^https?:\/\//.test(id)) {
        let idx = id.lastIndexOf('/');
        let pth = id.substr(idx + 1);
        let newId = pth.split('.').shift();
        urls.set(newId, id);
        return newId;
      }
    },
    load(id) {
      if(urls.has(id)) {
        let url = urls.get(id);
        return got(url).then(r => r.body);
      }
    }
  };
}

export default {
  plugins: [http()]
}
