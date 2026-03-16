// ── Upgraded ASCII Art Pool ──────────────────────────────────────────────────
// Curated for terminal display. Monospace-optimised.

const pool = [

  // ⚡ Deathly Hallows (Harry Potter)
  {
    label: '⚡ The Deathly Hallows',
    art: [
      '          /\\',
      '         /  \\',
      '        /    \\',
      '       /  /\\  \\',
      '      /  /  \\  \\',
      '     /  / /\\ \\  \\',
      '    /  /_(  )_\\  \\',
      '   /______________\\',
      '         |  |',
      '        /    \\',
      '       ( (__) )',
      '        \\    /',
      '         |  |',
      '',
      ' "The last enemy that shall',
      '  be destroyed is death."',
    ].join('\n'),
  },

  // 🎩 Sorting Hat
  {
    label: '🎩 The Sorting Hat',
    art: [
      '       _...._',
      '     /       \\',
      "    / .-\"\"\"--. \\",
      "   | /  (o)(o) \\ |",
      "   | |   (){   | |",
      "   | |   ()    | |",
      "    \\ '._____.' /",
      "     '---------'",
      "      |  HAT  |",
      "      '-.___.‐'",
      '',
      ' "Not Slytherin... not yet."',
    ].join('\n'),
  },

  // ★ Darth Vader helmet
  {
    label: '★ Darth Vader',
    art: [
      '       .-------.',
      '      /  o   o  \\',
      '     | ___   ___ |',
      '     ||   | |   ||',
      '     ||   | |   ||',
      '     |  \\_____/  |',
      '      \\   ---   /',
      "       '-.___.‐'",
      '      /   | |   \\',
      '     / ###| |### \\',
      '    /_____|_|_____\\',
      '',
      ' "I find your lack of',
      '  git commit disturbing."',
    ].join('\n'),
  },

  // 🚀 Millennium Falcon — top-down silhouette
  {
    label: '🚀 Millennium Falcon',
    art: [
      '          .------.',
      '      .--/  .--. \\--.',
      '     / \\  ( CREW )  / \\',
      "    | o |  '----'  | o |",
      '    |   |__________|   |',
      "    '---'    |  |  '---'",
      '         .__|  |__.',
      '        /   |  |   \\',
      '       /  ==|  |==  \\',
      "       '--._______.--'",
      '',
      ' 12 parsecs. Roughly.',
    ].join('\n'),
  },

  // 🕷️ Spider-Man mask — detailed
  {
    label: '🕷️ Spider-Man',
    art: [
      '         .-"""""-.',
      '       /  -     -  \\',
      '      | ( \\   / ) |',
      '      |  (  \\_/  )  |',
      '      |   \\     /   |',
      "       \\   '---'   /",
      "        '._______.'",
      '      /\\/\\/\\/\\/\\/\\/',
      '',
      ' "With great power comes',
      '  great responsibility."',
    ].join('\n'),
  },

  // 🌿 Totoro — full body
  {
    label: '🌿 My Neighbor Totoro',
    art: [
      '     _____',
      '   (  o o  )',
      '  /   \\^/   \\',
      ' |  (  Y  )  |',
      ' |   )   (   |',
      ' |  /     \\  |',
      ' | | TO   | |',
      " | | TORO | |",
      "  \\ '-----' /",
      "   '-.___.‐'",
      "   /  | | \\",
      "  (___| |___)",
      '',
      ' "There is magic',
      '  in every forest."',
    ].join('\n'),
  },

  // 🔥 Howl's Moving Castle / Calcifer
  {
    label: '🔥 Calcifer — Howl\'s Moving Castle',
    art: [
      '    .   .',
      '   (>o o<)',
      '   |  ~  |',
      '    \\ | /',
      '    (   )',
      "   /     \\",
      '  | C A L |',
      '  | C I F |',
      '  | E R   |',
      "  '-.___.‐'",
      '',
      ' "I\'m a scary and powerful',
      '  fire demon!"',
    ].join('\n'),
  },

  // 🌀 Gargantua — Interstellar
  {
    label: '🌀 Gargantua (Interstellar)',
    art: [
      '      .-"""""".',
      "     / .':::::. \\",
      "    / '::::::::::' \\",
      "   | :: BLACK    :: |",
      "   | ::  HOLE    :: |",
      "   | :: (center) :: |",
      "    \\ '::::::::::' /",
      "     '. '::::::' .'",
      '      .----------.',
      '',
      ' "Mankind was born on Earth.',
      '  It was never meant to die here."',
    ].join('\n'),
  },

  // 📡 STAY — Interstellar tesseract
  {
    label: '📡 STAY — Tesseract',
    art: [
      '█████╗ ████████╗ █████╗ ██╗   ██╗',
      '██╔══╝ ╚══██╔══╝██╔══██╗╚██╗ ██╔╝',
      '████╗     ██║   ███████║ ╚████╔╝ ',
      '╚═══██╗   ██║   ██╔══██║  ╚██╔╝  ',
      '█████╔╝   ██║   ██║  ██║   ██║   ',
      '╚════╝    ╚═╝   ╚═╝  ╚═╝   ╚═╝   ',
      '',
      ' Cooper\'s message from the tesseract:',
      ' "Love transcends dimensions."',
    ].join('\n'),
  },

  // 🛡️ Avengers A
  {
    label: '🛡️ Avengers Assemble',
    art: [
      '         /\\',
      '        /  \\',
      '       / /\\ \\',
      '      / /--\\ \\',
      '     / /    \\ \\',
      '    / /  /\\  \\ \\',
      '   /_/__/__\\__\\_\\',
      '',
      '   A V E N G E R S',
      '    — E N D G A M E —',
      '',
      ' "Part of the journey is the end."',
    ].join('\n'),
  },

  // ♾️ Infinity Gauntlet
  {
    label: '♾️ Infinity Gauntlet',
    art: [
      '   .----------.',
      '   |  ⬡  ◆  ⬡  |',
      '   |  ◆  ⬡  ◆  |',
      '   |  ⬡  ◆  ⬡  |',
      '   |____________|',
      '    |  ||||   |',
      '    | ||||||  |',
      '    |  ||||   |',
      '     \\_______/',
      '',
      ' "Perfectly balanced,',
      '  as all things should be."',
    ].join('\n'),
  },

  // 🔭 Observatory / Astrophysics
  {
    label: '🔭 Observatory',
    art: [
      '    ★   .  ★   .   ★',
      '  .   ★    .  ✦   .  ★',
      ' ★  .   ✦    .   ★   .',
      '           ___',
      '          /   \\',
      '    ______\\   /______',
      '   |______|   |______|',
      '   |      \\   /      |',
      '   |       \\_/       |',
      '   |_________________|',
      '',
      ' "We are made of star stuff."',
      '  — Carl Sagan',
    ].join('\n'),
  },

];

export const getRandomArt = () => {
  const item = pool[Math.floor(Math.random() * pool.length)];
  return `<div style="margin:4px 0;"><span style="color:var(--accent-color); font-size:0.75rem; letter-spacing:0.05em;">${item.label}</span><pre class="ascii-art" style="font-size:0.78rem; margin-top:6px; color:#ccc; line-height:1.35;">${item.art}</pre></div><br>`;
};
