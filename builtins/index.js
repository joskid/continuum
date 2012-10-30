var fs = require('fs');
exports['_utility.js'] = null;

fs.readdirSync(__dirname).forEach(function(name){
  if (name !== 'index.js') {
    exports[name] = fs.readFileSync(__dirname+'/'+name, 'utf8');
  }
});
