export const floor = v => ({ x: Math.floor(v.x), y: Math.floor(v.y), z: Math.floor(v.z) });
export const add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
export const mul = (v, s) => ({ x: v.x * s, y: v.y * s, z: v.z * s });
export const len2D = v => Math.hypot(v.x, v.z);
