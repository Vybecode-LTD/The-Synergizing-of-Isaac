import { useEffect } from "react";
import { pageTitle } from "../site";

/** Set the tab title and meta description for the page on screen. The API writes the same tags for crawlers. */
export function usePageMeta(title: string | undefined, description?: string): void {
  useEffect(() => {
    document.title = pageTitle(title);
    if (description) {
      document.querySelector('meta[name="description"]')?.setAttribute("content", description);
    }
  }, [title, description]);
}
