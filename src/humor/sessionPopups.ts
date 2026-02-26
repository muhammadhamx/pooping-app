function getRandomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export interface SessionPopupContent {
  message: string;
  emoji: string;
}

const POPUP_MESSAGES: SessionPopupContent[] = [
  { message: "The throne is warm! Want some company?", emoji: '🤝' },
  { message: "Pooping alone is so last century.", emoji: '💬' },
  { message: "Legend says poop buddies finish 30% faster.", emoji: '📊' },
  { message: "Solo mission? Or multiplayer mode?", emoji: '🎮' },
  { message: "Your throne awaits... but so do your people.", emoji: '👑' },
  { message: "Fun fact: synchronized pooping is a real thing. Probably.", emoji: '🤔' },
  { message: "The Throne Room is buzzing. Don't miss out!", emoji: '🐝' },
  { message: "Why poop alone when you can poop together?", emoji: '🫂' },
  { message: "The council is in session. Join the debate.", emoji: '⚖️' },
  { message: "A poop buddy makes everything better. Science says so.", emoji: '🔬' },
];

const POPUP_MESSAGES_WITH_COUNT: SessionPopupContent[] = [
  { message: "{count} people are pooping right now. Join the party!", emoji: '🎉' },
  { message: "{count} thrones occupied. You're not alone!", emoji: '🚽' },
  { message: "{count} fellow poopers online. Say hi!", emoji: '👋' },
];

const DISMISS_TEXTS: string[] = [
  "I fly solo",
  "Just me and my phone",
  "Nah, this is a private audience",
  "No thanks, lone wolf mode",
  "I prefer to reign alone",
  "Solo throne time",
];

export function getPopupContent(activePoopersCount: number): SessionPopupContent {
  // If there are active poopers, sometimes show the count-based messages
  if (activePoopersCount > 1 && Math.random() > 0.5) {
    const template = getRandomItem(POPUP_MESSAGES_WITH_COUNT);
    return {
      ...template,
      message: template.message.replace('{count}', String(activePoopersCount)),
    };
  }
  return getRandomItem(POPUP_MESSAGES);
}

export function getDismissText(): string {
  return getRandomItem(DISMISS_TEXTS);
}
