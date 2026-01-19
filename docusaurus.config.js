const config = {
  title: 'KAIZA MCP Documentation',
  tagline: 'Enterprise governance gateway for AI-driven development',
  url: 'https://kaiza-mcp.org',
  baseUrl: '/docs/',
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',
  favicon: 'img/favicon.ico',
  organizationName: 'kaiza-mcp',
  projectName: 'kaiza-mcp-server',

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
          editUrl: 'https://github.com/dylanmarriner/KAIZA-MCP-server/tree/main/docs/',
        },
        blog: {
          showReadingTime: true,
          editUrl: 'https://github.com/dylanmarriner/KAIZA-MCP-server/tree/main/blog/',
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      },
    ],
  ],

  themeConfig: {
    navbar: {
      title: 'KAIZA MCP',
      logo: {
        alt: 'KAIZA MCP Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'doc',
          docId: 'index',
          position: 'left',
          label: 'Docs',
        },
        {
          to: '/docs/category/getting-started',
          label: 'Getting Started',
          position: 'left',
        },
        {
          to: '/docs/category/architecture',
          label: 'Architecture',
          position: 'left',
        },
        {
          to: '/docs/category/api-reference',
          label: 'API',
          position: 'left',
        },
        {
          to: '/blog',
          label: 'Blog',
          position: 'left'
        },
        {
          href: 'https://github.com/dylanmarriner/KAIZA-MCP-server',
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
              label: 'Getting Started',
              to: '/docs/category/getting-started',
            },
            {
              label: 'Architecture',
              to: '/docs/category/architecture',
            },
            {
              label: 'API Reference',
              to: '/docs/category/api-reference',
            },
          ],
        },
        {
          title: 'Community',
          items: [
            {
              label: 'GitHub',
              href: 'https://github.com/dylanmarriner/KAIZA-MCP-server',
            },
            {
              label: 'Discord',
              href: 'https://discord.gg/kaiza-mcp',
            },
            {
              label: 'Twitter',
              href: 'https://twitter.com/kaiza_mcp',
            },
          ],
        },
        {
          title: 'More',
          items: [
            {
              label: 'Blog',
              to: '/blog',
            },
            {
              label: 'GitHub',
              href: 'https://github.com/dylanmarriner/KAIZA-MCP-server',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} KAIZA MCP Team. Built with Docusaurus.`,
    },
    prism: {
      theme: require('prism-react-renderer/themes/github'),
      darkTheme: require('prism-react-renderer/themes/dracula'),
      additionalLanguages: ['javascript', 'json', 'bash', 'yaml'],
    },
    mermaid: {
      theme: { light: 'default', dark: 'dark' },
    },
  },

  plugins: [
    '@docusaurus/plugin-content-docs',
    '@docusaurus/plugin-content-blog',
    '@docusaurus/plugin-ideal-image',
    '@docusaurus/plugin-pwa',
    '@docusaurus/plugin-sitemap',
    [
      '@docusaurus/plugin-mermaid',
      {
        id: 'mermaid',
        mermaid: {
          theme: { light: 'default', dark: 'dark' },
        },
      },
    ],
  ],

  stylesheets: [
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  ],

  scripts: [
    'https://plausible.io/js/script.js',
    'https://cdn.jsdelivr.net/npm/mermaid@10.0.0/dist/mermaid.min.js',
  ],
};

module.exports = config;
