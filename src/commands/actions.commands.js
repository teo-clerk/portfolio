/**
 * Commands that perform an action (download, mail, external links).
 *
 * Each entry is a self-describing Command (see ./types.js). The registry
 * derives `commandsList` (Tab-completion, the `commands` listing) and
 * `helpText` from these objects, so adding a command here is the only edit
 * needed — there is no parallel list to keep in sync.
 */
import {
  emailText
} from '../data/cvData';

export const actionCommands = [
  {
    name: "recruiter",
    description: "Get the quick summary &amp; CV",
    category: "actions",
    run: () => {
        const specialAction = () => {
            window.open('/CV.pdf', '_blank');
        };
        const summary = `
<div class="whoami-card" style="border-left: 4px solid var(--accent-color);">
  <div style="color:var(--accent-color); font-weight:bold; font-size:1.2rem; margin-bottom:10px;">👋 Hi! I'm Teo Clerici Jurado - TL;DR Summary</div>
  <div style="margin-bottom: 12px; line-height: 1.5;">
    I'm an <strong>AI &amp; Data Science Student</strong> at H-Farm Campus (University of Chichester, UK in partnership with Microsoft), a <strong>Junior Consultant</strong> at Lumina Consulting Agency, a <strong>Brand Ambassador</strong> for Audi We Generation, and an <strong>Educational Mentor</strong> at MIT Edgerton Center. Passionate about AI, data, and building human-centered solutions.
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
  },
  {
    name: "download",
    description: "Download my CV (PDF)",
    category: "actions",
    run: () => {
        const specialAction = () => {
            window.open('/CV.pdf', '_blank');
        };
        return { outputContent: `<div>📄 Downloading <strong>Teo_Clerici_CV.pdf</strong>...</div><br>`, shouldAnimate: false, specialAction };
    },
  },
  {
    name: "email",
    description: "Send me an email",
    category: "actions",
    run: () => ({
        outputContent: emailText,
        shouldAnimate: false,
        specialAction: () => setTimeout(() => window.location.href = 'mailto:clerici.teo5@gmail.com', 1000)
    }),
  },
  {
    name: "cv",
    aliases: ["plain", "a11y"],
    description: "Open the plain-text CV page",
    category: "actions",
    run: () => ({
      outputContent: `<div>Opening the <a href="/cv">plain-text CV</a> — a static, screen-reader friendly version of everything in this terminal.</div><br>`,
      shouldAnimate: false,
      specialAction: () => window.open('/cv', '_blank', 'noopener'),
    }),
  },
];
