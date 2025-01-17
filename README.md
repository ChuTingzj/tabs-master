<p align="center"><a target="_blank" rel="noreferrer noopener"><img width="250" alt="Tabs Master's mascot" src="https://raw.githubusercontent.com/ChuTingzj/tabs-master/main/assets/icon.png"></a></p>
<p align="center">Tabs Master<strong> designed to manage</strong> browser tabs and aims to <strong>reduce the burden</strong> while using the browser.</p>
<br/>

<p align="center"><img alt="Chrome Web Store" src="https://img.shields.io/badge/Chrome-141e24.svg?&style=for-the-badge&logo=google-chrome&logoColor=white"> <img alt="Firefox Add-ons" src="https://img.shields.io/badge/Firefox-141e24.svg?&style=for-the-badge&logo=firefox-browser&logoColor=white"> <img alt="Apple App Store" src="https://img.shields.io/badge/Safari-141e24.svg?&style=for-the-badge&logo=safari&logoColor=white">  <img alt="Edge Addons" src="https://img.shields.io/badge/Edge-141e24.svg?&style=for-the-badge&logo=microsoft-edge&logoColor=white"> </p>

<h2 align="center">Tabs Master</h2>
<br/>
<p align="center">Tabs Master is an <strong>open-source</strong> MIT-licensed <strong>browser extension</strong> designed to manage the browser tabs.
<br/>
<br/>

## Features

- **Tab Groups & Tabs Search**: Create and manage tab groups to keep your tabs organized.
  - can use `Ctrl+Command+Z` to show the `group` and `search` component and use `Esc` to hide them
  - <img width="1742" alt="截屏2025-01-14 10 36 42" src="https://github.com/user-attachments/assets/8a2c7cea-46af-4d8e-a192-8002edf48a1a" />
- **Tab Switch**: Quickly search for tabs and switch between them.
  - can use `Alt` to show the `switch` component that display your recently used tabs, and use `Alt+Backquote` to switch between these tabs
  - <img width="1740" alt="截屏2025-01-14 10 51 35" src="https://github.com/user-attachments/assets/5a26d2ec-fce6-49c0-bbd1-b1825a94e1a7" />

## How to contribute

Just commit your changes to the `main` branch and submit a pull request.

## Building for use

Tabs Master build script requires a JavaScript runtime.

### Building with NodeJS

Tabs Master based on the top of [plasmo](https://github.com/PlasmoHQ/plasmo), it's a framework for building Chrome extensions with [React](https://reactjs.org/)

So you can directly follow the guide of the [plasmo](https://docs.plasmo.com/framework) to build this extension:

You can install the extension from a file.
Install [Node.js](https://nodejs.org/) (we recommend LTS or higher, but any version at or above 16 will work). Download the source code (or check out from git).
Open the terminal in the root folder and run:

- `pnpm install`
- `pnpm run build`

This will create a `build/chrome-mv3-prod.zip` file for use in a Chromium-based browser
