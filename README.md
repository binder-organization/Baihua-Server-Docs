# Baihua Server Docs

Official documentation site for [Baihua Server](https://github.com/Binder-organize/Baihua-Server), built with [Docusaurus 3](https://docusaurus.io/). Supports English and Simplified Chinese, deployed to GitHub Pages.

## About

Baihua is a team communication tool built with Rust, designed for developers. This site hosts all documentation including API docs, quick-start guides, deployment instructions, and more.

## Editing Docs

Source files are located at:

- `docs/` — English docs (current version)
- `i18n/zh-CN/docusaurus-plugin-content-docs/current/` — Chinese docs (current version)

To add or modify content:

1. Edit the corresponding `.md` file
2. If adding a new doc, register it in `sidebars.ts`
3. For Chinese translations, create a matching `.md` under `i18n/zh-CN/` with the same relative path
4. Run `npm run build` to verify no errors

### Local Preview

```bash
npm install
npm start
```

Open `http://localhost:3000` in your browser. Edits are reflected via hot-reload.

## Deployment

Automatic deployment via GitHub Actions when pushing to `main`.

- **Workflow**: `.github/workflows/deploy.yml`
- **Live URL**: https://binder2025.github.io/baihua-server-docs

To preview the production build locally:

```bash
npm run build     # generates static files in build/
npm run serve     # serves build/ at http://localhost:3000
```

## Testing

```bash
# Full build (matches CI)
npm run build

# Preview production build
npm run serve

# Quick smoke test
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/docs/v0.1.1/overview
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/zh-CN/docs/v0.1.1/overview

# Type check
npm run typecheck
```

## Versioning

Current published version: `v0.1.1`.

To freeze a new version:

```bash
npm run docusaurus docs:version <version-name>
```

This creates `versioned_docs/version-<version-name>/` and `versioned_sidebars/version-<version-name>-sidebars.json`, and updates `versions.json`.

**Post-versioning checklist**:
- Check `i18n/zh-CN/docusaurus-plugin-content-docs/version-<version-name>.json` — the `version.label` auto-translates to `"Next"`, update it to the actual version label
- Update `docusaurus.config.ts` — adjust `lastVersion` and `onlyIncludeVersions` as needed
- Update the footer links in `docusaurus.config.ts` to point to the new version path

## Contact

- **Maintainer**: Gavin Zheng
- **Email**: gav.zheng@outlook.com
