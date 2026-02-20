/**
 * Shared application state
 */
export const state = {
  // Editor
  tabs: [],
  activeTabId: null,
  workspacePath: null,
  splitPanes: 1,

  // UI
  sidebarView: 'explorer',
  sidebarWidth: 260,
  sidebarVisible: true,
  panelVisible: true,
  panelTab: 'terminal',
  panelHeight: 200,
  zenMode: false,
  themeId: 'dark-modern',

  // Find
  findMatches: [],
  currentFindIndex: -1,

  // Git
  gitBranch: null,
  gitStatus: null,

  // Auto-save
  autoSaveDelay: 1000,
  autoSaveEnabled: false,

  // Run configuration
  runConfig: {
    entryPath: '',
    args: '',
    cwd: '',
    useWorkspaceCwd: true,
    lastResult: null,
  },
  runHistory: [],
};
