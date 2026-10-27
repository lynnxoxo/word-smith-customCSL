
import CSL from 'citeproc';
import type { WsCite, WsRef } from './citations';

type CslItem = Record<string, unknown>;

function toCslItem(ref: WsRef): CslItem {
    const types: Record<string, string> = {
        article: 'article-journal',
        book: 'book',
        chapter: 'chapter',
        thesis: 'thesis',
        report: 'report',
        web: 'webpage',
        other: 'document'
    };

    const names = (people: WsRef['authors']) =>
        people.map(p => ({
            family: p.family,
            given: p.given
        }));

    return {
        id: ref.key,
        type: types[ref.type] || 'document',
        title: ref.title,
        author: names(ref.authors),
        editor: names(ref.editors),
        issued: ref.year
            ? { 'date-parts': [[Number(ref.year)]] }
            : undefined,
        'container-title': ref.container,
        publisher: ref.publisher,
        'publisher-place': ref.place,
        volume: ref.volume,
        issue: ref.issue,
        page: ref.pages,
        edition: ref.edition,
        DOI: ref.doi,
        URL: ref.url
    };
}

function toCslCitation(
    cite: WsCite,
    index: number
) {
    return {
        citationID: `ws-csl-${index}`,
        citationItems: cite.items.map(item => {
            // Word-Smith stores the locator as text,
            // for example "p. 45".
            const locator = item.locator
                .replace(/^pp?\.\s*/i, '')
                .trim();

            return {
                id: item.key,
                locator: locator || undefined,
                label: 'page',
                prefix: item.prefix || undefined,
                'suppress-author': item.suppress
            };
        }),
        properties: {
            noteIndex: index + 1
        }
    };
}

export class WordSmithCslProcessor {
	private engine: InstanceType<typeof CSL.Engine>;


    constructor(
        styleXml: string,
        localeXml: string,
        references: Map<string, WsRef>,
        language = 'en-US'
    ) {
        const items = new Map<string, CslItem>();

        for (const ref of references.values()) {
            items.set(ref.key, toCslItem(ref));
        }

        const sys = {
            retrieveItem: (id: string) => items.get(id),

            retrieveLocale: (_lang: string) => localeXml
        };

        this.engine = new CSL.Engine(
            sys,
            styleXml,
            language
        );

        this.engine.setOutputFormat('text');
    }

    formatDocument(citations: WsCite[]): string[] {
        const output = new Array<string>(
            citations.length
        ).fill('');

        const registered: Array<{
            citationID: string;
            noteIndex: number;
        }> = [];

        citations.forEach((cite, index) => {
            const cluster = toCslCitation(cite, index);

            const updates =
                this.engine.processCitationCluster(
                    cluster,
                    registered.map(c => [
                        c.citationID,
                        c.noteIndex
                    ]),
                    []
                )[1] as Array<[number, string]>;

            for (const [position, formatted] of updates) {
                output[position] = formatted;
            }

            registered.push({
                citationID: cluster.citationID,
                noteIndex: cluster.properties.noteIndex
            });
        });

        return output;
    }

    bibliography(): string[] {
        const result = this.engine.makeBibliography();

        return result ? result[1] : [];
    }
}