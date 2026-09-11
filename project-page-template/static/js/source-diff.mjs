function lines(text) {
  const result = text.split('\n');
  if (result.at(-1) === '') result.pop();
  return result;
}

export function diffLines(before, after) {
  const a = lines(before), b = lines(after);
  const width = b.length + 1;
  const lengths = new Uint32Array((a.length + 1) * width);
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      lengths[i * width + j] = a[i] === b[j] ? lengths[(i + 1) * width + j + 1] + 1
        : Math.max(lengths[(i + 1) * width + j], lengths[i * width + j + 1]);
    }
  }
  const rows = [];
  let i = 0, j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) {
      rows.push({ kind: 'equal', text: a[i], beforeLine: ++i, afterLine: ++j });
    } else if (i < a.length && (j === b.length || lengths[(i + 1) * width + j] >= lengths[i * width + j + 1])) {
      rows.push({ kind: 'remove', text: a[i], beforeLine: ++i, afterLine: null });
    } else {
      rows.push({ kind: 'add', text: b[j], beforeLine: null, afterLine: ++j });
    }
  }
  return rows;
}

export function diffHunks(rows, context = 3) {
  const ranges = [];
  rows.forEach((row, index) => {
    if (row.kind === 'equal') return;
    const start = Math.max(0, index - context), end = Math.min(rows.length, index + context + 1);
    const previous = ranges.at(-1);
    if (previous && start <= previous.end) previous.end = end;
    else ranges.push({ start, end });
  });
  return ranges.map(({ start, end }) => {
    const preceding = rows.slice(0, start);
    const hunk = rows.slice(start, end);
    const oldCount = hunk.filter((row) => row.beforeLine !== null).length;
    const newCount = hunk.filter((row) => row.afterLine !== null).length;
    const oldStart = preceding.filter((row) => row.beforeLine !== null).length + (oldCount ? 1 : 0);
    const newStart = preceding.filter((row) => row.afterLine !== null).length + (newCount ? 1 : 0);
    return { oldStart, oldCount, newStart, newCount, rows: hunk };
  });
}

export function diffSources(before, after) {
  const oldFiles = new Map(before.map((file) => [file.path, file.text]));
  const newFiles = new Map(after.map((file) => [file.path, file.text]));
  return [...new Set([...oldFiles.keys(), ...newFiles.keys()])].flatMap((path) => {
    const oldText = oldFiles.get(path) ?? '', newText = newFiles.get(path) ?? '';
    if (oldFiles.has(path) && newFiles.has(path) && oldText === newText) return [];
    const rows = diffLines(oldText, newText);
    return [{
      oldPath: oldFiles.has(path) ? path : null,
      newPath: newFiles.has(path) ? path : null,
      rows, hunks: diffHunks(rows),
      additions: rows.filter((row) => row.kind === 'add').length,
      deletions: rows.filter((row) => row.kind === 'remove').length,
      oldFinalNewline: oldText.endsWith('\n'), newFinalNewline: newText.endsWith('\n'),
    }];
  });
}
