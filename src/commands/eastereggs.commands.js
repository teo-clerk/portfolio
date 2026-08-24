/**
 * Hidden easter eggs. These carry no description, so they never appear in `help`.
 *
 * Each entry is a self-describing Command (see ./types.js). The registry
 * derives `commandsList` (Tab-completion, the `commands` listing) and
 * `helpText` from these objects, so adding a command here is the only edit
 * needed — there is no parallel list to keep in sync.
 */
import {
  tarsText,
  accioText,
  avengersText,
  expectoText,
  wingardiumText,
  yodaText,
  vaderText,
  r2d2Text,
  starWarsText,
  mayTheForceText,
  totoroText,
  ghibliText,
  spiritedText,
  spiderManText,
  getRandomFunfact,
  pascalText,
  easterEggsText,
  grootText,
  ironmanText,
  catText,
  patoText,
  getRandomAstrofact,
  guardiansText,
  starlordText,
  htopText,
  gargantuaText,
} from '../data/cvData';
import { runNamed } from './derived';

export const eastereggCommands = [
  {
    name: "exit",
    category: "egg",
    run: () => ({ outputContent: `<div>This is a browser. There's no escape. Try <span class="command-highlight" data-cmd="clear">clear</span> instead.</div><br>`, shouldAnimate: false }),
  },
  {
    name: "quit",
    aliasOf: "exit",
    category: "egg",
    run: () => ({ outputContent: `<div>This is a browser. There's no escape. Try <span class="command-highlight" data-cmd="clear">clear</span> instead.</div><br>`, shouldAnimate: false }),
  },
  {
    name: "ls -la",
    aliasOf: "ls",
    category: "egg",
    run: () => ({ outputContent: `<div class="ascii-art" style="font-size:0.85rem;">drwxr-xr-x  about/\ndrwxr-xr-x  education/\ndrwxr-xr-x  experience/\ndrwxr-xr-x  projects/\ndrwxr-xr-x  skills/\ndrwxr-xr-x  contact/\n-rw-r--r--  CV.pdf\n-rwxr-xr-x  game*</div><br>`, shouldAnimate: false }),
  },
  {
    name: "pwd",
    category: "egg",
    run: () => ({ outputContent: `<div>/home/visitor/teoclerici</div><br>`, shouldAnimate: false }),
  },
  {
    name: "date",
    category: "egg",
    run: () => ({ outputContent: `<div>${new Date().toUTCString()}</div><br>`, shouldAnimate: false }),
  },
  {
    name: "tars",
    category: "egg",
    run: () => ({ outputContent: tarsText, shouldAnimate: false }),
  },
  {
    name: "accio",
    category: "egg",
    run: (ctx) => runNamed('accio cv', ctx),
  },
  {
    name: "accio cv",
    aliasOf: "accio",
    category: "egg",
    run: () => ({
        outputContent: accioText,
        shouldAnimate: false,
        specialAction: () => {
            window.open('/CV.pdf', '_blank');
        }
    }),
  },
  {
    name: "accio resume",
    aliasOf: "accio",
    category: "egg",
    run: (ctx) => runNamed('accio cv', ctx),
  },
  {
    name: "avengers",
    category: "egg",
    run: () => ({ outputContent: avengersText, shouldAnimate: false }),
  },
  {
    name: "avengers assemble",
    aliasOf: "avengers",
    category: "egg",
    run: () => ({ outputContent: avengersText, shouldAnimate: false }),
  },
  {
    name: "expecto",
    category: "egg",
    run: (ctx) => runNamed('expecto patronum', ctx),
  },
  {
    name: "expecto patronum",
    aliasOf: "expecto",
    category: "egg",
    run: () => ({
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
  },
  {
    name: "wingardium",
    category: "egg",
    run: (ctx) => runNamed('wingardium leviosa', ctx),
  },
  {
    name: "wingardium leviosa",
    aliasOf: "wingardium",
    category: "egg",
    run: () => ({
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
  },
  {
    name: "yoda",
    category: "egg",
    run: (ctx) => runNamed('master yoda', ctx),
  },
  {
    name: "master yoda",
    aliasOf: "yoda",
    category: "egg",
    run: (ctx) => ({
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
  },
  {
    name: "vader",
    category: "egg",
    run: (ctx) => runNamed('darth vader', ctx),
  },
  {
    name: "darth vader",
    aliasOf: "vader",
    category: "egg",
    run: (ctx) => {
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
  },
  {
    name: "r2d2",
    category: "egg",
    run: (ctx) => runNamed('r2-d2', ctx),
  },
  {
    name: "r2-d2",
    aliasOf: "r2d2",
    category: "egg",
    run: (ctx) => {
        ctx.playSound('r2d2.mp3');
        return { outputContent: r2d2Text, shouldAnimate: false, specialAction: () => ctx.playSound('r2d2.mp3') };
    },
  },
  {
    name: "starwars",
    category: "egg",
    run: () => ({ outputContent: starWarsText, shouldAnimate: false }),
  },
  {
    name: "star wars",
    aliasOf: "starwars",
    category: "egg",
    run: () => ({ outputContent: starWarsText, shouldAnimate: false }),
  },
  {
    name: "may the force",
    category: "egg",
    run: () => ({ outputContent: mayTheForceText, shouldAnimate: false }),
  },
  {
    name: "may the force be with you",
    aliasOf: "may the force",
    category: "egg",
    run: () => ({ outputContent: mayTheForceText, shouldAnimate: false }),
  },
  {
    name: "totoro",
    category: "egg",
    run: () => ({ outputContent: totoroText, shouldAnimate: false }),
  },
  {
    name: "ghibli",
    category: "egg",
    run: () => ({ outputContent: ghibliText, shouldAnimate: false }),
  },
  {
    name: "studio ghibli",
    aliasOf: "ghibli",
    category: "egg",
    run: () => ({ outputContent: ghibliText, shouldAnimate: false }),
  },
  {
    name: "spirited",
    category: "egg",
    run: () => ({ outputContent: spiritedText, shouldAnimate: false }),
  },
  {
    name: "spirited away",
    aliasOf: "spirited",
    category: "egg",
    run: () => ({ outputContent: spiritedText, shouldAnimate: false }),
  },
  {
    name: "chihiro",
    aliasOf: "spirited",
    category: "egg",
    run: () => ({ outputContent: spiritedText, shouldAnimate: false }),
  },
  {
    name: "spiderman",
    category: "egg",
    run: (ctx) => runNamed('spider-man', ctx),
  },
  {
    name: "spider-man",
    aliasOf: "spiderman",
    category: "egg",
    run: () => ({
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
  },
  {
    name: "peter parker",
    aliasOf: "spiderman",
    category: "egg",
    run: (ctx) => runNamed('spider-man', ctx),
  },
  {
    name: "miles morales",
    aliasOf: "spiderman",
    category: "egg",
    run: (ctx) => runNamed('spider-man', ctx),
  },
  {
    name: "pascal",
    aliasOf: "chameleon",
    category: "egg",
    run: (ctx) => runNamed('camaleon', ctx),
  },
  {
    name: "rapunzel",
    aliasOf: "chameleon",
    category: "egg",
    run: (ctx) => runNamed('camaleon', ctx),
  },
  {
    name: "chameleon",
    category: "egg",
    run: (ctx) => runNamed('camaleon', ctx),
  },
  {
    name: "camaleon",
    aliasOf: "chameleon",
    category: "egg",
    run: (ctx) => ({
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
  },
  {
    name: "easter eggs",
    category: "egg",
    run: () => ({ outputContent: easterEggsText, shouldAnimate: false }),
  },
  {
    name: "eastereggs",
    aliasOf: "easter eggs",
    category: "egg",
    run: () => ({ outputContent: easterEggsText, shouldAnimate: false }),
  },
  {
    name: "easteregg",
    aliasOf: "easter eggs",
    category: "egg",
    run: () => ({ outputContent: easterEggsText, shouldAnimate: false }),
  },
  {
    name: "groot",
    category: "egg",
    run: (ctx) => { ctx.playSound('groot.mp3'); return { outputContent: grootText, shouldAnimate: false }; },
  },
  {
    name: "i am groot",
    aliasOf: "groot",
    category: "egg",
    run: (ctx) => runNamed('groot', ctx),
  },
  {
    name: "guardians",
    category: "egg",
    run: (ctx) => { ctx.playSound('starlord.mp3'); return { outputContent: guardiansText, shouldAnimate: false }; },
  },
  {
    name: "guardians of the galaxy",
    aliasOf: "guardians",
    category: "egg",
    run: (ctx) => runNamed('guardians', ctx),
  },
  {
    name: "starlord",
    category: "egg",
    run: (ctx) => { ctx.playSound('starlord.mp3'); return { outputContent: starlordText, shouldAnimate: false, specialAction: () => ctx.playSound('starlord.mp3') }; },
  },
  {
    name: "star lord",
    aliasOf: "starlord",
    category: "egg",
    run: (ctx) => runNamed('starlord', ctx),
  },
  {
    name: "peter quill",
    aliasOf: "starlord",
    category: "egg",
    run: (ctx) => runNamed('starlord', ctx),
  },
  {
    name: "ironman",
    category: "egg",
    run: (ctx) => { ctx.playSound('ironman.mp3'); return { outputContent: ironmanText, shouldAnimate: false }; },
  },
  {
    name: "iron man",
    aliasOf: "ironman",
    category: "egg",
    run: (ctx) => runNamed('ironman', ctx),
  },
  {
    name: "tony stark",
    aliasOf: "ironman",
    category: "egg",
    run: (ctx) => runNamed('ironman', ctx),
  },
  {
    name: "astrofact",
    category: "egg",
    run: () => ({ outputContent: getRandomAstrofact(), shouldAnimate: false }),
  },
  {
    name: "gargantua",
    category: "egg",
    run: (ctx) => { ctx.playSound('gargantua.mp3'); return { outputContent: gargantuaText, shouldAnimate: false }; },
  },
  {
    name: "black hole",
    aliasOf: "gargantua",
    category: "egg",
    run: (ctx) => runNamed('gargantua', ctx),
  },
  {
    name: "interstellar",
    category: "egg",
    run: (ctx) => runNamed('gargantua', ctx),
  },
  {
    name: "cooper",
    aliasOf: "interstellar",
    category: "egg",
    run: (ctx) => runNamed('gargantua', ctx),
  },
  {
    name: "cat",
    category: "egg",
    run: (ctx) => { ctx.playSound('meow.mp3'); return { outputContent: catText, shouldAnimate: false }; },
  },
  {
    name: "pato",
    category: "egg",
    run: (ctx) => { ctx.playSound('quack.mp3'); return { outputContent: patoText, shouldAnimate: false, specialAction: () => ctx.playSound('quack.mp3') }; },
  },
  {
    name: "duck",
    aliasOf: "pato",
    category: "egg",
    run: (ctx) => runNamed('pato', ctx),
  },
  {
    name: "funfact",
    category: "egg",
    run: () => ({ outputContent: getRandomFunfact(), shouldAnimate: false }),
  },
  {
    name: "fun fact",
    aliasOf: "funfact",
    category: "egg",
    run: () => ({ outputContent: getRandomFunfact(), shouldAnimate: false }),
  },
  {
    name: "top",
    aliasOf: "htop",
    category: "egg",
    run: () => ({ outputContent: htopText, shouldAnimate: false }),
  },
  {
    name: "hack",
    category: "egg",
    run: (ctx) => ({
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
  }
];
