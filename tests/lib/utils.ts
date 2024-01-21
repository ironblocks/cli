export function replaceSingleSpace(text: string): string {
    const singleSpaceText = text.replaceAll(/\n+/g, ' ').replaceAll(/\s+/g, ' ');
    return singleSpaceText;
}
