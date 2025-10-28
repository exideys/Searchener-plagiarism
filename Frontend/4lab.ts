function analyzeWords(text: string) {
  const words: string[] = text
    .toLowerCase()
    .replace(/[.,]/g, "")
    .split(/\s+/) 
    .filter(Boolean);

  const total = words.length;

  const counts: Record<string, number> = {};
  for (const w of words) counts[w] = (counts[w] || 0) + 1;

  const frequencies: Record<string, number> = {};
  for (const [word, count] of Object.entries(counts))
    frequencies[word] = count / total;

  return { total, counts, frequencies };
}

const text = "Був господар був пан був господар";
console.log(analyzeWords(text));