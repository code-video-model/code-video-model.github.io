export function editVariantLabels(displayName, originalCase, editedCase) {
  if (!displayName || !originalCase || !editedCase) return {};
  return {
    [String(originalCase)]: `${displayName}_A`,
    [String(editedCase)]: `${displayName}_B`,
  };
}

export function normalizeDisplayIdentifiers(text, labels = {}) {
  let normalized = String(text);
  for (const [identifier, label] of Object.entries(labels).sort((a, b) => b[0].length - a[0].length)) {
    normalized = normalized.replace(
      new RegExp(`\\b${identifier.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}\\b`, 'g'),
      label,
    );
  }
  return normalized;
}
