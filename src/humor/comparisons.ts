export interface FunComparison {
  thresholdMinutes: number;
  template: string;
}

const TIME_COMPARISONS: FunComparison[] = [
  { thresholdMinutes: 10, template: "That's a whole coffee break on the throne!" },
  { thresholdMinutes: 30, template: "That's enough to watch a full sitcom episode!" },
  { thresholdMinutes: 60, template: "That's a whole commute to work... on the toilet." },
  { thresholdMinutes: 90, template: "That's an entire football half. On the throne." },
  { thresholdMinutes: 120, template: "That's an entire Marvel movie worth of throne time!" },
  { thresholdMinutes: 180, template: "You could've baked a cake in that time!" },
  { thresholdMinutes: 300, template: "That's an entire Lord of the Rings movie!" },
  { thresholdMinutes: 480, template: "That's a full work day. On a toilet. Legend." },
  { thresholdMinutes: 600, template: "You could've flown from New York to Chicago!" },
  { thresholdMinutes: 1440, template: "That's a full day of your life on the throne. No regrets." },
];

/** Get a fun comparison for a total time in minutes. Returns null if under threshold. */
export function getComparison(totalMinutes: number): string | null {
  let best: FunComparison | null = null;
  for (const c of TIME_COMPARISONS) {
    if (totalMinutes >= c.thresholdMinutes) {
      best = c;
    }
  }
  return best?.template ?? null;
}
