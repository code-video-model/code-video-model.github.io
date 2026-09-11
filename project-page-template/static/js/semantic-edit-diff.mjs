import {expandedSemanticDiff} from './semantic-edit-patterns.mjs';
// A semantic projection of the exact selected source snapshots, not a literal
// repository diff. Every changed row retains source evidence for validation.
export function semanticEditDiff(before,after){
  return expandedSemanticDiff(before,after);
}
