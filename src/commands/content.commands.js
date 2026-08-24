/**
 * CV content commands.
 *
 * These used to resolve through a `cvData[cmd]` fallback inside runCommand,
 * which meant they existed as commands without being registered anywhere —
 * invisible to Tab-completion unless someone remembered to add them to a
 * separate hand-maintained list. They are now ordinary registry entries whose
 * body happens to come from the content file.
 */
import { cvData } from '../data/cvData';

const fromCvData = (name, description) => ({
  name,
  description,
  category: 'cv',
  run: () => ({ outputContent: cvData[name] }),
});

export const contentCommands = [
  fromCvData('about', 'Professional summary'),
  fromCvData('education', 'Academic background'),
  fromCvData('experience', 'Work history'),
  fromCvData('projects', 'Initiatives &amp; Projects'),
  fromCvData('skills', 'Technical &amp; Soft skills'),
  fromCvData('certifications', 'Certificates &amp; Awards'),
  fromCvData('languages', 'Spoken languages'),
  fromCvData('interests', 'Personal interests'),
];
