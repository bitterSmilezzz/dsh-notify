import { parsePresencePayload } from "./presence.js";
/** 聚焦上报的精确路由（与 client/presence.ts 的常量一一对应）。 */
export const PRESENCE_ROUTE = '/api/dsh-notify/presence';
/** body 上限：本协议只有一个布尔字段，任何更大的 body 都是异常输入。 */
const MAX_BODY_BYTES = 4096;
/** 读取请求 body 并解析 JSON；超限/非 JSON 一律 undefined（调用方回 400）。 */
async function readJsonBody(req) {
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
        const buffer = chunk;
        size += buffer.byteLength;
        if (size > MAX_BODY_BYTES)
            return undefined;
        chunks.push(buffer);
    }
    if (chunks.length === 0)
        return undefined;
    try {
        return JSON.parse(Buffer.concat(chunks).toString('utf8'));
    }
    catch {
        return undefined;
    }
}
/** 写一个空响应（本协议只用状态码，不带 body）。 */
function end(res, status) {
    res.writeHead(status);
    res.end();
}
/**
 * 注册聚焦上报路由。所有失败路径都只回状态码、不抛错（通知是增益不是依赖）；
 * handler 内的异常被吞掉并回 500，绝不影响宿主。
 * @param deps - 注册函数、信任围栏与上报回调。
 * @returns 路由 disposer（随 fiber 回收）。
 */
export function registerPresenceRoute(deps) {
    return deps.register({
        kind: 'exact',
        path: PRESENCE_ROUTE,
        handler: async (req, res) => {
            try {
                const rejection = deps.guard(req);
                if (rejection !== undefined) {
                    end(res, rejection);
                    return;
                }
                if (req.method !== 'POST') {
                    end(res, 405);
                    return;
                }
                const visible = parsePresencePayload(await readJsonBody(req));
                if (visible === undefined) {
                    end(res, 400);
                    return;
                }
                deps.report(visible);
                end(res, 204);
            }
            catch {
                end(res, 500);
            }
        },
    });
}
//# sourceMappingURL=presence-route.js.map