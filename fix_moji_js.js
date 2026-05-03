const fs = require('fs');
let text = fs.readFileSync('logic.js', 'utf8');

// The mojibake strings from Python script that we know how to fix:
const fixes = {
    'ðŸ \xa0': '🏠',
    'ðŸ ': '🏠', // Fallback without NBSP
    'ðŸ—ºï¸ ': '🗺️',
    'ðŸŽ¯': '🎯',
    'ðŸš€': '🚀',
    'ðŸ‘¥': '👥',
    'ðŸŽ“': '🎓',
    'ðŸ‘¤': '👤',
    'ðŸ’»': '💻',
    'ðŸ”§': '🔧',
    'ðŸ§ ': '🧠',
    'ðŸ§®': '🧮',
    'ðŸŽ­': '🎬',
    'ðŸ—£ï¸ ': '🗣️',
    'ðŸ“š': '📚',
    'ðŸŽ‰': '🎉',
    'ðŸ‘ ': '👏',
    'ðŸ’ª': '💪',
    'ðŸ’¬': '💬',
    'ðŸ“ ': '📝',
    'ðŸ’¡': '💡',
    'ðŸ—£': '🗣',
    'ðŸŽ¤': '🎤',
    'âš¾': '⚾',
    'âš ï¸ ': '⚠️',
    'ðŸ”„': '🔄',
    'ðŸ“§': '📧',
    'ðŸ“„': '📄',
    'âœ ï¸ ': '✍️',
    'ðŸŒ“': '🌓',
    'â†’': '→',
    'â€¢': '•',
    'ðŸ”µ': '🔵',
    'ðŸ§©': '🧩',
    'ðŸ\x8f¢': '🏢',
    'ðŸŒ\x90': '🌐',
    'ðŸ”¥': '🔥',
    'ðŸ”·': '🔹',
    'ðŸ”’': '🔒',
    'ðŸ\x90\x8d': '🐍',
    'ðŸ’¼': '💼',
    'ðŸ‘\x8d': '👍',
    'ðŸ”¢': '🔢',
    'ðŸ\x8f…': '🏅',
    'ðŸŸ¢': '🟢',
    'ðŸ\x8f†': '🏆',
    'ðŸ™ˆ': '🙈',
    'ðŸ¤\x8d': '🤝',
    'ðŸ¤«': '🤫',
    'ðŸ•’': '🕑',
    'ðŸ“\x9d': '📜',
    'â”€': '─',
    'âœ\x8dï¸ ': '✍️',
    'â€”': '—',
    'â†“': '↓',
    'â¬‡': '⬇',
    'âš': '⛏',
    'â\xad\x90': '⭐',
    'âš™ï¸ ': '⚙️',
    'â˜…': '★',
    'âš¡': '⚡',
    'âœ…': '✅',
    'â†—': '↗',
    'âœ•': '✕',
    'â„¹ï¸ ': 'ℹ️',
    'â\x9d¤ï¸ ': '❤️',
    'â—\x8f': '●',
    'â\x8f³': '⏳',
    'â˜†': '☆',
    'âœ“': '✓',
    'â\x9dŒ': '❌',
    'â†‘': '↑',
    'â”€â”': '──',
    'â•\x90â•': '══'
};

for (const [bad, good] of Object.entries(fixes)) {
    // Escape for regex
    const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    text = text.replace(new RegExp(escapeRegExp(bad), 'g'), good);
}

fs.writeFileSync('logic.js', text, 'utf8');

// Also do app.html
let html = fs.readFileSync('app.html', 'utf8');
for (const [bad, good] of Object.entries(fixes)) {
    const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    html = html.replace(new RegExp(escapeRegExp(bad), 'g'), good);
}
fs.writeFileSync('app.html', html, 'utf8');

console.log('Fixed js and html');
