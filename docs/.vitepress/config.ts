import { defineConfig } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'

export default withMermaid(
  defineConfig({
    title: 'Pitwall',
    description: 'Analyse de la performance des pilotes de F1, course par course — documentation technique.',
    lang: 'fr-FR',
    cleanUrls: true,
    // Links to the locally running stack are expected to be "dead" at build time.
    ignoreDeadLinks: 'localhostLinks',
    appearance: 'dark',
    head: [['link', { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }]],
    themeConfig: {
      logo: '/favicon.svg',
      nav: [
        { text: 'Guide', link: '/guide/getting-started' },
        { text: 'Architecture', link: '/architecture/overview' },
        { text: 'Méthodologie', link: '/domain/methodology' },
        { text: 'API', link: '/api/' },
        { text: 'ADR', link: '/adr/' },
      ],
      sidebar: [
        {
          text: 'Guide',
          items: [
            { text: 'Démarrage rapide', link: '/guide/getting-started' },
            { text: 'Commandes Task', link: '/guide/commands' },
            { text: 'Développement local', link: '/guide/local-development' },
          ],
        },
        {
          text: 'Architecture',
          items: [
            { text: 'Vue d’ensemble', link: '/architecture/overview' },
            { text: 'Screaming Architecture', link: '/architecture/screaming-architecture' },
            { text: 'Type-safety de bout en bout', link: '/architecture/type-safety' },
            { text: 'Ingestion & jobs', link: '/architecture/ingestion' },
          ],
        },
        {
          text: 'Domaine',
          items: [{ text: 'Méthodologie d’analyse', link: '/domain/methodology' }],
        },
        { text: 'API', items: [{ text: 'Référence', link: '/api/' }] },
        {
          text: 'Engineering',
          items: [
            { text: 'Qualité & tests', link: '/engineering/quality' },
            { text: 'Workflow avec l’IA', link: '/engineering/ai-workflow' },
            { text: 'Roadmap', link: '/engineering/roadmap' },
          ],
        },
        {
          text: 'Décisions (ADR)',
          collapsed: false,
          items: [
            { text: 'Index', link: '/adr/' },
            { text: '0001 · Monorepo TypeScript', link: '/adr/0001-typescript-monorepo' },
            { text: '0002 · Kysely plutôt qu’un ORM', link: '/adr/0002-kysely' },
            { text: '0003 · Queue dans PostgreSQL', link: '/adr/0003-graphile-worker' },
            { text: '0004 · React Native Web', link: '/adr/0004-react-native-web' },
            { text: '0005 · Analyse calculée à la lecture', link: '/adr/0005-compute-on-read' },
          ],
        },
      ],
      socialLinks: [{ icon: 'github', link: 'https://github.com/' }],
      search: { provider: 'local' },
      outline: { level: [2, 3], label: 'Sur cette page' },
      docFooter: { prev: 'Précédent', next: 'Suivant' },
      footer: { message: 'Données : OpenF1 (non officiel, non affilié à la Formula 1).' },
    },
    mermaid: { theme: 'dark' },
  }),
)
