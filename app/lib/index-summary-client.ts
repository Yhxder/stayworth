"use client";

// 运行时从 Worker 读取 StayWorth Index。
//
// 为什么不再用打包进前端的 JSON：那样每天抓完还要人工「提交 + 部署」线上才会更新。
// 改成读 /api/index 后，每日任务只写 D1，页面刷新就能看到当天数据，
// 整个服务可以留在 Cloudflare 上。

import { useEffect, useState } from "react";

import type { IndexSummary } from "./index-reference";

export type IndexSummaryState =
  | { status: "loading" }
  | { status: "ready"; summary: IndexSummary }
  | { status: "empty" }
  | { status: "error"; message: string };

/** 同一页面里多个组件共享一次请求。 */
let inflight: Promise<IndexSummary | null> | null = null;

function loadIndexSummary(): Promise<IndexSummary | null> {
  if (!inflight) {
    inflight = fetch("/api/index", { headers: { accept: "application/json" } })
      .then(async (response) => {
        const body = (await response.json()) as {
          status?: string;
          message?: string;
        } & IndexSummary;
        if (!response.ok || body?.status === "error") {
          throw new Error(body?.message ?? "参考值加载失败");
        }
        if (body?.status === "empty") return null;
        return body;
      })
      .catch((error: unknown) => {
        // 失败不缓存，下次进入页面可以重试
        inflight = null;
        throw error;
      });
  }
  return inflight;
}

export function useIndexSummary(): IndexSummaryState {
  const [state, setState] = useState<IndexSummaryState>({ status: "loading" });

  useEffect(() => {
    let active = true;
    loadIndexSummary()
      .then((summary) => {
        if (!active) return;
        setState(
          summary
            ? { status: "ready", summary }
            : { status: "empty" },
        );
      })
      .catch((error: unknown) => {
        if (!active) return;
        setState({
          status: "error",
          message: error instanceof Error ? error.message : "参考值加载失败",
        });
      });
    return () => {
      active = false;
    };
  }, []);

  return state;
}
