export function getCleanUUID(input: string): string {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    if (uuidRegex.test(input)) return input;

    try {
        const decoded = Buffer.from(input, 'base64').toString('utf8').trim();
        if (uuidRegex.test(decoded)) return decoded;
    } catch (e) {
        console.error('Failed to decode base64:', e);
    }

    return input;
}