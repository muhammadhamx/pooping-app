export interface Greeting {
  message: string;
  emoji: string;
}

const MORNING_GREETINGS: Greeting[] = [
  { message: 'Good morning, Your Majesty! Ready for the royal audience?', emoji: '👑' },
  { message: 'Rise and shine! The throne awaits its ruler.', emoji: '🌅' },
  { message: 'Morning constitutional time?', emoji: '☕' },
  { message: 'The early bird gets the... well, you know.', emoji: '🐦' },
  { message: 'Good morning! Your porcelain office is ready.', emoji: '🏢' },
];

const AFTERNOON_GREETINGS: Greeting[] = [
  { message: 'Afternoon, sire. The throne room is prepared.', emoji: '🏰' },
  { message: 'Post-lunch throne time? A person of culture.', emoji: '🍔' },
  { message: 'The afternoon session — a classic move.', emoji: '☀️' },
  { message: 'Back for round two? Respect.', emoji: '🥊' },
  { message: 'The afternoon shift begins. Godspeed.', emoji: '⚡' },
];

const EVENING_GREETINGS: Greeting[] = [
  { message: 'Good evening! Time for the nightly reading session?', emoji: '📖' },
  { message: 'The throne room is lit by candlelight this hour.', emoji: '🕯️' },
  { message: 'Evening dispatch from the porcelain office.', emoji: '🌆' },
  { message: 'The evening throne — a timeless tradition.', emoji: '🌇' },
  { message: 'Winding down? The throne never judges.', emoji: '🧘' },
];

const NIGHT_GREETINGS: Greeting[] = [
  { message: 'Late night throne session? Respect.', emoji: '🌙' },
  { message: 'The throne never sleeps. Neither do you, apparently.', emoji: '🦉' },
  { message: 'Midnight mission to the throne room.', emoji: '🌑' },
  { message: 'A secret nighttime audience with the throne.', emoji: '🤫' },
  { message: "It's just you, the throne, and the silence.", emoji: '🌌' },
];

function getRandomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function getGreeting(): Greeting {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return getRandomItem(MORNING_GREETINGS);
  if (hour >= 12 && hour < 17) return getRandomItem(AFTERNOON_GREETINGS);
  if (hour >= 17 && hour < 21) return getRandomItem(EVENING_GREETINGS);
  return getRandomItem(NIGHT_GREETINGS);
}
