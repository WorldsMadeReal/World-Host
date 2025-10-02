// Type guard helpers
export function isContract(contract, type) {
    return contract.type === type;
}
export function hasContract(contracts, type) {
    for (const contract of contracts) {
        if (isContract(contract, type)) {
            return contract;
        }
    }
    return undefined;
}
// Utility functions for working with Vec3
export const Vec3Utils = {
    create(x = 0, y = 0, z = 0) {
        return { x, y, z };
    },
    add(a, b) {
        return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
    },
    subtract(a, b) {
        return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
    },
    multiply(v, scalar) {
        return { x: v.x * scalar, y: v.y * scalar, z: v.z * scalar };
    },
    distance(a, b) {
        const diff = Vec3Utils.subtract(a, b);
        return Math.sqrt(diff.x * diff.x + diff.y * diff.y + diff.z * diff.z);
    },
    length(v) {
        return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    },
    normalize(v) {
        const len = Vec3Utils.length(v);
        if (len === 0)
            return { x: 0, y: 0, z: 0 };
        return Vec3Utils.multiply(v, 1 / len);
    }
};
// Utility functions for working with ChunkKey
export const ChunkUtils = {
    create(layerId, cx, cy, cz) {
        return { layerId, cx, cy, cz };
    },
    toString(key) {
        return `${key.layerId}:${key.cx},${key.cy},${key.cz}`;
    },
    fromString(str) {
        const match = str.match(/^([^:]+):(-?\d+),(-?\d+),(-?\d+)$/);
        if (!match)
            return null;
        return {
            layerId: match[1],
            cx: parseInt(match[2], 10),
            cy: parseInt(match[3], 10),
            cz: parseInt(match[4], 10),
        };
    },
    equals(a, b) {
        return a.layerId === b.layerId && a.cx === b.cx && a.cy === b.cy && a.cz === b.cz;
    }
};
//# sourceMappingURL=index.js.map