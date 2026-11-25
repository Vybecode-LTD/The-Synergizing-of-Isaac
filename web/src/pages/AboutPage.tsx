import { Link } from "react-router";
import { PageHead } from "../components/Browse";
import { usePage } from "../hooks/usePage";
import { aboutContent, fill, siteValues } from "../seo";

type Segment = string | { text: string; href: string };
type Block = { p: Segment[] } | { ul: Segment[][] };

function Segments({ segments }: { segments: Segment[] }) {
  const values = siteValues();
  return (
    <>
      {segments.map((segment, index) =>
        typeof segment === "string" ? (
          fill(segment, values)
        ) : segment.href.startsWith("/") ? (
          <Link key={index} className="text-link" to={segment.href}>
            {fill(segment.text, values)}
          </Link>
        ) : (
          <a key={index} className="text-link" href={segment.href} rel="noreferrer">
            {fill(segment.text, values)}
          </a>
        ),
      )}
    </>
  );
}

/** The About page. Its words live in data/content/about.json, which the server renders too. */
export function AboutPage() {
  const page = usePage();
  const values = siteValues();
  return (
    <div className="page">
      <PageHead title={page.h1} lede={fill(aboutContent.lede, values)} />
      <div className="prose flow">
        {aboutContent.sections.map((section) => (
          <section key={section.heading} className="flow">
            <h2>{fill(section.heading, values)}</h2>
            {(section.blocks as Block[]).map((block, index) =>
              "p" in block ? (
                <p key={index}>
                  <Segments segments={block.p} />
                </p>
              ) : (
                <ul key={index}>
                  {block.ul.map((item, n) => (
                    <li key={n}>
                      <Segments segments={item} />
                    </li>
                  ))}
                </ul>
              ),
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
