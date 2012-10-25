var Realm = require('./engine/runtime').Realm;

module.exports = continuum;

function continuum(listener){
  return new Realm(listener);
}

continuum.debug = require('./engine/debug');
continuum.Realm = Realm;
