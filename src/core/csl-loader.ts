
import { App, TFile } from 'obsidian';

export interface LoadedCsl {
    styleXml: string;
    localeXml: string;
}

export async function loadCsl(
    app: App,
    stylePath: string,
    localePath = 'Styles/locales-en-US.xml'
): Promise<LoadedCsl> {

    async function readXml(path: string): Promise<string> {
        const file = app.vault.getAbstractFileByPath(path);

        if (!(file instanceof TFile)) {
            throw new Error(`CSL file not found: ${path}`);
        }

        return app.vault.cachedRead(file);
    }

    const styleXml = await readXml(stylePath);
    const localeXml = await readXml(localePath);

    if (!/<style(?:\s|>)/.test(styleXml)) {
        throw new Error('Invalid CSL style XML.');
    }

    if (!/<locale(?:\s|>)/.test(localeXml)) {
        throw new Error('Invalid CSL locale XML.');
    }

    return { styleXml, localeXml };
}