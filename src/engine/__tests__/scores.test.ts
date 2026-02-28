import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadTopScores, saveTopScore } from '../scores';
import type { ScoreEntry } from '../types';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

beforeEach(() => {
  localStorageMock.clear();
  vi.clearAllMocks();
});

describe('loadTopScores', () => {
  it('returns empty array when no scores exist', () => {
    expect(loadTopScores()).toEqual([]);
  });

  it('returns parsed scores from localStorage', () => {
    const scores: ScoreEntry[] = [
      { score: 1000, level: 5, date: '1/1/2026' },
      { score: 500, level: 3, date: '1/2/2026' },
    ];
    localStorageMock.setItem('cytoscape-top-scores', JSON.stringify(scores));
    expect(loadTopScores()).toEqual(scores);
  });

  it('returns empty array for invalid JSON', () => {
    localStorageMock.setItem('cytoscape-top-scores', 'not-json');
    expect(loadTopScores()).toEqual([]);
  });

  it('returns empty array for non-array JSON', () => {
    localStorageMock.setItem('cytoscape-top-scores', JSON.stringify({ score: 100 }));
    expect(loadTopScores()).toEqual([]);
  });

  it('caps at 10 scores', () => {
    const scores = Array.from({ length: 15 }, (_, i) => ({
      score: i * 100,
      level: i,
      date: '1/1/2026',
    }));
    localStorageMock.setItem('cytoscape-top-scores', JSON.stringify(scores));
    expect(loadTopScores()).toHaveLength(10);
  });
});

describe('saveTopScore', () => {
  it('saves a new score and returns sorted list', () => {
    const entry: ScoreEntry = { score: 1000, level: 5, date: '1/1/2026' };
    const result = saveTopScore(entry);
    expect(result).toHaveLength(1);
    expect(result[0].score).toBe(1000);
  });

  it('sorts scores in descending order', () => {
    saveTopScore({ score: 500, level: 3, date: '1/1/2026' });
    saveTopScore({ score: 1500, level: 8, date: '1/2/2026' });
    const result = saveTopScore({ score: 1000, level: 5, date: '1/3/2026' });

    expect(result[0].score).toBe(1500);
    expect(result[1].score).toBe(1000);
    expect(result[2].score).toBe(500);
  });

  it('caps at 10 scores, dropping lowest', () => {
    for (let i = 1; i <= 10; i++) {
      saveTopScore({ score: i * 100, level: i, date: '1/1/2026' });
    }
    const result = saveTopScore({ score: 550, level: 4, date: '1/2/2026' });

    expect(result).toHaveLength(10);
    // The lowest score (100) should have been dropped
    expect(result[result.length - 1].score).toBe(200);
    // 550 should be in the list
    expect(result.some(s => s.score === 550)).toBe(true);
  });

  it('persists scores to localStorage', () => {
    saveTopScore({ score: 2000, level: 10, date: '1/1/2026' });
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'cytoscape-top-scores',
      expect.any(String)
    );
    const stored = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
    expect(stored[0].score).toBe(2000);
  });
});
