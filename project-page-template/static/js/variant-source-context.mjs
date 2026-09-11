// Excerpts retain original text and line numbers; they are context, not modified lines.
export function variantSourceContext(before, after, changes) {
  if (!before.variant || !after.variant || before.variant === after.variant || !changes.length) return [];
  const adapters = new Set([...before.files, ...after.files].filter(file => file.generatedAdapter).map(file => file.path));
  if (!changes.every(file => adapters.has(file.oldPath) && adapters.has(file.newPath))) return [];
  return before.files.flatMap(file => {
    const counterpart = after.files.find(entry => entry.path === file.path);
    if (file.generatedAdapter || !counterpart || file.text !== counterpart.text) return [];
    const definition = file.functions.find(entry => entry.name === 'setVariant');
    const lines = file.text.split('\n');
    const start = definition ? definition.line - 1 : lines.findIndex(line => /^\s*setVariant\s*\(/.test(line));
    if (start < 0) return [];
    const indent = lines[start].match(/^\s*/)[0];
    const end = /}\s*[,;]?\s*$/.test(lines[start]) ? start
      : lines.findIndex((line, index) => index > start && line.startsWith(indent)
        && /^}\s*[,;]?\s*$/.test(line.slice(indent.length)));
    if (end < 0) return [];
    const body = lines.slice(start, end + 1).join('\n');
    const identifiers = new Set(body.match(/[A-Za-z_$][\w$]*/g));
    const selected = new Set();
    function include(first, last) {
      for (let index = Math.max(0, first); index <= Math.min(lines.length - 1, last); index++) selected.add(index);
    }
    include(start, end);
    // Shared methods may delegate the actual mesh/path switch to the seek routine.
    const selectedState = body.match(/\b([A-Za-z_$][\w$]*)\s*=\s*(?:id|next)\s*;/)?.[1];
    if (selectedState) {
      lines.forEach((line, index) => {
        if (line.includes(`[${selectedState}]`) || (line.includes('.visible') && line.includes(selectedState))) {
          include(index, index);
          for (const name of line.match(/[A-Za-z_$][\w$]*/g) || []) identifiers.add(name);
        }
      });
    }
    lines.forEach((line, index) => {
      const declaration = line.match(/^(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/);
      if (declaration && identifiers.has(declaration[1])) {
        // Include the declaration itself, not the unrelated statements that follow it.
        let last = index;
        while (last < lines.length - 1 && last - index < 32 && !/;\s*(?:\/\/.*)?$/.test(lines[last])) last++;
        include(index, last);
      }
    });
    return [{
      path: file.path,
      lines: [...selected].sort((a, b) => a - b).map(index => ({ number: index + 1, text: lines[index] })),
    }];
  });
}
