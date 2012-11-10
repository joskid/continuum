var fs = require('fs');
exports['$utility.js'] = null;

fs.readdirSync(__dirname).forEach(function(name){
  if (name !== 'index.js') {
    exports[name.slice(0, -3)] = fs.readFileSync(__dirname+'/'+name, 'utf8');
  }
});
