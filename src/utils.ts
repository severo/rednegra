export function indexById<T extends { id: string }>(array: T[]): Map<string, T> {
    const map = new Map<string, T>();
    for (const item of array) {
        if (map.has(item.id)) {
            throw new Error(`Duplicate key value: ${item.id}`);
        }
        map.set(item.id, item);
    }
    return map;
}
