<p align="center"><a target="_blank" rel="noreferrer noopener"><img width="250" alt="Tabs Master 的吉祥物" src="https://raw.githubusercontent.com/ChuTingzj/tabs-master/main/assets/icon.png"></a></p> <p align="center">Tabs Master 是一款<strong>专注于管理浏览器标签页</strong>的扩展程序，旨在<strong>减轻用户使用浏览器时的负担</strong>。</p> <br/><p align="center"><img alt="Chrome 网上应用商店" src="https://img.shields.io/badge/Chrome-141e24.svg?&style=for-the-badge&logo=google-chrome&logoColor=white"> <img alt="Firefox 扩展" src="https://img.shields.io/badge/Firefox-141e24.svg?&style=for-the-badge&logo=firefox-browser&logoColor=white"> <img alt="Safari 扩展" src="https://img.shields.io/badge/Safari-141e24.svg?&style=for-the-badge&logo=safari&logoColor=white"> <img alt="Edge 扩展" src="https://img.shields.io/badge/Edge-141e24.svg?&style=for-the-badge&logo=microsoft-edge&logoColor=white"> </p><h2 align="center">Tabs Master</h2> <br/> <p align="center">Tabs Master 是一款<strong>开源</strong>的 MIT 许可<strong>浏览器扩展</strong>，专为高效管理浏览器标签页而设计。 <br/> <br/><p align="center"> 简体中文 | <a href="/README.md">English</a> </p>

## 功能特性

**标签组与搜索管理**：创建和管理标签组，保持标签页井井有条

- 使用快捷键 Ctrl+Command+Z 呼出标签组和搜索面板，按 Esc 键关闭
- <img width="1742" alt="截屏2025-01-14 10 36 42" src="https://github.com/user-attachments/assets/8a2c7cea-46af-4d8e-a192-8002edf48a1a" />

   ![image](https://github.com/user-attachments/assets/fa4c74f3-602e-42f6-89d2-d4cc24a39690)

**快速切换标签页**：快速搜索并切换已打开的标签页

- 使用 Alt 键呼出最近使用的标签页列表，通过 Alt+反引号 键在这些标签页间循环切换
- <img width="1740" alt="截屏2025-01-14 10 51 35" src="https://github.com/user-attachments/assets/5a26d2ec-fce6-49c0-bbd1-b1825a94e1a7" />

**智能标签清理**：一键清理冗余标签页，支持自定义清理策略

- ![image](https://github.com/user-attachments/assets/9a367281-689c-4c5a-8d63-acd035547471)
  ![image](https://github.com/user-attachments/assets/dee95c7c-1cbd-4750-810a-b6d7e95d22f6)

## 如何贡献

直接向 main 分支提交修改并创建 Pull Request 即可。

## 构建指南

本项目构建需要 JavaScript 运行时环境。

### 使用 NodeJS 构建

Tabs Master 基于 Plasmo 框架开发，该框架使用 React 构建 Chrome 扩展。

可以直接按照 Plasmo 官方文档 的指引进行构建：

安装 Node.js（建议 LTS 或更高版本，16 及以上版本均可）

下载源代码（或通过 Git 克隆仓库）

在项目根目录打开终端并执行：

- `pnpm install`
- `pnpm run build`

构建完成后，会在 build/chrome-mv3-prod.zip 生成适用于 Chromium 内核浏览器的扩展安装包。
