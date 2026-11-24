import { Link } from "react-router";
import { PageHead } from "../components/Browse";
import { gameData } from "../engine/data";
import { usePageMeta } from "../hooks/usePageMeta";
import { SITE } from "../site";

export function AboutPage() {
  usePageMeta("About", `What ${SITE.domain} is, where its data comes from, how the AI analysis works and who made the game.`);
  return (
    <div className="page">
      <PageHead
        title={`About ${SITE.domain}`}
        lede={`A free companion for ${SITE.game}: tell it what you're holding and it tells you what those things do together.`}
      />
      <div className="prose flow">
        <h2>What you can do here</h2>
        <ul>
          <li>
            <Link className="text-link" to="/">
              Build a loadout
            </Link>{" "}
            from a character, up to 16 items and 6 trinkets, and see every synergy in the list that applies.
          </li>
          <li>See which single pickup would complete another synergy, strongest first.</li>
          <li>Ask for an AI read on the whole build, including combinations the list doesn&rsquo;t cover.</li>
          <li>Copy a link to a build and send it to someone.</li>
          <li>Write down your own synergies. They stay in your browser.</li>
        </ul>

        <h2>How the ratings work</h2>
        <p>
          Each synergy has a letter. S is run-defining, A is strong, B is good, C is minor, and D marks items that
          work against each other. The ratings are opinions from the people who wrote the list, not numbers from the
          game.
        </p>

        <h2>Where the data comes from</h2>
        <ul>
          <li>
            Item and trinket names, IDs, effects, stat changes and transformations come from the open-source{" "}
            <a className="text-link" href="https://github.com/Rchardon/RebirthItemTracker" rel="noreferrer">
              Rebirth Item Tracker
            </a>{" "}
            (BSD 2-Clause, &copy; Brett824, Hyphen-ated and Gamonymous).
          </li>
          <li>
            Quality, item pools and starting items are the numbers in the game&rsquo;s own data files for Repentance
            1.7.9b.
          </li>
          <li>
            The {gameData.synergies.length} synergies were written by hand. They have not all been checked against the
            game yet, so treat a surprising one as a lead, not a fact.
          </li>
        </ul>
        <p>
          Stat changes are the items&rsquo; own numbers added up. The game then runs them through its damage and
          fire-rate formulas, so they are a tally of what you picked up, not your final stats.
        </p>

        <h2>How the AI analysis works</h2>
        <p>
          When you press &ldquo;Analyse this build&rdquo;, the list of items, trinkets and character you chose is sent
          to this site&rsquo;s server, which asks an AI model (Anthropic&rsquo;s Claude) to explain the build using
          this site&rsquo;s item data. Nothing else about you is sent. The answer is saved so the next person with the
          same build gets it instantly.
        </p>
        <p>
          An AI can be confidently wrong about game mechanics. Each visitor gets a few fresh analyses a day because
          every one costs money to run.
        </p>

        <h2>Your data</h2>
        <p>
          There are no accounts. Your current build and any synergies you write are kept in your browser&rsquo;s own
          storage and never leave it, unless you ask for an AI analysis as described above.
        </p>

        <h2>Credits</h2>
        <p>
          The Binding of Isaac was created by Edmund McMillen and is published by Nicalis. All item, trinket and
          character artwork belongs to them. {SITE.domain} is an unofficial fan project and is not affiliated with or
          endorsed by either.
        </p>
      </div>
    </div>
  );
}
