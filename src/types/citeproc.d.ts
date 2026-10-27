
declare module 'citeproc' {
    interface CslSystem {
        retrieveItem(id: string): unknown;
        retrieveLocale(lang: string): string;
    }

    interface CitationItem {
        id: string;
        locator?: string;
        label?: string;
        prefix?: string;
        suffix?: string;
        'suppress-author'?: boolean;
    }

    interface Citation {
        citationID: string;
        citationItems: CitationItem[];
        properties: {
            noteIndex: number;
        };
    }

    interface Engine {
        setOutputFormat(format: string): void;

        processCitationCluster(
            citation: Citation,
            citationsPre: Array<[string, number]>,
            citationsPost: Array<[string, number]>
        ): [
            unknown,
            Array<[number, string]>
        ];

        makeBibliography():
            | [unknown, string[]]
            | false;
    }

    const CSL: {
        Engine: new (
            sys: CslSystem,
            style: string,
            lang?: string
        ) => Engine;
    };

    export = CSL;
}