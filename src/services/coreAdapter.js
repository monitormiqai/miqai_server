const core = require('core-qai');

let AnalisarQualidadeAmbiental = null;
let adaptPublicResponse = null;
let available = false;

try {
  if (typeof core === 'function') {
    AnalisarQualidadeAmbiental = core;
  } else if (core && typeof core.AnalisarQualidadeAmbiental === 'function') {
    AnalisarQualidadeAmbiental = core.AnalisarQualidadeAmbiental;
  }

  const publicResponse = require('core-qai/public-response');

  if (
    publicResponse &&
    typeof publicResponse.adaptPublicResponse === 'function'
  ) {
    adaptPublicResponse = publicResponse.adaptPublicResponse;
  }

  available =
    typeof AnalisarQualidadeAmbiental === 'function' &&
    typeof adaptPublicResponse === 'function';
} catch (err) {
  // CORE indisponível ou API incompatível.
  // O Server não cria inteligência local.
}

module.exports = {
  available,
  AnalisarQualidadeAmbiental,
  adaptPublicResponse,
};