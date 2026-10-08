const path = require('node:path');
const { pathToFileURL } = require('node:url');

let AnalisarQualidadeAmbiental = null;
let adaptPublicResponse = null;
let available = false;
let loadError = null;

function resolveCoreBase() {
  const configured = process.env.MIQAI_CORE_PATH;
  if (configured) {
    return path.resolve(configured);
  }
  return null;
}

async function loadCore() {
  try {
    const configuredBase = resolveCoreBase();

    let core;
    let publicResponse;

    if (configuredBase) {
      core = await import(pathToFileURL(path.join(configuredBase, 'src/engine/analysis.js')).href);
      publicResponse = await import(pathToFileURL(path.join(configuredBase, 'src/engine/publicResponse/adapter.js')).href);
    } else {
      core = await import('core-qai');
      publicResponse = await import('core-qai/public-response');
    }

    AnalisarQualidadeAmbiental =
      typeof core?.AnalisarQualidadeAmbiental === 'function'
        ? core.AnalisarQualidadeAmbiental
        : typeof core?.default === 'function'
          ? core.default
          : null;

    adaptPublicResponse =
      typeof publicResponse?.adaptPublicResponse === 'function'
        ? publicResponse.adaptPublicResponse
        : typeof publicResponse?.default === 'function'
          ? publicResponse.default
          : null;

    available =
      typeof AnalisarQualidadeAmbiental === 'function' &&
      typeof adaptPublicResponse === 'function';

    if (!available) {
      throw new Error('CORE public API is incompatible');
    }
  } catch (err) {
    loadError = err;
    available = false;
  }

  return module.exports;
}

const ready = loadCore();

module.exports = {
  get available() {
    return available;
  },
  get loadError() {
    return loadError;
  },
  get AnalisarQualidadeAmbiental() {
    return AnalisarQualidadeAmbiental;
  },
  get adaptPublicResponse() {
    return adaptPublicResponse;
  },
  ready,
};
