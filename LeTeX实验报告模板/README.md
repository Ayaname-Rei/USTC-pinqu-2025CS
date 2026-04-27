# LaTeX 模板与部署方法

这是一份从学长那里继承来的排版格式，个人感觉很好看。使用时可以将`.tex`文件拷贝到本地，按照下面的方法部署即可得到这里的`.pdf`文件。

---

## 本地部署

### Windows

建议使用 [MiKTeX](https://miktex.org/download) 或 [TeX Live](https://www.tug.org/texlive/)，下载安装后需要将对应程序的 `bin` 目录添加到系统的 PATH 环境变量中（同 VS Code 配置 `Mingw-w64`）。

### macOS

建议使用 [MacTeX](https://www.tug.org/mactex/)，下载后双击安装即可。

### Linux

建议使用 [TeX Live](https://www.tug.org/texlive/)，也可以直接在终端中使用命令行安装（以 Ubuntu 为例）：`sudo apt-get install texlive-full`

> 国内网络下载上述软件可能速度较慢，且软件包体积较大，可使用清华大学镜像站作为替代方案。

---

## 使用方法

建议在 VS Code 中安装 [LaTeX Workshop](https://marketplace.visualstudio.com/items?itemName=James-Yu.latex-workshop) 插件，使用简单、容易上手。VS Code 还支持 GitHub Copilot、Claude Code 等 AI 编程插件，方便聚焦于内容而非格式。

安装完 LaTeX Workshop 后需进行以下配置：

1. 使用快捷键 `Ctrl + Shift + P`（macOS：`Command + Shift + P`）
2. 输入并选择 `Preferences: Open User Settings (JSON)`
3. 在末尾（注意在前一行末尾加英文逗号 `,`）粘贴以下内容：

```json
"latex-workshop.latex.tools": [
  {
    "name": "xelatex",
    "command": "xelatex",
    "args": [
      "-synctex=1",
      "-interaction=nonstopmode",
      "-file-line-error",
      "%DOC%"
    ]
  }
],
"latex-workshop.latex.recipes": [
  {
    "name": "xelatex",
    "tools": ["xelatex"]
  }
]
```

以上配置已可实现基础功能。如需更高级配置或遇到问题，可自行查询网络或 AI。

---

## 编译

处理中文文档时，推荐使用 `xelatex` 或 `lualatex` 编译引擎，并配合 `ctex` 宏包。示例：

```latex
\documentclass[UTF8]{ctexart}
\begin{document}
你好，世界！
\end{document}
```

| 操作 | Windows/Linux | macOS |
|------|--------------|-------|
| 编译 | `Ctrl + Alt + B` | `Command + Option + B` |
| 预览 PDF | `Ctrl + Alt + V` | `Command + Option + V` |
