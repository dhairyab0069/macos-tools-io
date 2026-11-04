/* Sample data for the two recreations. Everything here is made up for the demo: no package
   manager is run, no file is read. Names of real tools are used only so the lists look familiar. */
(function (root) {
  "use strict";
  var DATA = {
    repos: {
      depdeck: "https://github.com/dhairyab0069/DepDeck",
      shell: "https://github.com/dhairyab0069/desktop-shell-mac",
      himawari: "https://dhairyab0069.github.io/himawari-io/",
      author: "https://dhairyab0069.github.io/"
    },

    /* ---------- DepDeck ---------- */
    managers: {
      brew: { label: "Homebrew", color: "#e8821a" },
      npm: { label: "npm", color: "#d6403a" },
      cargo: { label: "cargo", color: "#9b6b3f" }
    },
    // fields mirror the app's Package model
    packages: [
      { manager: "brew", name: "ffmpeg", description: "Play, record, convert, and stream audio and video", installed: "7.0.1", latest: "7.1", outdated: true },
      { manager: "brew", name: "gh", description: "GitHub command-line tool", installed: "2.60.0", latest: "2.60.0" },
      { manager: "brew", name: "jq", description: "Lightweight and flexible command-line JSON processor", installed: "1.7.1", latest: "1.7.1" },
      { manager: "brew", name: "node", description: "Platform built on V8 to build network applications", installed: "22.9.0", latest: "22.11.0", outdated: true },
      { manager: "brew", name: "ripgrep", description: "Search tool like grep and The Silver Searcher", installed: "14.1.0", latest: "14.1.1", outdated: true },
      { manager: "brew", name: "tree", description: "Display directories as trees (with optional color/HTML output)", installed: "2.1.3", latest: "2.1.3" },
      { manager: "brew", name: "wget", description: "Internet file retriever", installed: "1.24.5", latest: "1.24.5" },
      { manager: "brew", name: "youtube-dl", description: "Download videos from YouTube.com and other sites", installed: "0.2021.12.17", latest: "0.2021.12.17",
        deprecated: true, reason: "Sample reason: upstream is no longer maintained", replacement: "yt-dlp" },
      { manager: "brew", name: "legacy-lib", description: "A library the sample data keeps around to show a disabled formula", installed: "2.3.1", latest: "2.3.1",
        disabled: true, reason: "Sample reason: no longer builds on current macOS" },
      { manager: "npm", name: "typescript", installed: "5.4.5", latest: "5.6.3", outdated: true },
      { manager: "npm", name: "prettier", installed: "3.3.3", latest: "3.3.3" },
      { manager: "npm", name: "request", installed: "2.88.2", latest: "2.88.2", deprecated: true, reason: "request has been deprecated (sample text)" },
      { manager: "cargo", name: "bat", installed: "0.24.0", latest: "0.25.0", outdated: true },
      { manager: "cargo", name: "eza", installed: "0.20.0", latest: "0.20.0" },
      { manager: "cargo", name: "hyperfine", installed: "1.19.0", latest: "1.19.0" }
    ],
    // what "Search" can find in the recreation (the real app asks brew search and cargo search)
    catalog: [
      { manager: "brew", name: "fd" }, { manager: "brew", name: "fzf" }, { manager: "brew", name: "htop" },
      { manager: "brew", name: "ripgrep-all" }, { manager: "brew", name: "yt-dlp" }, { manager: "brew", name: "zoxide" },
      { manager: "brew", name: "tmux" }, { manager: "brew", name: "neovim" }, { manager: "brew", name: "wget" },
      { manager: "cargo", name: "ripgrep" }, { manager: "cargo", name: "fd-find" }, { manager: "cargo", name: "tokei" },
      { manager: "cargo", name: "zoxide" }, { manager: "cargo", name: "bottom" }, { manager: "cargo", name: "eza" }
    ],
    intervals: [
      { hours: 1, label: "1 hour" }, { hours: 3, label: "3 hours" }, { hours: 6, label: "6 hours" },
      { hours: 12, label: "12 hours" }, { hours: 24, label: "Daily" }
    ],

    /* ---------- Desktop Shell ---------- */
    user: "Your Name",
    // Start menu: default pins (Ghostty, browser, Finder, VS Code, Calendar, Notes, Music, Activity Monitor)
    apps: [
      { id: "ghostty", name: "Ghostty", glyph: "terminal", kind: "terminal" },
      { id: "browser", name: "Browser", glyph: "globe", kind: "browser" },
      { id: "finder", name: "Finder", glyph: "folder", kind: "finder" },
      { id: "code", name: "Visual Studio Code", glyph: "code", kind: "text" },
      { id: "calendar", name: "Calendar", glyph: "calendar", kind: "calendar" },
      { id: "notes", name: "Notes", glyph: "note", kind: "text" },
      { id: "music", name: "Music", glyph: "music", kind: "text" },
      { id: "activity", name: "Activity Monitor", glyph: "chart", kind: "text" },
      { id: "preview", name: "Preview", glyph: "image", kind: "text" },
      { id: "textedit", name: "TextEdit", glyph: "note", kind: "text" },
      { id: "sysinfo", name: "System Information", glyph: "chart", kind: "text" }
    ],
    defaultPinned: ["ghostty", "browser", "finder", "code", "calendar", "notes", "music", "activity"],
    quickLaunch: ["finder", "browser", "ghostty"],
    places: [
      { id: "documents", title: "My Documents", glyph: "folder" }, { id: "pictures", title: "My Pictures", glyph: "image" },
      { id: "music", title: "My Music", glyph: "music" }, { id: "downloads", title: "Downloads", glyph: "download" },
      { id: "desktop", title: "Desktop", glyph: "desktop" }, { id: "computer", title: "My Computer", glyph: "computer" }
    ],
    recentDocuments: ["thesis-draft.pdf", "budget.xlsx", "holiday-photo.png", "notes.txt"],
    files: [ // what "Spotlight" finds for the Start search in the recreation
      "thesis-draft.pdf", "thesis-figures.zip", "budget.xlsx", "holiday-photo.png", "notes.txt", "todo.md",
      "main.swift", "Package.swift", "song-demo.mp3", "screen-recording.mov"
    ],
    downloads: [ // newest first, like the Downloads window
      { name: "Sample-Installer.dmg", when: "Today 3:04 AM", size: "48.2 MB", type: "dmg" },
      { name: "boarding-pass.pdf", when: "Today 1:12 AM", size: "212 KB", type: "pdf" },
      { name: "screenshot-2.png", when: "Yesterday 6:40 PM", size: "1.2 MB", type: "png" },
      { name: "dataset.csv", when: "Yesterday 11:05 AM", size: "3.9 MB", type: "csv" },
      { name: "icons.zip", when: "Mon 9:30 AM", size: "5.5 MB", type: "zip" }
    ],
    // Desktop Settings menu, in the app's order. key = Settings property
    settingsMenu: [
      { key: "showTaskbar", label: "Windows XP Taskbar (replaces the Dock)" },
      { key: "ghosttyHotkey", label: "⌘⌃T Opens Ghostty" },
      { key: "optionOpensStart", label: "Tap ⌥ Option Opens Start" },
      "-",
      { key: "showFolders", label: "Desktop Folders" },
      { key: "foldersIncludeDownloads", label: "Include Downloads in Folders", needs: "showFolders" },
      { key: "hideFinderIcons", label: "Hide Finder Desktop Icons" },
      "-",
      { key: "showWidgets", label: "Desktop Widgets" },
      { key: "showNowPlaying", label: "Now Playing Widget (Apple Music)", needs: "showWidgets" },
      { key: "youtubeLoops", label: "YouTube Loop When No Motion Artwork", needs: "showNowPlaying" },
      { key: "edge", label: "Dock Widgets To" },
      "-",
      { key: "keepWindowsClear", label: "Keep Windows Clear (tiling)" }
    ],
    settingsDefaults: {
      showTaskbar: true, ghosttyHotkey: true, optionOpensStart: true, showFolders: true,
      foldersIncludeDownloads: false, hideFinderIcons: false, showWidgets: true, showNowPlaying: true,
      youtubeLoops: true, edge: "Right", keepWindowsClear: true
    },
    edges: ["Right", "Left", "Top", "Bottom"],
    services: ["taskbar", "folders", "widgets", "hotkeys"],
    // iOS-style desktop folders: real folders plus loose files grouped by type
    folders: [
      { id: "documents", title: "Documents", color: "#5b8def", items: [
        { name: "thesis-draft.pdf", type: "doc" }, { name: "budget.xlsx", type: "doc" }, { name: "notes.txt", type: "doc" },
        { name: "Taxes", type: "folder", items: [{ name: "2024.pdf", type: "doc" }, { name: "receipts.zip", type: "zip" }] },
        { name: "cv.pdf", type: "doc" }, { name: "letter.docx", type: "doc" }] },
      { id: "projects", title: "Projects", color: "#37b26c", items: [
        { name: "DepDeck", type: "folder", items: [{ name: "Package.swift", type: "code" }, { name: "README.md", type: "doc" }, { name: "Store.swift", type: "code" }] },
        { name: "desktop-shell-mac", type: "folder", items: [{ name: "build.sh", type: "code" }, { name: "install.sh", type: "code" }] },
        { name: "scratch.py", type: "code" }, { name: "main.swift", type: "code" }] },
      { id: "images", title: "Images", color: "#e0773c", loose: true, items: [
        { name: "holiday-photo.png", type: "image" }, { name: "screenshot-1.png", type: "image" }, { name: "wallpaper.jpg", type: "image" },
        { name: "logo.svg", type: "image" }] },
      { id: "music", title: "Music", color: "#b05cd6", loose: true, items: [
        { name: "song-demo.mp3", type: "music" }, { name: "voice-memo.m4a", type: "music" }] }
    ],
    nowPlaying: { title: "Sample Song", artist: "Sample Artist", album: "Made-up Album", length: 214 },
    storage: { totalGB: 512, freeGB: 187 }
  };
  if (typeof module !== "undefined" && module.exports) module.exports = DATA; else root.MT_DATA = DATA;
})(typeof window !== "undefined" ? window : globalThis);
