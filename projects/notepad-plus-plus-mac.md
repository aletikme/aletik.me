---
title: Notepad++ for macOS
date: 2026-04-07
description: Native macOS verion of Notepad++ Source code and Text editor
tags: [macOS, open-source, code-editor]
---

![Notepad++ running on macOS](notepad-plus-plus-mac/npp_green.png)

Notepad++ has been one of the most popular source code editors on Windows for almost two decades, with close to 500 million downloads, it's loved by developers for its speed, simplicity, and extensive language support. I always wanted to have the same simple yet powerful editor on my Mac. For 4 months now, I have been using multiagent AI workflows and in mid-March 2026 I decided to take on the task of porting Notepad++ to macOS as a native application. The macOS version retains most that made the original great, which is syntax highlighting for 80+ programming languages, powerful regex-based search and replace, split view editing, macro recording, and a plugin ecosystem. I think that gradually it will be feeling right at home on the Mac. It runs on macOS 11 and later, launches instantly on Intel and M-series chips.


![Notepad++ running on macOS](notepad-plus-plus-mac/npp_screen03.png)


There are still quite a few quirks to iron out. Panels are still not dockable. There are not as many preferences compared to the Windows version. But there are a few cool things like SHIFT+COMMAND+P which opens spotlight search in Notepad++ macOS version. I also added a few  more languages to Notepad++ localization bringing it up to 137 from 94.   


![Notepad++ running on macOS](notepad-plus-plus-mac/npp_screen02.png)


Under the hood, Notepad++ for macOS is written in Objective-C++ using platform-native APIs and the [Scintilla](https://www.scintilla.org/) editing component, the same engine that powers the Windows version. This ensures high performance and a small footprint without relying on emulation layers or Electron wrappers. The project is open source under the [GNU General Public License](https://www.gnu.org/licenses/gpl-3.0.html), and plugin migration from the Windows ecosystem is ongoing. The editor also ships with support for 137 interface languages out of the box. You can download it and learn more at [notepad-plus-plus-mac.org](https://notepad-plus-plus-mac.org).


![Notepad++ running on macOS](notepad-plus-plus-mac/npp_screen01.png)

<div style="text-align: center; margin-top: 2rem;">
<a href="https://notepad-plus-plus-mac.org" target="_blank" rel="noopener noreferrer" style="display: inline-flex; align-items: center; gap: 0.5rem; background-color: #34C759; color: white; font-weight: 600; font-size: 1.1rem; padding: 0.85rem 2.2rem; border-radius: 999px; text-decoration: none; transition: background-color 0.2s;">
<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"/></svg>
Download for macOS
</a>
</div>
