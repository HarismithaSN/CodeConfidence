const fs = require('fs');
const b1 = fs.readFileSync('patch_behavioral.js', 'utf8');
const b2 = fs.readFileSync('patch_mock.js', 'utf8');
let logic = fs.readFileSync('logic.js', 'utf8');

// Also remove broken launchFullMockTest at 935 if it exists.
// We can just find it: <div style="max-width: 600px; margin: 0 auto; text-align: center;">\n            <div class="glass-card" style="padding: 40px;">\n                <h2 style="font-size: 28px; margin-bottom: 16px;">
// But since the broken HTML is an issue caused by my sed command, I will just fix logic.js.
// Wait, actually I will just write a regex to clean up the broken HTML from lines 935 to 963.
logic = logic.replace(/<div style="max-width: 600px; margin: 0 auto; text-align: center;">\s*<div class="glass-card" style="padding: 40px;">[\s\S]*?<\/div>\s*<\/div>\s*`;\s*}/, '');

fs.writeFileSync('logic.js', logic + '\n' + b1 + '\n' + b2 + '\n', 'utf8');
console.log("Done!");
