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
            window.open('/CV.pdf', '_blank', 'noopener');
        };
        const summary = `
<div class="whoami-card" style="border-left: 4px solid var(--accent-color);">
  <div style="color:var(--accent-color); font-weight:bold; font-size:1.2rem; margin-bottom:10px;">👋 Hi! I'm Teo Clerici Jurado - TL;DR Summary</div>
  <div style="margin-bottom: 12px; line-height: 1.5;">
    I'm an <strong>AI &amp; Data Science</strong> undergraduate (year 2 of 3, Year 1 average 77.8 %) at H-FARM College (University of Chichester, UK) who learns by building and shipping. My lead project is <strong>FloodFusion</strong>: flood maps from Sentinel-1 radar, scoring 0.419 IoU against 0.321 for the operational Copernicus GFM on the 34 Copernicus EMS floods it covers (descriptive; a pre-registered blind test is running). I also built <strong>MDlearn</strong> (spaced-repetition courses, on npm and as desktop apps), <strong>SciNet</strong> (an open-source 3D map of scientific papers) and <strong>LaCasitaOS</strong> (a co-living app with Stripe billing and an Android build).
  </div>
  <div style="margin-bottom: 12px; line-height: 1.5;">
    I hosted ESA's <strong>&ldquo;Space Isn't the Limit&rdquo;</strong> at H-FARM, mentor hackathons with the <strong>MIT Edgerton Center</strong>, am a <strong>Brand Ambassador</strong> for Audi We Generation (1 of 5 from 1,300+), and won <strong>1st place (team)</strong> at the EssilorLuxottica × Forbes Next Leaders Business Game. Building AI for Earth observation.
  </div>
  <div style="margin-bottom: 12px;">Start here: <span class="command-highlight" data-cmd="floodfusion">floodfusion</span> · <span class="command-highlight" data-cmd="projects">projects</span> · <span class="command-highlight" data-cmd="experience">experience</span></div>
  <div class="whoami-row"><span class="whoami-label">email</span><span class="whoami-value"><a href="mailto:clerici.teo5@gmail.com">clerici.teo5@gmail.com</a></span></div>
  <div class="whoami-row"><span class="whoami-label">linkedin</span><span class="whoami-value"><a href="https://linkedin.com/in/teo-clerici" target="_blank" rel="noopener noreferrer">linkedin.com/in/teo-clerici</a></span></div>
  <div class="whoami-row"><span class="whoami-label">github</span><span class="whoami-value"><a href="https://github.com/teo-clerk" target="_blank" rel="noopener noreferrer">github.com/teo-clerk</a></span></div>
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
            window.open('/CV.pdf', '_blank', 'noopener');
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
