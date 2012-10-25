var fs = require('fs')
module.exports = fs.readdirSync('.').map(function(name){
  if (name !== 'index.js') {
    return fs.readFileSync('./'+name, 'utf8');
  }
}).filter(Boolean);
