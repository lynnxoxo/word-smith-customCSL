
import type { WsExportSection } from './settings';
import {
    wsCiteMask,
    wsFindCitations
} from './citations';
import type {
    WsCite,
    WsRef
} from './citations';
import { WordSmithCslProcessor } from './csl-processor';

interface CitationLocation {
    section: number;
    citation: WsCite;
    position: number;
}

export function wsCslExport(
    sections: WsExportSection[],
    styleXml: string,
    localeXml: string,
    library: Map<string, WsRef>,
    heading = 'References'
): boolean {

    // Note-based styles need a separate footnote
    // insertion implementation.
    if (/<style\b[^>]*\bclass\s*=\s*["']note["']/i
        .test(styleXml)) {
        throw new Error(
            'Note-based CSL styles are not yet supported.'
        );
    }

    const locations: CitationLocation[] = [];

    // Collect citations across the complete manuscript.
    sections.forEach((section, sectionIndex) => {
        if (
            section.folder ||
            section.bib ||
            !section.markdown
        ) {
            return;
        }

        const masked = wsCiteMask(section.markdown);
        const citations = wsFindCitations(masked);
	
	const narrative = citations.find(c => c.narrative);

	if (narrative) {
	    throw new Error(
	        'Custom CSL export does not yet support ' +
	        'narrative citations such as @smith2020. ' +
	        'Use [@smith2020] for now.'
	    );
	}

        for (const citation of citations) {
            // Unknown references stay untouched.
            if (
                citation.items.some(item =>
                    !library.has(item.key)
                )
            ) {
                continue;
            }

            locations.push({
                section: sectionIndex,
                citation,
                position: locations.length
            });
        }
    });

    if (!locations.length) {
        return false;
    }

    const processor = new WordSmithCslProcessor(
        styleXml,
        localeXml,
        library
    );

    
console.info(
    '[Word-Smith CSL] Processing',
    locations.length,
    'citation clusters'
);

let formatted: string[];

try {
    formatted = processor.formatDocument(
        locations.map(loc => loc.citation)
    );
} catch (error) {
    console.error(
        '[Word-Smith CSL] Citation processor error:',
        error
    );

    throw error;
}

console.info(
    '[Word-Smith CSL] Formatted citations:',
    formatted
);

    if (formatted.length !== locations.length ||
        formatted.some(text => !text)) {
        throw new Error(
            'CSL processing did not produce all citations.'
        );
    }

    // Replace citations section by section.
    // Work backwards so offsets remain valid.
    sections.forEach((section, sectionIndex) => {
        const matches = locations.filter(
            loc => loc.section === sectionIndex
        );

        if (!matches.length) return;

        let markdown = section.markdown;

        for (let i = matches.length - 1; i >= 0; i--) {
            const loc = matches[i];
            const citation = loc.citation;

            markdown =
                markdown.slice(0, citation.from) +
                formatted[loc.position] +
                markdown.slice(citation.to);
        }

        section.markdown = markdown;
    });

    // Add the bibliography.
    
console.info(
    '[Word-Smith CSL] Generating bibliography'
);

let bibliography: string[];

try {
    bibliography = processor.bibliography();
} catch (error) {
    console.error(
        '[Word-Smith CSL] Bibliography error:',
        error
    );

    throw error;
}

console.info(
    '[Word-Smith CSL] Bibliography entries:',
    bibliography.length
);

    if (bibliography.length) {
        sections.push({
            title: heading,
            markdown: bibliography.join('\n\n'),
            path: '',
            depth: 0,
            bib: true,
            entries: bibliography
        });
    }

    return true;
}