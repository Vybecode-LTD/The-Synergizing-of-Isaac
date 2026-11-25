import { useEffect } from "react";
import { Link, NavLink, Outlet, Route, Routes, useLocation } from "react-router";
import { BuildProvider } from "./hooks/BuildStore";
import { usePage, usePageHead } from "./hooks/usePage";
import { AboutPage } from "./pages/AboutPage";
import { BuilderPage } from "./pages/BuilderPage";
import { CharacterPage, CharactersPage } from "./pages/CharacterPages";
import { ItemPage, ItemsPage } from "./pages/ItemPages";
import { NotFoundPage } from "./pages/NotFoundPage";
import { SynergiesPage } from "./pages/SynergiesPage";
import { TrinketPage, TrinketsPage } from "./pages/TrinketPages";
import { SITE, wordmarkParts } from "./site";

const NAV = [
  { to: "/", label: "Builder", end: true },
  { to: "/items", label: "Items" },
  { to: "/trinkets", label: "Trinkets" },
  { to: "/characters", label: "Characters" },
  { to: "/synergies", label: "Synergies" },
];

function Wordmark() {
  const [name, tld] = wordmarkParts();
  return (
    <Link className="wordmark" to="/" aria-label={`${SITE.domain}, home`}>
      <svg className="wordmark__mark" viewBox="0 0 16 16" aria-hidden="true" shapeRendering="crispEdges">
        <path d="M7 1h2v1h1v1h1v3h-1v1H6V6H5V3h1V2h1z" />
        <path d="M5 9h6v2h-1v2h2v2H4v-2h2v-2H5z" />
      </svg>
      <span>
        {name}
        <span className="wordmark__tld">{tld}</span>
      </span>
    </Link>
  );
}

function Shell() {
  const { pathname } = useLocation();
  usePageHead(usePage());
  // A new page starts at the top; changing the build on the same page does not move you.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <div className="site-header__inner">
          <Wordmark />
          <nav className="site-nav" aria-label="Main">
            {NAV.map((item) => (
              <NavLink key={item.to} className="site-nav__link" to={item.to} end={item.end}>
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main id="main" className="site-main" tabIndex={-1}>
        <Outlet />
      </main>
      <footer className="site-footer">
        <div className="site-footer__inner">
          <p>
            {SITE.domain} is an unofficial fan project, not affiliated with or endorsed by Edmund McMillen or Nicalis.
            The Binding of Isaac and its artwork belong to their owners.
          </p>
          <p>
            <Link className="site-footer__link" to="/about">
              About, sources and credits
            </Link>
          </p>
        </div>
      </footer>
    </>
  );
}

export function App() {
  return (
    <BuildProvider>
      <Routes>
        <Route element={<Shell />}>
          <Route index element={<BuilderPage />} />
          {/* Addresses are case-sensitive, as they are on the server: /Items is a 404 there, so it is here. */}
          <Route path="items" caseSensitive element={<ItemsPage />} />
          <Route path="items/:slug" caseSensitive element={<ItemPage />} />
          <Route path="trinkets" caseSensitive element={<TrinketsPage />} />
          <Route path="trinkets/:slug" caseSensitive element={<TrinketPage />} />
          <Route path="characters" caseSensitive element={<CharactersPage />} />
          <Route path="characters/:slug" caseSensitive element={<CharacterPage />} />
          <Route path="synergies" caseSensitive element={<SynergiesPage />} />
          <Route path="about" caseSensitive element={<AboutPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BuildProvider>
  );
}
