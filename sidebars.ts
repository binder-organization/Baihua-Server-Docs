import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docs: [
    {
      type: 'doc',
      id: 'overview',
      label: 'Overview',
    },
    {
      type: 'category',
      label: 'Getting Started',
      collapsed: false,
      items: [
        'quick-start',
        'deployment',
      ],
    },
    {
      type: 'category',
      label: 'Guides',
      items: [
        'contributing',
        'code-of-conduct',
        'security',
        'encrypted-chat',
      ],
    },
    {
      type: 'category',
      label: 'API Reference',
      link: {
        type: 'doc',
        id: 'apiv1/TEMPLATE',
      },
      items: [
        'apiv1/health',
        'apiv1/greet',
        'apiv1/user',
        'apiv1/chat',
      ],
    },
    {
      type: 'doc',
      id: 'changelog',
      label: 'Changelog',
    },
  ],
};

export default sidebars;
