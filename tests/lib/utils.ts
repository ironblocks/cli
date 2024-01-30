export function replaceSingleSpace(text: string): string {
    const singleSpaceText = text.replaceAll(/\n+/g, ' ').replaceAll(/\s+/g, ' ');
    return singleSpaceText;
}

export function replaceCRLF(crlfText: string): string {
    const lfText = crlfText.replaceAll(/\r/g, '');
    return lfText;
}
