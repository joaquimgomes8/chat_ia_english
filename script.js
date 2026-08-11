// ChatBuddy - English practice bot with Google Gemini AI
// Frontend: sends messages to the backend /api/chat endpoint
// Backend (server.js) handles the Gemini API call securely with the API key in .env

const chatMessages = document.getElementById('chatMessages');
const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatInput');
const typingIndicator = document.getElementById('typingIndicator');
const suggestions = document.getElementById('suggestions');
const clearBtn = document.getElementById('clearBtn');

const STORAGE_KEY = 'chatbuddy_history';

let userName = null;

const jokes = [
    "Why don't scientists trust atoms? Because they make up everything!",
    "I told my computer I needed a break, and it said 'No problem, I will go to sleep.'",
    "Why did the scarecrow win an award? Because he was outstanding in his field!",
    "What do you call fake spaghetti? An impasta!",
    "Why can't your nose be 12 inches long? Because then it would be a foot!"
];

const smallTalkReplies = [
    "That's interesting! Can you tell me more?",
    "I see! What else is on your mind?",
    "Nice! Let's keep practicing your English.",
    "Cool! Try to make a longer sentence about that.",
    "Got it. How do you feel about that?"
];

// Simple set of common grammar mistakes for beginners.
// Each rule: a regex to detect the mistake and a message explaining the fix.
const grammarRules = [
    { pattern: /\bhe\s+go\b/i, message: 'Small correction: use "He goes" (add -s for he/she/it in the present simple).' },
    { pattern: /\bshe\s+go\b/i, message: 'Small correction: use "She goes" (add -s for he/she/it in the present simple).' },
    { pattern: /\bit\s+go\b/i, message: 'Small correction: use "It goes" (add -s for he/she/it in the present simple).' },
    { pattern: /\bi\s+is\b/i, message: 'Small correction: use "I am" instead of "I is".' },
    { pattern: /\byou\s+is\b/i, message: 'Small correction: use "You are" instead of "You is".' },
    { pattern: /\bhe\s+are\b/i, message: 'Small correction: use "He is" instead of "He are".' },
    { pattern: /\bshe\s+are\b/i, message: 'Small correction: use "She is" instead of "She are".' },
    { pattern: /\bdont\b/i, message: "Small correction: \"dont\" should be written as \"don't\" (with an apostrophe)." },
    { pattern: /didn't\s+went/i, message: "Small correction: use \"didn't go\" (base form after \"didn't\"), not \"didn't went\"." },
    { pattern: /\bmore\s+better\b/i, message: 'Small correction: just say "better" - "more better" is a double comparative.' },
    { pattern: /\bi\s+have\s+\d+\s+years\b/i, message: 'Small correction: in English we say "I am __ years old", not "I have __ years".' },
    { pattern: /\bpeoples\b/i, message: 'Small correction: "people" is already plural, so avoid "peoples" (unless referring to different ethnic/cultural peoples).' },
    { pattern: /\bthis\s+are\b/i, message: 'Small correction: use "This is" - "this" is singular.' },
    { pattern: /\bthese\s+is\b/i, message: 'Small correction: use "These are" - "these" is plural.' }
];

function saveHistory() {
    const html = chatMessages.innerHTML;
    localStorage.setItem(STORAGE_KEY, html);
    if (userName) {
        localStorage.setItem('chatbuddy_name', userName);
    }
}

function loadHistory() {
    const saved = localStorage.getItem(STORAGE_KEY);
    const savedName = localStorage.getItem('chatbuddy_name');
    if (savedName) userName = savedName;

    if (saved) {
        chatMessages.innerHTML = saved;
        chatMessages.scrollTop = chatMessages.scrollHeight;
    } else {
        addMessage(
            "Hi! I'm ChatBuddy. Let's practice English together! " +
            "Tell me your name, ask me questions, or type \"correct: your sentence\" " +
            "to check for common grammar mistakes.",
            'bot'
        );
    }
}

function addMessage(text, sender) {
    const div = document.createElement('div');
    div.className = `message ${sender}`;
    div.textContent = text;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    saveHistory();
    return div;
}

function showTyping() {
    typingIndicator.classList.remove('hidden');
}

function hideTyping() {
    typingIndicator.classList.add('hidden');
}

function checkGrammar(sentence) {
    const issues = grammarRules.filter((rule) => rule.pattern.test(sentence));
    if (issues.length === 0) {
        return (
            "I didn't find any of the common mistakes I know about in that sentence. " +
            "It looks good! Keep practicing."
        );
    }
    return issues.map((rule) => rule.message).join('\n');
}

