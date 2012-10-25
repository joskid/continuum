var Continuum = require('./engine/runtime').Continuum;

module.exports = continuum;

function continuum(listener){
  return new Continuum(listener);
}

continuum.debug = require('./engine/debug');
continuum.Continuum = Continuum;

