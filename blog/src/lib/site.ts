export const SITE = {
    origin: 'https://ryanlewan.com',
    base: '/blog/',
    title: 'Ryan Lewandowski — Notes',
    shortTitle: 'Notes',
    author: 'Ryan Lewandowski',
    description: 'Engineering notes on graphics, simulation, C++ and machine learning — the journey to coding a simulation. No AI writing.',
    ogImage: '/assets/myPhoto.jpeg',
    links: {
        github: 'https://github.com/ryanlew02',
        linkedin: 'https://www.linkedin.com/in/ryan-lewandowski-120546164/',
        medium: 'https://medium.com/@ryanlewan-sim',
    },
} as const;

/** Absolute URL for a path under the site (paths may or may not start with /blog). */
export function absolute(path: string): string {
    return new URL(path, SITE.origin).toString();
}

/** A path inside the blog: url('tags/cpp/') → /blog/tags/cpp/ */
export function url(path = ''): string {
    return SITE.base + path.replace(/^\/+/, '');
}
