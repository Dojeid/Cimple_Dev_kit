/**
 * Theme switching - Ctrl+K Ctrl+T
 */
import { state } from './state.js';

const themes = {
  'dark-modern': {
    '--primary': '#8257e5',
    '--background': '#0d0f17',
    '--sidebar-bg': '#090a0f',
    '--header-bg': '#11131f',
    '--footer-bg': '#1e1e2e',
    '--editor-bg': '#0d0f17',
    '--text': '#e0e0e0',
    '--text-muted': '#6272a4',
  },
  'solarized-dark': {
    '--primary': '#268bd2',
    '--background': '#002b36',
    '--sidebar-bg': '#073642',
    '--header-bg': '#073642',
    '--footer-bg': '#073642',
    '--editor-bg': '#002b36',
    '--text': '#839496',
    '--text-muted': '#586e75',
  },
  'abyss': {
    '--primary': '#0078d4',
    '--background': '#0c0c0c',
    '--sidebar-bg': '#0c0c0c',
    '--header-bg': '#1e1e1e',
    '--footer-bg': '#1e1e1e',
    '--editor-bg': '#0c0c0c',
    '--text': '#cccccc',
    '--text-muted': '#808080',
  },
  'light-modern': {
    '--primary': '#0078d4',
    '--background': '#ffffff',
    '--sidebar-bg': '#f3f3f3',
    '--header-bg': '#f3f3f3',
    '--footer-bg': '#007acc',
    '--editor-bg': '#ffffff',
    '--text': '#333333',
    '--text-muted': '#6e6e6e',
  },
};

export function apply(themeId) {
  const theme = themes[themeId];
  if (!theme) return;
  state.themeId = themeId;
  const root = document.documentElement;
  for (const [key, val] of Object.entries(theme)) {
    root.style.setProperty(key, val);
  }
}

export function getCurrentTheme() {
  return state.themeId;
}
