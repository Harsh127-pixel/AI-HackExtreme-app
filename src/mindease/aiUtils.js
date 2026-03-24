/**
 * Robust AI model interaction helper.
 * Handles diverse local AI driver interfaces by probing for multiple method names.
 */
export function getAIAction(model, actionNames = ['generateText', 'generate', 'predict', 'chat', 'transcribe', 'synthesize', 'speak']) {
  if (!model) return null;
  
  // 1. Look for known method names
  for (const name of actionNames) {
    const fn = model[name];
    if (typeof fn === 'function') return fn.bind(model);
  }
  
  // 2. Fallback: Check if the model itself is a function (common for some drivers)
  if (typeof model === 'function') return model;
  
  // 3. Last resort: Check for .model property (some wrappers)
  if (model.model && typeof model.model === 'function') return model.model.bind(model.model);
  
  return null;
}
