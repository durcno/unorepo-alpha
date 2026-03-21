---
bump: minor
---

# feat(preview): add command to generate and open changelog preview in browser

Added a new `preview` command that generates a changelog preview from staged changenotes and automatically opens it in your default browser. This command uses remark and rehype to convert markdown changenotes to HTML, making it easy to preview your changelog before release without needing to build the full project.