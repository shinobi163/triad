import { useEffect, useState } from 'react';
import Hub from './Hub.jsx';
import Crossfire from './crossfire/Crossfire.jsx';
import Seam from './seam/Seam.jsx';
import Equilibrium from './equilibrium/Equilibrium.jsx';
import { LEVELS as CROSSFIRE_LEVELS } from './crossfire/logic.js';
import { LEVELS as SEAM_LEVELS } from './seam/levels.js';
import { LEVELS as EQUILIBRIUM_LEVELS } from './equilibrium/levels.js';

const GAMES = {
  crossfire: { Screen: Crossfire, levels: CROSSFIRE_LEVELS },
  seam: { Screen: Seam, levels: SEAM_LEVELS },
  equilibrium: { Screen: Equilibrium, levels: EQUILIBRIUM_LEVELS },
};

// The URL hash names the game (#seam), so a refresh stays on it.
const readRoute = () => {
  const id = window.location.hash.slice(1);
  return GAMES[id] ? id : 'hub';
};

export default function App() {
  const [route, setRoute] = useState(readRoute);
  const [levelIds, setLevelIds] = useState({});   // game -> chosen level id

  useEffect(() => {
    const onHash = () => setRoute(readRoute());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const go = (id) => {
    window.location.hash = id === 'hub' ? '' : id;
    setRoute(id);
    window.scrollTo(0, 0);
  };

  if (route === 'hub') return <Hub onOpen={go} />;

  const { Screen, levels } = GAMES[route];
  const level = levels.find((l) => l.id === levelIds[route]) ?? levels[0];
  if (!level) return <p className="p-8 text-center">No levels found for {route}.</p>;

  // key: each level mounts fresh with its own saved progress
  return (
    <Screen
      key={`${route}-${level.id}`}
      level={level}
      levels={levels}
      onSelectLevel={(l) => setLevelIds((ids) => ({ ...ids, [route]: l.id }))}
      onHome={() => go('hub')}
    />
  );
}