function extractName(text) {
    const patterns = [
        /my name is\s+([a-zA-Z]+)/i,
        /i am\s+([a-zA-Z]+)/i,
        /i'm\s+([a-zA-Z]+)/i,
        /call me\s+([a-zA-Z]+)/i
    ];
    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) return match[1];
    }
    return null;
}

function capitalize(word) {
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

// Get an intelligent reply from the backend (which calls Gemini securely)
async function getAIReply(text) {
    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message: text })
        });

        if (!response.ok) {
            console.error('Backend API error:', response.status);
            return null;
        }

        const data = await response.json();
        if (!data.reply) return null;
        return data.reply;
    } catch (error) {
        console.error('Backend API error:', error);
        return null;
    }
}

function generateLocalReply(rawText) {
    const text = rawText.trim();
    const lower = text.toLowerCase();

    if (lower.startsWith('correct:')) {
        const sentence = text.slice(text.indexOf(':') + 1).trim();
        if (!sentence) {
            return 'Please write a sentence after "correct:" so I can check it. Example: correct: She go to school.';
        }
        return checkGrammar(sentence);
    }

    const detectedName = extractName(text);
    if (detectedName && !userName) {
        userName = detectedName;
        return `Nice to meet you, ${capitalize(userName)}! What would you like to talk about?`;
    }

    if (/\b(hi|hello|hey)\b/.test(lower)) {
        return userName
            ? `Hello again, ${capitalize(userName)}! How are you today?`
            : 'Hello! How are you today? What is your name?';
    }

    if (/how are you/.test(lower)) {
        return "I'm just a practice bot, but I'm doing great, thanks for asking! How about you?";
    }

    if (/what('|)s your name|who are you/.test(lower)) {
        return "I'm ChatBuddy, your English practice partner! What's your name?";
    }

    if (/joke/.test(lower)) {
        return jokes[Math.floor(Math.random() * jokes.length)];
    }

    if (/thank/.test(lower)) {
        return "You're welcome! Keep practicing, you're doing great.";
    }

    if (/\b(bye|goodbye|see you)\b/.test(lower)) {
        return userName
            ? `Goodbye, ${capitalize(userName)}! Come back soon to practice more English.`
            : 'Goodbye! Come back soon to practice more English.';
    }

    if (/help|what can you do/.test(lower)) {
        return (
            'I can chat with you in simple English, tell jokes, and check sentences for ' +
            'common grammar mistakes. Try typing: correct: He go to work every day.'
        );
    }

    if (lower.endsWith('?')) {
        return "That's a good question! I'm a simple practice bot, so I can't always answer, " +
            "but try explaining it to me in English - that's great practice!";
    }

    return smallTalkReplies[Math.floor(Math.random() * smallTalkReplies.length)];
}

// Check if a message should be handled locally (fast, offline) or by the AI backend
function shouldUseAI(text) {
    const lower = text.toLowerCase();

    // Always handle these locally for speed and reliability
    if (lower.startsWith('correct:')) return false;
    if (/\b(hi|hello|hey)\b/.test(lower) && lower.trim().length < 20) return false;
    if (/how are you/.test(lower)) return false;
    if (/what('|)s your name|who are you/.test(lower)) return false;
    if (/joke/.test(lower)) return false;
    if (/thank/.test(lower)) return false;
    if (/\b(bye|goodbye|see you)\b/.test(lower)) return false;
    if (/help|what can you do/.test(lower)) return false;

    // Name detection should be local
    if (extractName(text) && !userName) return false;

    // Everything else goes to the AI backend
    return true;
}

async function handleUserMessage(text) {
    if (!text.trim()) return;

    addMessage(text, 'user');
    showTyping();

    let reply;

    if (shouldUseAI(text)) {
        reply = await getAIReply(text);
        if (!reply) {
            // Backend failed - fall back to local rules
            reply = generateLocalReply(text);
        }
    } else {
        // Small delay to simulate thinking for local replies
        await new Promise((resolve) => setTimeout(resolve, 400 + Math.random() * 400));
        reply = generateLocalReply(text);
    }

    hideTyping();
    addMessage(reply, 'bot');
}

chatForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const text = chatInput.value;
    chatInput.value = '';
    handleUserMessage(text);
});

suggestions.addEventListener('click', (event) => {
    if (event.target.classList.contains('chip')) {
        handleUserMessage(event.target.textContent);
    }
});

clearBtn.addEventListener('click', () => {
    const confirmed = confirm('Clear the whole conversation?');
    if (!confirmed) return;
    chatMessages.innerHTML = '';
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('chatbuddy_name');
    userName = null;
    addMessage(
        "Hi! I'm ChatBuddy. Let's practice English together! " +
        "Tell me your name, ask me questions, or type \"correct: your sentence\" " +
        "to check for common grammar mistakes.",
        'bot'
    );
});

loadHistory();
chatInput.focus();