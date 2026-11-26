// Files in web/public are served as they are, so nothing checks them on the way out. A favicon that is not
// well-formed XML shows as nothing at all: a comment holding "--" did exactly that to the first draft.
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const web = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file: string) => readFileSync(path.join(web, file), "utf8");
const parseSvg = (source: string) => new DOMParser().parseFromString(source, "image/svg+xml");

describe("the favicon", () => {
  it("is linked from index.html as an SVG icon", () => {
    expect(read("index.html")).toContain('<link rel="icon" type="image/svg+xml" href="/favicon.svg" />');
  });

  it("parses as SVG on a 32px grid and draws something", () => {
    const doc = parseSvg(read("public/favicon.svg"));
    expect(doc.getElementsByTagName("parsererror")).toHaveLength(0);
    expect(doc.documentElement.getAttribute("viewBox")).toBe("0 0 32 32");
    expect(doc.querySelectorAll("path[fill][d]").length).toBeGreaterThan(1);
  });

  it("would be caught broken: a comment holding a double hyphen does not parse", () => {
    const broken = read("public/favicon.svg").replace("<!--", "<!-- --neutral-900");
    expect(parseSvg(broken).getElementsByTagName("parsererror").length).toBeGreaterThan(0);
  });
});
