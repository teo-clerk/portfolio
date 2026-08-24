/**
 * CV and identity commands.
 *
 * Each entry is a self-describing Command (see ./types.js). The registry
 * derives `commandsList` (Tab-completion, the `commands` listing) and
 * `helpText` from these objects, so adding a command here is the only edit
 * needed — there is no parallel list to keep in sync.
 */
import {
  whoamiText
} from '../data/cvData';

export const cvCommands = [
  {
    name: "whoami",
    description: "Quick identity card",
    category: "cv",
    run: () => ({ outputContent: whoamiText }),
  },
  {
    name: "contact",
    description: "Contact information",
    category: "cv",
    run: () => ({
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
  }
];
