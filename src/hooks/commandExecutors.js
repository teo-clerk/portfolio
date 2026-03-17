import {
    cvData, helpText, whoamiText, getRandomFortune, themeText, tarsText,
    accioText, avengersText, expectoText, wingardiumText,
    yodaText, vaderText, r2d2Text, starWarsText, mayTheForceText,
    totoroText, ghibliText, spiritedText, spiderManText, getRandomFunfact,
    pascalText, easterEggsText, grootText, ironmanText, catText, patoText, getRandomAstrofact,
    guardiansText, starlordText, teofetchText, htopText, snakeText, gargantuaText, emailText,
    commandsList
} from '../data/cvData';
import { getRandomArt } from '../data/randomArt';
import { askGrok } from '../services/aiService';

export const commandExecutors = {
    'clear': (ctx) => {
        ctx.setHistory([]);
        ctx.setInputVal('');
        return { earlyReturn: true };
    },
    'help': () => ({ outputContent: helpText }),
    'commands': () => {
        const sortedCmds = [...commandsList].sort();
        const content = `
<div class="help-container">
  <div class="section-title">ALL INTERNAL COMMANDS (DEBUG)</div>
  <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 8px; margin-top: 10px;">
    ${sortedCmds.map(c => `<div class="command-highlight" style="font-size:0.85rem;" data-cmd="${c}">${c}</div>`).join('')}
  </div>
</div><br>`;
        return { outputContent: content, shouldAnimate: false };
    },
    'whoami': () => ({ outputContent: whoamiText }),
    'game': (ctx) => {
        ctx.setHistory([...ctx.newHistory]);
        ctx.setInputVal('');
        setTimeout(() => ctx.setShowGame(true), 50);
        return { earlyReturn: true };
    },
    'matrix': (ctx) => {
        ctx.setHistory([...ctx.newHistory]);
        ctx.setInputVal('');
        setTimeout(() => ctx.setShowMatrix(true), 50);
        return { earlyReturn: true };
    },
    'doom': (ctx) => {
        ctx.setHistory([...ctx.newHistory]);
        ctx.setInputVal('');
        setTimeout(() => ctx.setShowDoom(true), 50);
        return { earlyReturn: true };
    },
    'recruiter': (ctx) => {
        const specialAction = () => {
            const a = document.createElement('a');
            a.href = '/CV.pdf';
            a.download = 'Teo_Clerici_CV.pdf';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        };
        const summary = `
<div class="whoami-card" style="border-left: 4px solid var(--accent-color);">
  <div style="color:var(--accent-color); font-weight:bold; font-size:1.2rem; margin-bottom:10px;">👋 Hi! I'm Teo Clerici Jurado - TL;DR Summary</div>
  <div style="margin-bottom: 12px; line-height: 1.5;">
    I'm an <strong>AI & Data Science Student</strong> at the University of Chichester (H-Farm Campus) and a Passionate Developer. I enjoy building interactive, performance-driven applications and solving complex data problems.
  </div>
  <div class="whoami-row"><span class="whoami-label">email</span><span class="whoami-value"><a href="mailto:clerici.teo5@gmail.com">clerici.teo5@gmail.com</a></span></div>
  <div class="whoami-row"><span class="whoami-label">linkedin</span><span class="whoami-value"><a href="https://linkedin.com/in/teo-clerici" target="_blank">linkedin.com/in/teo-clerici</a></span></div>
  <div class="whoami-row"><span class="whoami-label">github</span><span class="whoami-value"><a href="https://github.com/teo-clerk" target="_blank">github.com/teo-clerk</a></span></div>
  <div style="margin-top: 15px; color:#aaa; font-style:italic;">
    Downloading CV now...
  </div>
</div><br>`;
        return { outputContent: summary, shouldAnimate: true, specialAction };
    },
    'fortune': () => ({ outputContent: getRandomFortune(), shouldAnimate: false }),
    'download': () => {
        const specialAction = () => {
            const a = document.createElement('a');
            a.href = '/CV.pdf';
            a.download = 'Teo_Clerici_CV.pdf';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        };
        return { outputContent: `<div>📄 Downloading <strong>Teo_Clerici_CV.pdf</strong>...</div><br>`, shouldAnimate: false, specialAction };
    },
    'theme': () => ({ outputContent: themeText, shouldAnimate: false }),
    'contact': () => ({
        outputContent: `
<div class="whoami-card">
  <div style="color:var(--accent-color); letter-spacing:0.1em; margin-bottom:8px;">CONTACT INFORMATION</div>
  <div class="whoami-row"><span class="whoami-label">name</span><span class="whoami-value">Teo Clerici</span></div>
  <div class="whoami-row"><span class="whoami-label">email</span><span class="whoami-value"><a href="mailto:clerici.teo5@gmail.com">clerici.teo5@gmail.com</a></span></div>
  <div class="whoami-row"><span class="whoami-label">phone</span><span class="whoami-value">+34 615 451 338</span></div>
  <div class="whoami-row"><span class="whoami-label">location</span><span class="whoami-value">Venice, Italy</span></div>
  <div class="whoami-row"><span class="whoami-label">linkedin</span><span class="whoami-value"><a href="https://linkedin.com/in/teo-clerici" target="_blank">linkedin.com/in/teo-clerici</a></span></div>
  <div class="whoami-row"><span class="whoami-label">github</span><span class="whoami-value"><a href="https://github.com/teo-clerk" target="_blank">github.com/teo-clerk</a></span></div>
  <div class="whoami-row" style="margin-top:8px;"><span style="color:#aaa; font-size:0.85rem;">Want to send a message now? Type <span class="command-highlight" data-cmd="email">email</span></span></div>
</div><br>`, shouldAnimate: false
    }),
    'email': () => ({
        outputContent: emailText,
        shouldAnimate: false,
        specialAction: () => setTimeout(() => window.location.href = 'mailto:clerici.teo5@gmail.com', 1000)
    }),
    'exit': () => ({ outputContent: `<div>This is a browser. There's no escape. Try <span class="command-highlight" data-cmd="clear">clear</span> instead.</div><br>`, shouldAnimate: false }),
    'quit': () => ({ outputContent: `<div>This is a browser. There's no escape. Try <span class="command-highlight" data-cmd="clear">clear</span> instead.</div><br>`, shouldAnimate: false }),
    'ls': () => ({ outputContent: `<div class="ascii-art" style="font-size:0.85rem;">drwxr-xr-x  about/\\ndrwxr-xr-x  education/\\ndrwxr-xr-x  experience/\\ndrwxr-xr-x  projects/\\ndrwxr-xr-x  skills/\\ndrwxr-xr-x  contact/\\n-rw-r--r--  CV.pdf\\n-rwxr-xr-x  game*</div><br>`, shouldAnimate: false }),
    'ls -la': () => ({ outputContent: `<div class="ascii-art" style="font-size:0.85rem;">drwxr-xr-x  about/\\ndrwxr-xr-x  education/\\ndrwxr-xr-x  experience/\\ndrwxr-xr-x  projects/\\ndrwxr-xr-x  skills/\\ndrwxr-xr-x  contact/\\n-rw-r--r--  CV.pdf\\n-rwxr-xr-x  game*</div><br>`, shouldAnimate: false }),
    'pwd': () => ({ outputContent: `<div>/home/visitor/teoclerici</div><br>`, shouldAnimate: false }),
    'date': () => ({ outputContent: `<div>${new Date().toUTCString()}</div><br>`, shouldAnimate: false }),
    'tars': () => ({ outputContent: tarsText, shouldAnimate: false }),
    'randomart': () => ({ outputContent: getRandomArt(), shouldAnimate: false }),
    'accio': (ctx) => commandExecutors['accio cv'](ctx),
    'accio cv': () => ({
        outputContent: accioText,
        shouldAnimate: false,
        specialAction: () => {
            const a = document.createElement('a');
            a.href = '/CV.pdf';
            a.download = 'Teo_Clerici_CV.pdf';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
    }),
    'accio resume': (ctx) => commandExecutors['accio cv'](ctx),
    'avengers': () => ({ outputContent: avengersText, shouldAnimate: false }),
    'avengers assemble': () => ({ outputContent: avengersText, shouldAnimate: false }),
    'expecto': (ctx) => commandExecutors['expecto patronum'](ctx),
    'expecto patronum': () => ({
        outputContent: expectoText,
        shouldAnimate: false,
        specialAction: () => {
            const flash = document.createElement('div');
            flash.style.position = 'fixed';
            flash.style.inset = '0';
            flash.style.backgroundColor = '#fff';
            flash.style.zIndex = '999999';
            flash.style.opacity = '1';
            flash.style.transition = 'opacity 2.5s ease-out';
            flash.style.pointerEvents = 'none';
            document.body.appendChild(flash);
            flash.getBoundingClientRect(); 
            flash.style.opacity = '0';
            setTimeout(() => document.body.removeChild(flash), 2500);
        }
    }),
    'wingardium': (ctx) => commandExecutors['wingardium leviosa'](ctx),
    'wingardium leviosa': () => ({
        outputContent: wingardiumText,
        shouldAnimate: false,
        specialAction: () => {
            const app = document.querySelector('.app-container');
            if (app) {
                app.style.transition = 'transform 2.5s ease-in-out';
                app.style.transform = 'translateY(-50px)';
                setTimeout(() => {
                    app.style.transform = 'translateY(0)';
                    setTimeout(() => { 
                        app.style.transition = ''; 
                        app.style.transform = ''; 
                    }, 2500);
                }, 3500);
            }
        }
    }),
    'yoda': (ctx) => commandExecutors['master yoda'](ctx),
    'master yoda': (ctx) => ({
        outputContent: yodaText,
        shouldAnimate: false,
        specialAction: () => {
            const app = document.querySelector('.app-container');
            if (app) {
                const flash = document.createElement('div');
                flash.style.position = 'fixed';
                flash.style.inset = '0';
                flash.style.boxShadow = 'inset 0 0 150px rgba(0,255,0,0.4)';
                flash.style.zIndex = '999999';
                flash.style.pointerEvents = 'none';
                flash.style.opacity = '1';
                flash.style.transition = 'opacity 2.5s ease-out';
                
                const forceText = document.createElement('div');
                forceText.textContent = 'FEEL THE FORCE';
                forceText.style.position = 'fixed';
                forceText.style.top = '50%';
                forceText.style.left = '50%';
                forceText.style.transform = 'translate(-50%, -50%)';
                forceText.style.color = 'rgba(0, 255, 0, 0.5)';
                forceText.style.fontSize = '4rem';
                forceText.style.fontFamily = 'monospace';
                forceText.style.zIndex = '999999';
                forceText.style.pointerEvents = 'none';
                forceText.style.opacity = '1';
                forceText.style.transition = 'opacity 2.5s ease-out';
                forceText.style.textShadow = '0 0 20px rgba(0, 255, 0, 0.8)';

                document.body.appendChild(flash);
                document.body.appendChild(forceText);
                ctx.playSound('yoda.mp3');

                setTimeout(() => {
                    flash.style.opacity = '0';
                    forceText.style.opacity = '0';
                    setTimeout(() => { 
                        if(document.body.contains(flash)) document.body.removeChild(flash);
                        if(document.body.contains(forceText)) document.body.removeChild(forceText);
                    }, 2500);
                }, 500);
            }
        }
    }),
    'vader': (ctx) => commandExecutors['darth vader'](ctx),
    'darth vader': (ctx) => {
        ctx.playSound('imperialmarch.mp3');
        return {
            outputContent: vaderText,
            shouldAnimate: false,
            specialAction: () => {
                const app = document.querySelector('.app-container');
                if (app) {
                    app.style.transition = 'transform 2s cubic-bezier(0.4, 0, 0.2, 1)';
                    app.style.transform = 'scale(0.9) translateY(20px)';
                    
                    const flash = document.createElement('div');
                    flash.style.position = 'fixed';
                    flash.style.inset = '0';
                    flash.style.boxShadow = 'inset 0 0 150px rgba(255,0,0,0.5)';
                    flash.style.zIndex = '999999';
                    flash.style.pointerEvents = 'none';
                    flash.style.opacity = '1';
                    flash.style.transition = 'opacity 2.5s ease-out';
                    document.body.appendChild(flash);

                    setTimeout(() => {
                        app.style.transition = 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
                        app.style.transform = '';
                        flash.style.opacity = '0';
                        setTimeout(() => { 
                            app.style.transition = ''; 
                            if(document.body.contains(flash)) document.body.removeChild(flash);
                        }, 400);
                    }, 2500);
                }
            }
        };
    },
    'r2d2': (ctx) => commandExecutors['r2-d2'](ctx),
    'r2-d2': (ctx) => {
        ctx.playSound('r2d2.mp3');
        return { outputContent: r2d2Text, shouldAnimate: false, specialAction: () => ctx.playSound('r2d2.mp3') };
    },
    'starwars': () => ({ outputContent: starWarsText, shouldAnimate: false }),
    'star wars': () => ({ outputContent: starWarsText, shouldAnimate: false }),
    'may the force': () => ({ outputContent: mayTheForceText, shouldAnimate: false }),
    'may the force be with you': () => ({ outputContent: mayTheForceText, shouldAnimate: false }),
    'totoro': () => ({ outputContent: totoroText, shouldAnimate: false }),
    'ghibli': () => ({ outputContent: ghibliText, shouldAnimate: false }),
    'studio ghibli': () => ({ outputContent: ghibliText, shouldAnimate: false }),
    'spirited': () => ({ outputContent: spiritedText, shouldAnimate: false }),
    'spirited away': () => ({ outputContent: spiritedText, shouldAnimate: false }),
    'chihiro': () => ({ outputContent: spiritedText, shouldAnimate: false }),
    'spiderman': (ctx) => commandExecutors['spider-man'](ctx),
    'spider-man': () => ({
        outputContent: spiderManText,
        shouldAnimate: false,
        specialAction: () => {
            const app = document.querySelector('.app-container');
            if (app) {
                app.style.transition = 'transform 0.08s';
                app.style.transform = 'scale(1.02) rotate(1.5deg)';
                
                const flash = document.createElement('div');
                flash.style.position = 'fixed';
                flash.style.inset = '0';
                flash.style.boxShadow = 'inset 0 0 80px rgba(255,0,0,0.6)';
                flash.style.zIndex = '999999';
                flash.style.pointerEvents = 'none';
                document.body.appendChild(flash);

                setTimeout(() => {
                    app.style.transform = 'scale(0.98) rotate(-1deg)';
                    flash.style.boxShadow = 'inset 0 0 80px rgba(0,100,255,0.6)';
                    setTimeout(() => {
                        app.style.transform = 'scale(1.01) rotate(0.5deg)';
                        flash.style.boxShadow = 'inset 0 0 80px rgba(255,0,0,0.6)';
                        setTimeout(() => {
                            app.style.transform = '';
                            flash.style.opacity = '0';
                            setTimeout(() => { 
                                app.style.transition = ''; 
                                if(document.body.contains(flash)) document.body.removeChild(flash);
                            }, 100);
                        }, 80);
                    }, 80);
                }, 80);
            }
        }
    }),
    'peter parker': (ctx) => commandExecutors['spider-man'](ctx),
    'miles morales': (ctx) => commandExecutors['spider-man'](ctx),
    'pascal': (ctx) => commandExecutors['camaleon'](ctx),
    'rapunzel': (ctx) => commandExecutors['camaleon'](ctx),
    'chameleon': (ctx) => commandExecutors['camaleon'](ctx),
    'camaleon': (ctx) => ({
        outputContent: pascalText,
        shouldAnimate: false,
        specialAction: () => {
            const themes = ['purple', 'amber'];
            let count = 0;
            const flashInterval = setInterval(() => {
                ctx.applyTheme(themes[Math.floor(Math.random() * themes.length)]);
                count++;
                if (count >= 5) {
                    clearInterval(flashInterval);
                    ctx.applyTheme('green');
                }
            }, 300);
        }
    }),
    'easter eggs': () => ({ outputContent: easterEggsText, shouldAnimate: false }),
    'eastereggs': () => ({ outputContent: easterEggsText, shouldAnimate: false }),
    'easteregg': () => ({ outputContent: easterEggsText, shouldAnimate: false }),
    'groot': (ctx) => { ctx.playSound('groot.mp3'); return { outputContent: grootText, shouldAnimate: false }; },
    'i am groot': (ctx) => commandExecutors['groot'](ctx),
    'guardians': (ctx) => { ctx.playSound('starlord.mp3'); return { outputContent: guardiansText, shouldAnimate: false }; },
    'guardians of the galaxy': (ctx) => commandExecutors['guardians'](ctx),
    'starlord': (ctx) => { ctx.playSound('starlord.mp3'); return { outputContent: starlordText, shouldAnimate: false, specialAction: () => ctx.playSound('starlord.mp3') }; },
    'star lord': (ctx) => commandExecutors['starlord'](ctx),
    'peter quill': (ctx) => commandExecutors['starlord'](ctx),
    'ironman': (ctx) => { ctx.playSound('ironman.mp3'); return { outputContent: ironmanText, shouldAnimate: false }; },
    'iron man': (ctx) => commandExecutors['ironman'](ctx),
    'tony stark': (ctx) => commandExecutors['ironman'](ctx),
    'astrofact': () => ({ outputContent: getRandomAstrofact(), shouldAnimate: false }),
    'gargantua': (ctx) => { ctx.playSound('gargantua.mp3'); return { outputContent: gargantuaText, shouldAnimate: false }; },
    'black hole': (ctx) => commandExecutors['gargantua'](ctx),
    'interstellar': (ctx) => commandExecutors['gargantua'](ctx),
    'cooper': (ctx) => commandExecutors['gargantua'](ctx),
    'cat': (ctx) => { ctx.playSound('meow.mp3'); return { outputContent: catText, shouldAnimate: false }; },
    'pato': (ctx) => { ctx.playSound('quack.mp3'); return { outputContent: patoText, shouldAnimate: false, specialAction: () => ctx.playSound('quack.mp3') }; },
    'duck': (ctx) => commandExecutors['pato'](ctx),
    'funfact': () => ({ outputContent: getRandomFunfact(), shouldAnimate: false }),
    'fun fact': () => ({ outputContent: getRandomFunfact(), shouldAnimate: false }),
    'teofetch': () => ({ outputContent: teofetchText, shouldAnimate: false }),
    'htop': () => ({ outputContent: htopText, shouldAnimate: false }),
    'top': () => ({ outputContent: htopText, shouldAnimate: false }),
    'lofi': (ctx) => {
        const isPlaying = ctx.toggleLoopingSound('lofi.mp3');
        return { outputContent: `<div>🎧 Lofi Hip Hop Radio - ${isPlaying ? '<span style="color:#0f0;">PLAYING</span>' : '<span style="color:#f00;">STOPPED</span>'}</div><br>`, shouldAnimate: false };
    },
    'rain': (ctx) => {
        const isPlaying = ctx.toggleLoopingSound('rain.mp3');
        return { outputContent: `<div>🌧️ Rain Simulator - ${isPlaying ? '<span style="color:#0f0;">PLAYING</span>' : '<span style="color:#f00;">STOPPED</span>'}</div><br>`, shouldAnimate: false };
    },
    'hack': (ctx) => ({
        outputContent: `<div style="color:#0f0;">Initiating override sequence...</div>`,
        shouldAnimate: false,
        specialAction: () => {
            let count = 0;
            const hackInterval = setInterval(() => {
                const randomHex = [...Array(40)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');
                ctx.setHistory(prev => [
                    ...prev, 
                    {
                        id: Date.now() + '-hack-' + count,
                        content: `<div style="color:var(--accent-color); opacity: 0.7;">[${count}] ${randomHex}</div>`,
                        type: 'output',
                        isAnimated: false
                    }
                ]);
                count++;
                
                if (count > 20) {
                    clearInterval(hackInterval);
                    setTimeout(() => {
                        ctx.setHistory(prev => [
                            ...prev,
                            {
                                id: Date.now() + '-hack-success',
                                content: `<div style="color:#ff5f56; font-size: 1.5rem; font-weight: bold; margin-top:10px;">> MAINFRAME ACCESS GRANTED</div><br>`,
                                type: 'output',
                                isAnimated: true
                            }
                        ]);
                        ctx.setIsTyping(true);
                    }, 500);
                }
            }, 50);
        }
    }),
    'snake': () => ({ outputContent: snakeText, shouldAnimate: false }),
    'history': (ctx) => {
        const histLines = ctx.commandHistory.map((c, i) => `  ${i + 1}  ${c}`).join('<br>');
        return { outputContent: `<div>${histLines || 'No history yet.'}</div><br>`, shouldAnimate: false };
    },
    'map': () => ({
        outputContent: `
<div style="width: 100%; height: 300px; border-radius: 8px; overflow: hidden; margin-top: 10px; box-shadow: 0 0 15px var(--accent-color);">
  <iframe width="100%" height="100%" frameborder="0" scrolling="no" marginheight="0" marginwidth="0" src="https://www.openstreetmap.org/export/embed.html?bbox=12.190000915527346%2C45.35000000000001%2C12.450000076293947%2C45.520000000000004&amp;layer=mapnik&amp;marker=45.4343%2C12.3388" style="background:#000; filter: invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%);"></iframe>
</div>
<br><div style="color:#aaa;">Location: Venice, Italy 🌍</div><br>`, shouldAnimate: false
    }),
    'tour': (ctx) => {
        ctx.setTourQueue(['whoami', 'experience', 'skills', 'projects', 'randomart']);
        return { 
            outputContent: `<div style="color:var(--accent-color);">Starting automated tour... 🎢 Keep your hands inside the vehicle!</div><br>`, 
            shouldAnimate: true
        };
    }
};

export const dynamicCommandExecutors = [
    {
        match: cmd => cmd.startsWith('open '),
        execute: (cmd) => {
            const target = cmd.replace('open ', '').trim();
            const links = {
                linkedin: 'https://linkedin.com/in/teo-clerici',
                github:   'https://github.com/teo-clerk',
                email:    'mailto:clerici.teo5@gmail.com',
            };
            if (links[target]) {
                const specialAction = () => window.open(links[target], '_blank');
                return { outputContent: `<div>🔗 Opening <strong>${target}</strong>...</div><br>`, shouldAnimate: false, specialAction };
            } else {
                return { outputContent: `<div>Unknown target: <em>${target}</em>. Try: <span class="command-highlight" data-cmd="open linkedin">linkedin</span>, <span class="command-highlight" data-cmd="open github">github</span>, <span class="command-highlight" data-cmd="open email">email</span></div><br>`, shouldAnimate: false };
            }
        }
    },
    {
        match: cmd => cmd.startsWith('theme '),
        execute: (cmd, ctx) => {
            const themeName = cmd.replace('theme ', '').trim();
            if (ctx.applyTheme(themeName)) {
                return { outputContent: `<div>🎨 Theme switched to <strong>${themeName}</strong>.</div><br>`, shouldAnimate: false };
            } else {
                return { outputContent: `<div>Unknown theme: <em>${themeName}</em>. Available: <span class="command-highlight" data-cmd="theme purple">purple</span>, <span class="command-highlight" data-cmd="theme green">green</span>, <span class="command-highlight" data-cmd="theme amber">amber</span></div><br>`, shouldAnimate: false };
            }
        }
    },
    {
        match: cmd => cmd.startsWith('sudo'),
        execute: () => ({ outputContent: `<div><span style="color:#ff5f56;">Permission denied</span>: you are not root.<br>With great power comes great responsibility — and you don't have <em>either</em> here.<br>Try <span class="command-highlight" data-cmd="contact">contact</span> if you want to talk.</div><br>`, shouldAnimate: false })
    },
    {
        match: cmd => cmd.startsWith('calc ') || cmd === 'calc',
        execute: (cmd) => {
            const expression = cmd.replace(/^calc\\s*/i, '').trim();
            if (!expression) {
                return { outputContent: `<div>Usage: <span class="command-highlight" data-cmd="calc 5 * 10">calc [math expression]</span></div><br>`, shouldAnimate: false };
            } else {
                try {
                    if (!/^[0-9+\-*/().\s]+$/.test(expression)) {
                        throw new Error('Invalid characters');
                    }
                    const result = new Function(`"use strict"; return (${expression})`)();
                    return { outputContent: `<div><span style="color:#aaa;">${expression} =</span> <strong>${result}</strong></div><br>`, shouldAnimate: false };
                } catch (e) {
                    return { outputContent: `<div style="color:#ff5f56;">Error evaluating expression. Usage: <span class="command-highlight" data-cmd="calc 5 * 4">calc [math]</span></div><br>`, shouldAnimate: false };
                }
            }
        }
    },
    {
        match: cmd => cmd.startsWith('ask ') || cmd === 'ask',
        execute: (cmd, ctx) => {
            const question = cmd.replace(/^ask\\s*/i, '').trim();
            if (!question) {
                return { outputContent: `<div>Please provide a question. Usage: <span class="command-highlight" data-cmd="ask who are you?">ask [your question]</span></div><br>`, shouldAnimate: false };
            } else {
                const thinkingId = Date.now() + '-thinking';
                ctx.newHistory.push({
                    id: thinkingId,
                    content: `<div style="color:#888;">Thinking...</div><br>`,
                    type: 'output',
                    isAnimated: false
                });
                
                ctx.setHistory([...ctx.newHistory]);
                ctx.setCommandHistory(prev => [...prev, cmd]);
                ctx.setHistoryIndex(ctx.commandHistory.length + 1);
                ctx.setInputVal('');
                ctx.setIsTyping(true);
                
                askGrok(question).then(reply => {
                    ctx.setHistory(current => current.map(item => 
                        item.id === thinkingId 
                            ? { ...item, content: `<div><span style="color:var(--accent-color);">■ Grok:</span> ${reply}</div><br>`, isAnimated: true } 
                            : item
                    ));
                    ctx.setIsTyping(true);
                });
                
                return { earlyReturn: true };
            }
        }
    },
    {
        match: cmd => cmd.startsWith('cowsay ') || cmd === 'cowsay',
        execute: (cmd) => {
            const msg = cmd.replace(/^cowsay\\s*/i, '').trim() || "Moo";
            const len = msg.length + 2;
            const top = " _" + "_".repeat(len) + "_ ";
            const bot = " -" + "-".repeat(len) + "- ";
            
            return {
                outputContent: `<pre class="ascii-art" style="color:#aaa; font-size: 0.8rem;">
${top}
< ${msg} >
${bot}
        \\   ^__^
         \\  (oo)\\_______
            (__)\\       )\\/\$
                ||----w |
                ||     ||</pre><br>`, shouldAnimate: false
            };
        }
    },
    {
        match: cmd => cmd.startsWith('weather') || cmd === 'weather',
        execute: (cmd, ctx) => {
            const city = cmd.replace(/^weather\\s*/i, '').trim();
            if (!city) {
                return { outputContent: `<div>Usage: <span class="command-highlight" data-cmd="weather venice">weather [city]</span></div><br>`, shouldAnimate: false };
            } else {
                const weatherId = Date.now() + '-weather';
                ctx.newHistory.push({
                    id: weatherId,
                    content: `<div style="color:#888;">Fetching weather for ${city}...</div><br>`,
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
                                ? { ...item, content: `<div style="color:#ddd;">☁️ ${text}</div><br>`, isAnimated: true } 
                                : item
                        ));
                        ctx.setIsTyping(true);
                    }).catch(() => {
                        ctx.setHistory(current => current.map(item => 
                            item.id === weatherId 
                                ? { ...item, content: `<div style="color:#ff5f56;">Failed to fetch weather for "${city}".</div><br>`, isAnimated: true } 
                                : item
                        ));
                        ctx.setIsTyping(true);
                    });
                return { earlyReturn: true };
            }
        }
    },
    {
        match: cmd => cmd.startsWith('volume') || cmd === 'volume',
        execute: (cmd, ctx) => {
            const val = cmd.replace(/^volume\\s*/i, '').trim();
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
        match: cmd => cmd.startsWith('lang ') || cmd === 'lang',
        execute: (cmd) => {
            const lang = cmd.replace(/^lang\\s*/i, '').trim().toLowerCase();
            if (!lang) {
                return { outputContent: `<div>Usage: <span class="command-highlight" data-cmd="lang es">lang [es/it/en/ca]</span></div><br>`, shouldAnimate: false };
            } else if (lang === 'en') {
                return { outputContent: `<div>English mode activated. (It already was!) 🇬🇧</div><br>`, shouldAnimate: false };
            } else if (lang === 'es') {
                return { outputContent: `<div>¡Modo español activado! (Traducción completa del CV en v3.0) 🇪🇸</div><br>`, shouldAnimate: false };
            } else if (lang === 'it') {
                return { outputContent: `<div>Modalità italiana attivata! (Traduzione completa del CV in v3.0) 🇮🇹</div><br>`, shouldAnimate: false };
            } else if (lang === 'ca') {
                return { outputContent: `<div>Mode català activat! (Traducció completa del CV a la v3.0) ✨</div><br>`, shouldAnimate: false };
            } else {
                return { outputContent: `<div>Language '${lang}' not fully supported yet. I speak English, Spanish, Italian, and Catalan!</div><br>`, shouldAnimate: false };
            }
        }
    }
];
