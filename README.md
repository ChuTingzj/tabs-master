<p align="center"><a target="_blank" rel="noreferrer noopener"><img width="250" alt="Tabs Master's mascot" src="https://raw.githubusercontent.com/ChuTingzj/tabs-master/main/assets/icon.png"></a></p>
<p align="center">Tabs Master<strong> designed to manage</strong> browser tabs and aims to <strong>reduce the burden</strong> while browsing the web.</p>
<br/>
<p align="center"><a rel="noreferrer noopener"><img alt="Chrome Web Store" src="https://img.shields.io/badge/Chrome-141e24.svg?&style=for-the-badge&logo=google-chrome&logoColor=white"></a>

<h2 align="center">Tabs Master</h2>
<br/>
<p align="center">Tabs Master is an <strong>open-source</strong> MIT-licensed <strong>browser extension</strong> designed to manage the browser tabs.
<br/>
<br/>

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
