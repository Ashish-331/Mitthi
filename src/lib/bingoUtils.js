// Bingo game constants, board generators, line detection, and audio feedback
export const BINGO_LETTERS = ["B", "I", "N", "G", "O"];

export const LINES_DEFINITIONS = [
  // Rows
  { id: "row-0", name: "Row 1", type: "row", indices: [0, 1, 2, 3, 4] },
  { id: "row-1", name: "Row 2", type: "row", indices: [5, 6, 7, 8, 9] },
  { id: "row-2", name: "Row 3", type: "row", indices: [10, 11, 12, 13, 14] },
  { id: "row-3", name: "Row 4", type: "row", indices: [15, 16, 17, 18, 19] },
  { id: "row-4", name: "Row 5", type: "row", indices: [20, 21, 22, 23, 24] },
  // Columns
  { id: "col-0", name: "Column 1", type: "col", indices: [0, 5, 10, 15, 20] },
  { id: "col-1", name: "Column 2", type: "col", indices: [1, 6, 11, 16, 21] },
  { id: "col-2", name: "Column 3", type: "col", indices: [2, 7, 12, 17, 22] },
  { id: "col-3", name: "Column 4", type: "col", indices: [3, 8, 13, 18, 23] },
  { id: "col-4", name: "Column 5", type: "col", indices: [4, 9, 14, 19, 24] },
  // Diagonals
  { id: "diag-main", name: "Diagonal \\", type: "diag", indices: [0, 6, 12, 18, 24] },
  { id: "diag-anti", name: "Diagonal /", type: "diag", indices: [4, 8, 12, 16, 20] }
];

export function generateBoard() {
  const numbers = Array.from({ length: 25 }, (_, i) => i + 1);
  for (let i = numbers.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
  }
  return numbers;
}

export function evaluateBoard(board, calledNumbersSet) {
  if (!board || board.length !== 25) {
    return { completedLines: [], lineCount: 0, hasBingo: false, winningIndices: new Set() };
  }

  const completedLines = LINES_DEFINITIONS.filter(line =>
    line.indices.every(idx => calledNumbersSet.has(board[idx]))
  );

  const winningIndices = new Set();
  completedLines.forEach(line => {
    line.indices.forEach(idx => winningIndices.add(idx));
  });

  return {
    completedLines,
    lineCount: completedLines.length,
    hasBingo: completedLines.length >= 5,
    winningIndices
  };
}

export function playSound(type = "pop") {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === "suspended") ctx.resume();
    const now = ctx.currentTime;

    if (type === "pop") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(540, now);
      osc.frequency.exponentialRampToValueAtTime(820, now + 0.08);
      gain.gain.setValueAtTime(0.16, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.11);
    } else if (type === "line") {
      [587.33, 880].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, now + idx * 0.09);
        gain.gain.setValueAtTime(0.18, now + idx * 0.09);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.09 + 0.22);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.09);
        osc.stop(now + idx * 0.09 + 0.22);
      });
    } else if (type === "bingo") {
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + idx * 0.11);
        gain.gain.setValueAtTime(0.22, now + idx * 0.11);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.11 + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.11);
        osc.stop(now + idx * 0.11 + 0.35);
      });
    }
  } catch {
    // Gracefully ignore audio errors (e.g., user not interacted yet)
  }
}
