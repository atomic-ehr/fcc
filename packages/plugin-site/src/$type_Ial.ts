// A parsed kramdown Inline Attribute List (`{:.class #id}`). `directive` marks
// non-attribute IAL forms ({::options …}, {:m1|m2|…}) that should be stripped.
export type Ial = {
    classes: string[];
    id?: string;
    directive: boolean;
};
