var Continuum = require('./lib/runtime').Continuum;

module.exports = continuum;

function continuum(listener){
  return new Continuum(listener);
}

continuum.debug = require('./lib/debug');
continuum.Continuum = Continuum;

