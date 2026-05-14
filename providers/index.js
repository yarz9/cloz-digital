// providers/index.js — Cerebras is the sole AI provider

import { CerebrasProvider } from './cerebras.js';
import { listModelConfig, listTaskRouting } from './models.js';

const cerebras = new CerebrasProvider();

export function getProvider(name) {
  if (name !== 'cerebras') {
    throw new Error(`Unknown provider: ${name}. Only "cerebras" is available.`);
  }
  return cerebras;
}

export function getActiveProvider() {
  return cerebras;
}

export function listProviders() {
  return [
    {
      key: 'cerebras',
      name: cerebras.name,
      hasKey: cerebras.hasApiKey(),
      keySource: cerebras.getKeySource(),
      maskedKey: cerebras.getMaskedKey(),
      models: cerebras.getModels(),
      modelConfig: listModelConfig(),
      taskRouting: listTaskRouting(),
    },
  ];
}
