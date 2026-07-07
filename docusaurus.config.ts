import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'Baihua',
  tagline: 'A team communication tool customized for developers.',

  // Set the production url of your site here
  url: 'https://binder2025.github.io',
  baseUrl: '/',

  // GitHub pages deployment config
  organizationName: 'Binder-organize',
  projectName: 'Baihua-Server',

  onBrokenLinks: 'warn',
  onBrokenAnchors: 'warn',

  // Internationalization
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'zh-CN'],
    localeConfigs: {
      en: {
        label: 'English',
        htmlLang: 'en-US',
      },
      'zh-CN': {
        label: '简体中文',
        htmlLang: 'zh-CN',
      },
    },
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          lastVersion: 'v0.1.0',
          onlyIncludeVersions: ['v0.1.0'],
          versions: {
            'v0.1.0': {
              label: 'v0.1.0',
              path: 'v0.1.0',
            },
          },
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  plugins: [
    [
      require.resolve('@easyops-cn/docusaurus-search-local') as never,
      {
        indexDocs: true,
        indexBlog: false,
        docsRouteBasePath: '/docs',
        language: ['en', 'zh'],
      },
    ],
  ],

  themeConfig: {
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'Baihua',
      items: [
        {
          type: 'docsVersionDropdown',
          position: 'left',
        },
        {
          type: 'localeDropdown',
          position: 'right',
        },
        {
          href: 'https://github.com/Binder-organize/Baihua-Server',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
            items: [
              {
                label: 'Overview',
                to: '/docs/v0.1.0/overview',
              },
              {
                label: 'Quick Start',
                to: '/docs/v0.1.0/quick-start',
              },
              {
                label: 'API Reference',
                to: '/docs/v0.1.0/apiv1/TEMPLATE',
              },
            ],
        },
        {
          title: 'Community',
          items: [
            {
              label: 'GitHub',
              href: 'https://github.com/Binder-organize/Baihua-Server',
            },
          ],
        },
        {
          title: 'More',
            items: [
              {
                label: 'Changelog',
                to: '/docs/v0.1.0/changelog',
              },
              {
                label: 'Contributing',
                to: '/docs/v0.1.0/contributing',
              },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Gavin Zheng. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
