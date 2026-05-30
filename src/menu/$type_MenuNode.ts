export type MenuNode = {
    label: string;
    /** href as written; `#foo.html` style means anchor-only (dropdown header) */
    href: string;
    children: MenuNode[];
};
