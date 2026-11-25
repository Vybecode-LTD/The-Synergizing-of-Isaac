import { useEffect, useMemo } from "react";
import { useLocation } from "react-router";
import { describePage, type PageMeta } from "../seo";

/** Title, description, heading and lede for the page on screen, from the same templates the server uses. */
export function usePage(): PageMeta {
  const { pathname } = useLocation();
  return useMemo(() => describePage(pathname), [pathname]);
}

/** Keep the tab title and meta description in step with client-side navigation. */
export function usePageHead(page: PageMeta): void {
  useEffect(() => {
    document.title = page.title;
    document.querySelector('meta[name="description"]')?.setAttribute("content", page.description);
  }, [page]);
}
