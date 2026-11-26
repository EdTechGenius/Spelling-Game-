// British English text-to-speech using the device's built-in voices.
let voice = null;
const PREFERRED = ['Daniel', 'Serena', 'Kate', 'Arthur', 'Martha', 'Google UK English Female', 'Google UK English Male', 'Microsoft Libby', 'Microsoft Ryan', 'Microsoft Sonia'];

function pickVoice() {
  const voices = speechSynthesis.getVoices();
  const gb = voices.filter((v) => v.lang && v.lang.replace('_', '-').toLowerCase().startsWith('en-gb'));
  voice = PREFERRED.map((n) => gb.find((v) => v.name.includes(n))).find(Boolean) || gb[0] || voices.find((v) => v.lang?.startsWith('en')) || null;
}
if (window.speechSynthesis) {
  pickVoice();
  speechSynthesis.onvoiceschanged = pickVoice;
}

export function speak(text, { slow = false } = {}) {
  if (!window.speechSynthesis || !text) return Promise.resolve();
  speechSynthesis.cancel();
  return new Promise((resolve) => {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-GB';
    if (voice) u.voice = voice;
    u.rate = slow ? 0.6 : 0.9;
    u.onend = resolve; u.onerror = resolve;
    speechSynthesis.speak(u);
    setTimeout(resolve, 8000);
  });
}

import { info } from './data/details.js';

// Dictation style: word … sentence … word
export function dictate(item, opts = {}) {
  if (!item || !item.w) return Promise.resolve();
  const d = info(item.w);
  const parts = [item.w];
  if (item.hint) parts.push(item.hint.startsWith('plural') ? item.hint : `short for ${item.hint}`);
  if (d && d.sentence) parts.push(d.sentence);
  parts.push(item.w);
  return speak(parts.join('. … '), opts);
}
