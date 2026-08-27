/**
 * Commands matched by pattern rather than exact name (prefix arguments).
 *
 * Each declares `match(cmd)` plus `runDynamic(cmd, ctx)`. `usage` is what the
 * help screen shows, since the bare `name` would not convey the argument.
 *
 * Async commands (`ask`, `weather`) share one shape: push a placeholder entry
 * with a unique id, commit it, return `{ earlyReturn: true }`, then patch that
 * entry by id when the promise settles.
 */
import { askGrokStream } from '../services/aiService';
import { escapeHtml, sanitizeAiHtml } from '../utils/escapeHtml';
import { lookupCommandMeta } from './derived';
import { CATEGORY_LABELS } from './types';

/** One `KEY  value` row of a manual page. */
const manRow = (label, value) =>
    `<div style="margin-top:6px;"><span style="color:var(--accent-color);">${label}</span><br>&nbsp;&nbsp;${value}</div>`;

export const dynamicCommands = [
    {
        name: 'man',
        category: 'terminal',
        usage: 'man [command]',
        description: 'Show the manual page for a command',
        match: cmd => cmd.startsWith('man ') || cmd === 'man',
        runDynamic: (cmd) => {
            const target = cmd.replace(/^man\s*/i, '').trim().toLowerCase();

            if (!target) {
                return {
                    outputContent: `<div>What manual page do you want? Usage: <span class="command-highlight" data-cmd="man help">man [command]</span></div><br>`,
                    shouldAnimate: false,
                };
            }

            const meta = lookupCommandMeta(target);
            if (!meta) {
                return {
                    outputContent: `<div>No manual entry for <em>${escapeHtml(target)}</em>. Try <span class="command-highlight" data-cmd="help">help</span> for the full list.</div><br>`,
                    shouldAnimate: false,
                };
            }

            const rows = [
                manRow('NAME', `<strong>${escapeHtml(meta.name)}</strong>${meta.description ? ` — ${escapeHtml(meta.description)}` : ''}`),
                manRow('SYNOPSIS', `<code>${escapeHtml(meta.usage ?? meta.name)}</code>`),
                manRow('CATEGORY', escapeHtml(CATEGORY_LABELS[meta.category] ?? meta.category ?? 'uncategorised')),
            ];

            if (meta.aliases?.length) {
                rows.push(manRow('ALIASES', meta.aliases.map(a => `<code>${escapeHtml(a)}</code>`).join(', ')));
            }
            if (!meta.description) {
                rows.push(manRow('NOTE', 'Undocumented — this one is a hidden command.'));
            }

            return {
                outputContent: `<div class="help-container"><div class="section-title">MANUAL: ${escapeHtml(meta.name)}</div>${rows.join('')}</div><br>`,
                shouldAnimate: false,
            };
        }
    },
    {
        name: 'open',
        category: 'terminal',
        usage: 'open [target]',
        description: 'Open LinkedIn, GitHub or email',
        match: cmd => cmd.startsWith('open '),
        runDynamic: (cmd) => {
            const target = cmd.replace('open ', '').trim();
            const links = {
                linkedin: 'https://linkedin.com/in/teo-clerici',
                github:   'https://github.com/teo-clerk',
                email:    'mailto:clerici.teo5@gmail.com',
            };
            if (links[target]) {
                const specialAction = () => window.open(links[target], '_blank');
                return { outputContent: `<div>🔗 Opening <strong>${escapeHtml(target)}</strong>...</div><br>`, shouldAnimate: false, specialAction };
            } else {
                return { outputContent: `<div>Unknown target: <em>${escapeHtml(target)}</em>. Try: <span class="command-highlight" data-cmd="open linkedin">linkedin</span>, <span class="command-highlight" data-cmd="open github">github</span>, <span class="command-highlight" data-cmd="open email">email</span></div><br>`, shouldAnimate: false };
            }
        }
    },
    {
        name: 'theme-arg',
        category: 'terminal',
        match: cmd => cmd.startsWith('theme '),
        runDynamic: (cmd, ctx) => {
            const themeName = cmd.replace('theme ', '').trim();
            if (ctx.applyTheme(themeName)) {
                return { outputContent: `<div>🎨 Theme switched to <strong>${escapeHtml(themeName)}</strong>.</div><br>`, shouldAnimate: false };
            } else {
                return { outputContent: `<div>Unknown theme: <em>${escapeHtml(themeName)}</em>. Available: <span class="command-highlight" data-cmd="theme purple">purple</span>, <span class="command-highlight" data-cmd="theme green">green</span>, <span class="command-highlight" data-cmd="theme amber">amber</span></div><br>`, shouldAnimate: false };
            }
        }
    },
    {
        name: 'sudo',
        category: 'terminal',
        match: cmd => cmd.startsWith('sudo'),
        runDynamic: () => ({ outputContent: `<div><span style="color:#ff5f56;">Permission denied</span>: you are not root.<br>With great power comes great responsibility — and you don't have <em>either</em> here.<br>Try <span class="command-highlight" data-cmd="contact">contact</span> if you want to talk.</div><br>`, shouldAnimate: false })
    },
    {
        name: 'calc',
        category: 'terminal',
        usage: 'calc [math]',
        description: 'Evaluate math',
        match: cmd => cmd.startsWith('calc ') || cmd === 'calc',
        runDynamic: (cmd) => {
            const expression = cmd.replace(/^calc\s*/i, '').trim();
            if (!expression) {
                return { outputContent: `<div>Usage: <span class="command-highlight" data-cmd="calc 5 * 10">calc [math expression]</span></div><br>`, shouldAnimate: false };
            } else {
                try {
                    if (!/^[0-9+\-*/().\s]+$/.test(expression)) {
                        throw new Error('Invalid characters');
                    }
                    const result = new Function(`"use strict"; return (${expression})`)();
                    return { outputContent: `<div><span style="color:#aaa;">${escapeHtml(expression)} =</span> <strong>${result}</strong></div><br>`, shouldAnimate: false };
                } catch {
                    return { outputContent: `<div style="color:#ff5f56;">Error evaluating expression. Usage: <span class="command-highlight" data-cmd="calc 5 * 4">calc [math]</span></div><br>`, shouldAnimate: false };
                }
            }
        }
    },
    {
        name: 'ask',
        category: 'terminal',
        usage: 'ask [question]',
        description: "Chat with Teo's AI",
        match: cmd => cmd.startsWith('ask ') || cmd === 'ask',
        runDynamic: (cmd, ctx) => {
            const question = cmd.replace(/^ask\s*/i, '').trim();
            if (!question) {
                return { outputContent: `<div>Please provide a question. Usage: <span class="command-highlight" data-cmd="ask who are you?">ask [your question]</span></div><br>`, shouldAnimate: false };
            } else {
                const thinkingId = Date.now() + '-thinking';
                ctx.newHistory.push({
                    id: thinkingId,
                    content: `<div><span style="color:var(--accent-color);">■ Grok:</span> <span style="color:#888;">▌</span></div><br>`,
                    type: 'output',
                    isAnimated: false,
                    // Opts this row out of OutputLine's "freeze finished lines"
                    // memo comparator, which would otherwise discard every
                    // token patch after the first.
                    isStreaming: true
                });

                ctx.setHistory([...ctx.newHistory]);
                ctx.setCommandHistory(prev => [...prev, cmd]);
                ctx.setHistoryIndex(ctx.commandHistory.length + 1);
                ctx.setInputVal('');
                ctx.setIsTyping(true);

                // Streaming replaces the typewriter for this one command: the
                // tokens arriving *are* the animation, so every patch is
                // `isAnimated: false`. Re-running the typewriter over a growing
                // string would restart it from the top on every chunk.
                // `streaming` stays true for every intermediate patch and flips
                // false on the last one, which re-freezes the finished line.
                const patch = (html, streaming) => {
                    ctx.setHistory(current => current.map(item =>
                        item.id === thinkingId
                            ? { ...item, content: html, isAnimated: false, isStreaming: streaming }
                            : item
                    ));
                };

                const render = (text, caret) =>
                    `<div><span style="color:var(--accent-color);">■ Grok:</span> ${sanitizeAiHtml(text)}${caret ? '<span style="color:#888;">▌</span>' : ''}</div><br>`;

                askGrokStream(question, (soFar) => patch(render(soFar, true), true))
                    .then(reply => {
                        // An empty reply means a newer question superseded this
                        // one; that stream's entry is stale, so leave it alone.
                        if (reply) patch(render(reply, false), false);
                    })
                    .catch(() => {
                        patch(`<div style="color:#ff5f56;">The AI module dropped the connection.</div><br>`, false);
                    })
                    .finally(() => ctx.setIsTyping(false));

                return { earlyReturn: true };
            }
        }
    },
    {
        name: 'cowsay',
        category: 'terminal',
        usage: 'cowsay [msg]',
        description: 'ASCII cow message',
        match: cmd => cmd.startsWith('cowsay ') || cmd === 'cowsay',
        runDynamic: (cmd) => {
            const msg = cmd.replace(/^cowsay\s*/i, '').trim() || "Moo";
            const len = msg.length + 2;
            const top = " _" + "_".repeat(len) + "_ ";
            const bot = " -" + "-".repeat(len) + "- ";
            
            return {
                outputContent: `<pre class="ascii-art" style="color:#aaa; font-size: 0.8rem;">
${top}
< ${escapeHtml(msg)} >
${bot}
        \\   ^__^
         \\  (oo)\\_______
            (__)\\       )\\/$
                ||----w |
                ||     ||</pre><br>`, shouldAnimate: false
            };
        }
    },
    {
        name: 'weather',
        category: 'terminal',
        usage: 'weather [city]',
        description: 'Get current weather',
        match: cmd => cmd.startsWith('weather') || cmd === 'weather',
        runDynamic: (cmd, ctx) => {
            const city = cmd.replace(/^weather\s*/i, '').trim();
            if (!city) {
                return { outputContent: `<div>Usage: <span class="command-highlight" data-cmd="weather venice">weather [city]</span></div><br>`, shouldAnimate: false };
            } else {
                const weatherId = Date.now() + '-weather';
                ctx.newHistory.push({
                    id: weatherId,
                    content: `<div style="color:#888;">Fetching weather for ${escapeHtml(city)}...</div><br>`,
                    type: 'output',
                    isAnimated: false
                });
                
                ctx.setHistory([...ctx.newHistory]);
                ctx.setCommandHistory(prev => [...prev, cmd]);
                ctx.setHistoryIndex(ctx.commandHistory.length + 1);
                ctx.setInputVal('');
                ctx.setIsTyping(true);
                
                fetch(`https://wttr.in/${city}?format=3`)
                    .then(res => {
                        if (!res.ok) throw new Error("Network/CORS error");
                        return res.text();
                    })
                    .catch(() => {
                        return fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(`https://wttr.in/${city}?format=3`)}`)
                            .then(res => {
                                if (!res.ok) throw new Error("Proxy error");
                                return res.text();
                            });
                    })
                    .then(text => {
                        if (!text || text.includes('Unknown location')) throw new Error("Not found");
                        ctx.setHistory(current => current.map(item => 
                            item.id === weatherId 
                                ? { ...item, content: `<div style="color:#ddd;">☁️ ${escapeHtml(text)}</div><br>`, isAnimated: true } 
                                : item
                        ));
                        ctx.setIsTyping(true);
                    }).catch(() => {
                        ctx.setHistory(current => current.map(item => 
                            item.id === weatherId 
                                ? { ...item, content: `<div style="color:#ff5f56;">Failed to fetch weather for "${escapeHtml(city)}".</div><br>`, isAnimated: true } 
                                : item
                        ));
                        ctx.setIsTyping(true);
                    });
                return { earlyReturn: true };
            }
        }
    },
    {
        name: 'volume',
        category: 'terminal',
        usage: 'volume [0-100]',
        description: 'Set global audio volume',
        match: cmd => cmd.startsWith('volume') || cmd === 'volume',
        runDynamic: (cmd, ctx) => {
            const val = cmd.replace(/^volume\s*/i, '').trim();
            if (!val) {
                return { outputContent: `<div>Current volume: ${Math.round(ctx.globalVolume * 100)}%</div><br>`, shouldAnimate: false };
            } else {
                const num = parseInt(val, 10);
                if (isNaN(num) || num < 0 || num > 100) {
                    return { outputContent: `<div style="color:#ff5f56;">Invalid volume. Usage: <span class="command-highlight" data-cmd="volume 75">volume [0-100]</span></div><br>`, shouldAnimate: false };
                } else {
                    const newVol = num / 100;
                    ctx.setGlobalVolume(newVol);
                    return { outputContent: `<div>Volume set to ${num}%</div><br>`, shouldAnimate: false };
                }
            }
        }
    },
    {
        name: 'lang',
        category: 'terminal',
        usage: 'lang [code]',
        description: 'Change interface language',
        match: cmd => cmd.startsWith('lang ') || cmd === 'lang',
        runDynamic: (cmd) => {
            const lang = cmd.replace(/^lang\s*/i, '').trim().toLowerCase();
            if (!lang) {
                return { outputContent: `<div>Usage: <span class="command-highlight" data-cmd="lang es">lang [es/it/en/ca]</span></div><br>`, shouldAnimate: false };
            } else if (lang === 'en') {
                return { outputContent: `<div>English mode activated. (It already was!) 🇬🇧</div><br>`, shouldAnimate: false };
            } else if (lang === 'es') {
                return { outputContent: `<div>¡Modo español activado! Aquí tienes mi información básica: soy Teo Clerici, estudiante de IA y Ciencia de Datos. ¡Escribe <span class="command-highlight" data-cmd="help">help</span> para más comandos! 🇪🇸</div><br>`, shouldAnimate: false };
            } else if (lang === 'it') {
                return { outputContent: `<div>Modalità italiana attivata! Sono Teo Clerici, studente di AI e Data Science. Scrivi <span class="command-highlight" data-cmd="help">help</span> per esplorare! 🇮🇹</div><br>`, shouldAnimate: false };
            } else if (lang === 'ca') {
                return { outputContent: `<div>Mode català activat! Sóc en Teo Clerici, estudiant d'IA i Ciència de Dades. Escriu <span class="command-highlight" data-cmd="help">help</span> per veure més! ✨</div><br>`, shouldAnimate: false };
            } else {
                return { outputContent: `<div>Language '${escapeHtml(lang)}' not fully supported yet. I speak English, Spanish, Italian, and Catalan!</div><br>`, shouldAnimate: false };
            }
        }
    }
];

