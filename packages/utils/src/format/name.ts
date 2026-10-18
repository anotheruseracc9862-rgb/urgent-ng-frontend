/** Lower case, no accents, letters only: "O'Brien-Adé" gives ["obrien", "ade"]. */
function nameWords(value: string): string[] {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z]+/g, ' ')
    .split(' ')
    .filter((word) => word.length > 0);
}

function withinOneEdit(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i += 1;
      j += 1;
      continue;
    }
    edits += 1;
    if (edits > 1) return false;
    if (a.length > b.length) i += 1;
    else if (a.length < b.length) j += 1;
    else {
      i += 1;
      j += 1;
    }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

const sameWord = (a: string, b: string) => a === b || (a.length >= 5 && b.length >= 5 && withinOneEdit(a, b));

/**
 * True when two full names are the same person's name: the shorter name has at least two words
 * and every one of them is a word of the longer name, in any order or case. Mirrors the check the
 * server makes, so the form can say so before the person submits.
 */
export function isSameFullName(a: string, b: string): boolean {
  const first = nameWords(a);
  const second = nameWords(b);
  const [small, large] = first.length <= second.length ? [first, second] : [second, first];
  return small.length >= 2 && small.every((word) => large.some((other) => sameWord(word, other)));
}
