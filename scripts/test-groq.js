#!/usr/bin/env node

/**
 * Verifies that GROQ_API_KEY is accepted by Groq and can run a chat completion.
 *
 * Usage:
 *   node scripts/test-groq.js
 *   node scripts/test-groq.js --model llama-3.1-8b-instant
 */
require('dotenv').config();

const API_BASE_URL = 'https://api.groq.com/openai/v1';
const requestedModel = process.argv.includes('--model')
  ? process.argv[process.argv.indexOf('--model') + 1]
  : undefined;

const preferredModels = [
  'llama-3.1-8b-instant',
  'llama-3.3-70b-versatile',
  'openai/gpt-oss-20b',
];

async function groqFetch(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${body.error?.message || JSON.stringify(body)}`);
  }
  return body;
}

async function main() {
  if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is not set. Add it to .env or export it before running this script.');
  }
  if (process.argv.includes('--model') && !requestedModel) {
    throw new Error('Provide a model ID after --model.');
  }

  console.log('Checking GROQ_API_KEY by listing available models...');
  const modelsResponse = await groqFetch('/models');
  const models = modelsResponse.data || [];
  const modelIds = models.map((model) => model.id);
  console.log(`Authentication succeeded. ${modelIds.length} model(s) available.`);

  const model = requestedModel || preferredModels.find((id) => modelIds.includes(id)) || modelIds[0];
  if (!model) {
    throw new Error('Groq returned no available models for this API key.');
  }
  if (requestedModel && !modelIds.includes(model)) {
    throw new Error(`The requested model "${model}" is not available to this API key.`);
  }

  console.log(`Calling model: ${model}`);
  const completion = await groqFetch('/chat/completions', {
    method: 'POST',
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: 'Reply with exactly: Groq connection successful' }],
      temperature: 0,
      max_tokens: 20,
    }),
  });

  const reply = completion.choices?.[0]?.message?.content?.trim();
  if (!reply) {
    throw new Error('The model request succeeded but did not include a text response.');
  }

  console.log('Model response:', reply);
  console.log('Success: the API key is valid and chat completions are working.');
}

main().catch((error) => {
  console.error('Groq test failed:', error.message);
  process.exitCode = 1;
});
