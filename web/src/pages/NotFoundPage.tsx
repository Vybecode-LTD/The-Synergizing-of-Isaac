import { Link } from "react-router";
import { PageHead } from "../components/Browse";
import { usePageMeta } from "../hooks/usePageMeta";

const LISTS: Record<string, { to: string; label: string }> = {
  item: { to: "/items", label: "all items" },
  trinket: { to: "/trinkets", label: "all trinkets" },
  character: { to: "/characters", label: "all characters" },
};

/** Shown for an address that leads nowhere. The server answers the same address with a real 404. */
export function NotFoundPage({ what }: { what?: "item" | "trinket" | "character" }) {
  usePageMeta("Not found");
  const list = what ? LISTS[what] : undefined;
  return (
    <div className="page">
      <PageHead
        title="This room is empty"
        lede={
          what
            ? `There is no ${what} at this address. The name in the link may be misspelled.`
            : "Nothing lives at this address."
        }
      />
      <div className="entity__actions">
        <Link className="button" data-variant="primary" to="/">
          Open the builder
        </Link>
        {list && (
          <Link className="button" to={list.to}>
            Browse {list.label}
          </Link>
        )}
      </div>
    </div>
  );
}
