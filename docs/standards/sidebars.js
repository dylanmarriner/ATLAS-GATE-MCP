module.exports = {
  tutorialSidebar: [
    'index',
    {
      type: 'category',
      label: 'Getting Started',
      items: [
        'getting-started/index',
        'getting-started/installation',
        'getting-started/configuration',
        'getting-started/first-session',
        'getting-started/beginner-guide',
      ],
    },
    {
      type: 'category',
      label: 'Architecture',
      items: [
        'architecture/index',
        'architecture/system-overview',
        'architecture/security-model',
        'architecture/governance-framework',
        'architecture/adr-index',
      ],
    },
    {
      type: 'category',
      label: 'API Reference',
      items: [
        'api/index',
        'api/core-tools',
        'api/role-apis',
        'api/error-handling',
        'api/mcp-protocol',
      ],
    },
    {
      type: 'category',
      label: 'User Guides',
      items: [
        'guides/index',
        'guides/planning-role',
        'guides/execution-role',
        'guides/session-management',
        'guides/troubleshooting',
      ],
    },
    {
      type: 'category',
      label: 'Reference',
      items: [
        'reference/index',
        'reference/configuration',
        'reference/best-practices',
        'reference/migration',
        'reference/glossary',
      ],
    },
    {
      type: 'category',
      label: 'Governance',
      items: [
        'governance/index',
        'governance/documentation-governance',
        'governance/maturity-model',
        'governance/roadmap',
        'governance/changelog',
      ],
    },
  ],
};
