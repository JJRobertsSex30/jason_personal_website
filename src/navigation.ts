import { getPermalink, getBlogPermalink, getAsset } from './utils/permalinks';

export const headerData = {
  links: [
    {
      text: 'The Framework',
      links: [
        {
          text: 'What is Sex 3.0',
          href: getPermalink('/#'),
        },
        {
          text: 'Key Benefits',
          href: getPermalink('/#'),
        },
        {
          text: 'Why the Old Way Fails',
          href: getPermalink('/#'),
        },
      ],
    },
    {
      text: 'Resources',
      links: [
        {
          text: 'The Book - Sex 3.0',
          href: getPermalink('/#'),
        },
        {
          text: 'Blog',
          href: getPermalink('/#'),
        },
        {
          text: 'Videos',
          href: getPermalink('/#'),
        },
        {
          text: 'Podcast',
          href: getPermalink('/#'),
        },
      ],
    },
    {
      text: 'Love Lab',
      links: [
        {
          text: 'Take the Quiz',
          href: getPermalink('/quiz'),
        },
        {
          text: 'Relationship Blueprint Tool',
          href: getPermalink('/#'),
        },
        {
          text: 'Interactive Exercises',
          href: getPermalink('/#'),
        },
      ],
    },
    {
      text: 'About JJ',
      links: [
        {
          text: 'My Story',
          href: getPermalink('/#'),
        },
        {
          text: 'My Mission',
          href: getPermalink('/#'),
        },
        {
          text: 'Contact',
          href: getPermalink('/#'),
        },
      ],
    },
  ],
  actions: [{ text: 'Download', href: 'https://github.com/onwidget/astrowind', target: '_blank' }],
};

export const footerData = {
  // We can use one or two main columns for this flatter list.
  // Let's aim for two columns for better readability if the list is long.
  links: [
    {
      title: 'Navigate', // Column 1 Title (Optional, can be empty if no title needed)
      links: [
        { text: 'Home', href: getPermalink('/') },
        { text: 'Full JJ Bio', href: getPermalink('/about-jj') },
        { text: 'Love Lab (Quiz)', href: getPermalink('/quiz') },
        { text: 'Courses', href: getPermalink('/courses') },
        { text: 'Contact / Work With JJ', href: getPermalink('/work-with-jj') },
      ],
    },
    {
      title: 'Resources', // Column 2 Title (Optional)
      links: [
        { text: 'The Book', href: getPermalink('/book-details') },
        { text: 'Blog', href: getPermalink('/blog') },
        { text: 'Videos', href: getPermalink('/videos') },
        { text: 'Podcast', href: getPermalink('/podcast') },
        { text: 'Full FAQ', href: getPermalink('/faq') },
        // You can add more links here if needed for the second column
      ],
    },
    // If you want a third column for legal, or merge legal into secondaryLinks:
    /*
    {
      title: 'Legal',
      links: [
        { text: 'Privacy Policy', href: getPermalink('/privacy') },
        { text: 'Terms of Service', href: getPermalink('/terms') },
      ]
    }
    */
  ],

  // Secondary links (these usually appear horizontally below the main columns or site name)
  secondaryLinks: [
    { text: 'Privacy Policy', href: getPermalink('/privacy') },
    { text: 'Terms of Service', href: getPermalink('/terms') },
    // You could also put FAQ here if not in main columns:
    // { text: 'FAQ', href: getPermalink('/faq') },
  ],
  socialLinks: [
    { ariaLabel: 'X', icon: 'tabler:brand-x', href: '#' },
    { ariaLabel: 'Instagram', icon: 'tabler:brand-instagram', href: '#' },
    { ariaLabel: 'Facebook', icon: 'tabler:brand-facebook', href: '#' },
    { ariaLabel: 'RSS', icon: 'tabler:rss', href: getAsset('/rss.xml') },
    { ariaLabel: 'Github', icon: 'tabler:brand-github', href: 'https://github.com/onwidget/astrowind' },
  ],
  footNote: `
    JJ Roberts · All rights reserved 2025.
  `,
};
