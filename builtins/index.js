var fs = require('fs')
module.exports = fs.readdirSync(__dirname).map(function(name){
  if (name !== 'index.js') {
    return fs.readFileSync(__dirname+'/'+name, 'utf8');
  }
}).filter(Boolean);
