const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'that', 'this', 'from', 'your', 'have', 'will',
  'into', 'about', 'after', 'before', 'where', 'when', 'what', 'there', 'their',
  'been', 'were', 'them', 'then', 'than', 'also', 'just', 'more', 'some', 'into',
  'note', 'notes', 'todo', 'task', 'tasks', 'book', 'books', 'video', 'videos',
  'card', 'cards', 'api', 'apis', 'password', 'passwords', 'need', 'make', 'done',
]);

const cleanText = (value) =>
  String(value || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();

const wordFrequency = (texts) => {
  const counts = {};

  texts.forEach((text) => {
    cleanText(text)
      .toLowerCase()
      .replace(/[^a-z0-9#@\- ]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 2 && !STOP_WORDS.has(word))
      .forEach((word) => {
        counts[word] = (counts[word] || 0) + 1;
      });
  });

  return counts;
};

const summarizeText = (text, maxLength = 220) => {
  const cleaned = cleanText(text);
  if (!cleaned) return 'No content to summarize yet.';
  if (cleaned.length <= maxLength) return cleaned;

  const sentence = cleaned.split(/(?<=[.!?])\s+/).find(Boolean);
  if (sentence && sentence.length <= maxLength) {
    return `${sentence} ...`;
  }

  return `${cleaned.slice(0, maxLength).trim()}...`;
};

export const summarizeNote = (note) => {
  const title = note?.title?.trim();
  const summary = summarizeText(note?.content || note?.text || '');
  return title ? `${title}: ${summary}` : summary;
};

export const prioritizeTodos = (todos) => {
  const now = new Date();

  return (Array.isArray(todos) ? todos : [])
    .map((todo) => {
      let aiScore = 0;
      const priority = String(todo?.priority || '').toLowerCase();
      const status = String(todo?.status || 'todo').toLowerCase();
      const dueDate = todo?.dueDate ? new Date(todo.dueDate) : null;

      if (priority === 'high') aiScore += 45;
      if (priority === 'medium') aiScore += 25;
      if (priority === 'low') aiScore += 10;

      if (status === 'todo') aiScore += 20;
      if (status === 'in-progress') aiScore += 28;
      if (status === 'done') aiScore -= 100;

      if (dueDate instanceof Date && !Number.isNaN(dueDate.getTime())) {
        const diffHours = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);
        if (diffHours < 0) aiScore += 40;
        else if (diffHours < 24) aiScore += 30;
        else if (diffHours < 72) aiScore += 18;
      }

      if (String(todo?.text || '').length > 50) aiScore += 4;

      return {
        ...todo,
        aiScore,
      };
    })
    .filter((todo) => todo.aiScore > -50)
    .sort((a, b) => b.aiScore - a.aiScore);
};

export const checkSecurityHealth = ({ passwords = [], apis = [], cards = [] }) => {
  let score = 100;
  const risks = [];
  const duplicates = new Map();

  passwords.forEach((item) => {
    const plain = String(item?.pass || item?.password || '');
    const key = plain.trim();
    if (!key) {
      score -= 8;
      risks.push(`Missing password value for ${item?.title || item?.site || 'an entry'}`);
      return;
    }

    duplicates.set(key, (duplicates.get(key) || 0) + 1);

    if (key.length < 12) {
      score -= 10;
      risks.push(`Short password on ${item?.title || item?.site || 'an entry'}`);
    }

    if (!item?.user && !item?.username) {
      score -= 4;
      risks.push(`Missing username on ${item?.title || item?.site || 'an entry'}`);
    }
  });

  duplicates.forEach((count) => {
    if (count > 1) {
      score -= 15;
      risks.push('Repeated password detected across entries');
    }
  });

  if (apis.length > 0 && apis.some((item) => !item?.secret)) {
    score -= 5;
    risks.push('Some API keys are missing a stored secret');
  }

  if (cards.length > 0 && cards.some((item) => !item?.cvv || !item?.exp)) {
    score -= 5;
    risks.push('Some cards are missing expiry or CVV details');
  }

  return {
    score: Math.max(5, Math.min(100, score)),
    risks: [...new Set(risks)].slice(0, 6),
  };
};

export const analyzeNotes = (notes) => {
  const noteTexts = (Array.isArray(notes) ? notes : []).map(
    (note) => `${note?.title || ''} ${note?.content || ''}`
  );
  const keywords = wordFrequency(noteTexts);
  const tickers = {};
  const patterns = {};
  let win = 0;
  let loss = 0;

  noteTexts.forEach((text) => {
    const cleaned = cleanText(text);
    const tickerMatches = cleaned.match(/\b[A-Z]{2,5}\b/g) || [];
    tickerMatches.forEach((ticker) => {
      tickers[ticker] = (tickers[ticker] || 0) + 1;
    });

    if (/breakout|support|resistance|divergence|trend|setup/i.test(cleaned)) {
      patterns.trading = (patterns.trading || 0) + 1;
    }
    if (/idea|plan|goal|next/i.test(cleaned)) {
      patterns.planning = (patterns.planning || 0) + 1;
    }
    if (/review|summary|learned|lesson/i.test(cleaned)) {
      patterns.review = (patterns.review || 0) + 1;
    }

    if (/win|profit|green|success/i.test(cleaned)) win += 1;
    if (/loss|red|mistake|fail/i.test(cleaned)) loss += 1;
  });

  return {
    indicators: keywords,
    tickers,
    patterns,
    sentiment: { win, loss },
  };
};

export const generateDailyBriefing = (snapshot) => {
  const prioritized = prioritizeTodos(snapshot?.todos || []);
  const topTodo = prioritized[0];
  const dueSoon = prioritized.filter((todo) => todo.aiScore >= 60).length;
  const notesCount = Array.isArray(snapshot?.notes) ? snapshot.notes.length : 0;
  const security = checkSecurityHealth(snapshot || {});

  const lines = [
    `You have ${snapshot?.todos?.length || 0} tasks, ${dueSoon} of them need attention soon.`,
    topTodo
      ? `Top focus: ${topTodo.text} (score ${Math.round(topTodo.aiScore)}).`
      : 'No urgent task detected right now.',
    `Notes in your vault: ${notesCount}.`,
    security.risks.length > 0
      ? `Security needs attention: ${security.risks[0]}.`
      : `Security looks stable with a ${security.score}% health score.`,
  ];

  return lines.join(' ');
};

export const buildAiSnapshot = (snapshot) => ({
  prioritizedTodos: prioritizeTodos(snapshot?.todos || []),
  securityHealth: checkSecurityHealth(snapshot || {}),
  aiAnalysis: analyzeNotes(snapshot?.notes || []),
  dailyBriefing: generateDailyBriefing(snapshot || {}),
});
