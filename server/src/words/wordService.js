import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let allWords = [];

try {
  const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'wordList.json'), 'utf-8'));
  allWords = Object.values(data).flat();
} catch (e) {
  allWords = [
    'cat', 'dog', 'apple', 'banana', 'house', 'car', 'tree', 'sun', 'moon', 'star',
    'fish', 'bird', 'book', 'clock', 'chair', 'table', 'phone', 'pizza', 'guitar', 'train'
  ];
}

/**
 * Returns N random unique words
 * @param {number} count
 * @param {string[]} excludeWords
 * @returns {string[]}
 */
export function getRandomWords(count = 3, excludeWords = []) {
  const pool = allWords.filter(w => !excludeWords.includes(w));
  const selected = new Set();
  const target = Math.min(count, pool.length);

  while (selected.size < target) {
    const randomIndex = Math.floor(Math.random() * pool.length);
    selected.add(pool[randomIndex]);
  }

  return Array.from(selected);
}

/**
 * Masks a word into underscores, preserving spaces and revealing specified indices
 * @param {string} word
 * @param {Set<number> | number[]} revealedIndices
 * @returns {string} - e.g. "_ _ a _ _"
 */
export function maskWord(word, revealedIndices = new Set()) {
  const revealedSet = revealedIndices instanceof Set ? revealedIndices : new Set(revealedIndices);
  const chars = word.split('');

  return chars.map((char, index) => {
    if (char === ' ') return '  ';
    if (char === '-' || char === '\'') return char;
    if (revealedSet.has(index)) return char.toUpperCase();
    return '_';
  }).join(' ');
}

/**
 * Generates an array of character indices that will be progressively revealed
 * @param {string} word
 * @param {number} maxHints
 * @returns {number[]}
 */
export function generateHintSchedule(word, maxHints = 2) {
  const eligibleIndices = [];
  for (let i = 0; i < word.length; i++) {
    const char = word[i];
    if (char !== ' ' && char !== '-' && char !== '\'') {
      eligibleIndices.push(i);
    }
  }

  // Shuffle eligible indices
  const shuffled = [...eligibleIndices].sort(() => 0.5 - Math.random());
  const hintLimit = Math.min(maxHints, Math.floor(word.length * 0.45));
  return shuffled.slice(0, Math.max(1, hintLimit));
}
