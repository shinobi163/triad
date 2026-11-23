import { useEffect, useState } from 'react';
import Hub from './Hub.jsx';
import { GAMES } from './games.js';

// The URL hash names the game (#rungs), so a refresh or Back stays sensible.
const readRoute = () => {
  const id = window.location.hash.slice(1);
  return GAMES.some((g) => g.id === id) ? id : 'hub';
};

export default function App() {
  const [route, setRoute] = useState(readRoute);

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
  const { Screen } = GAMES.find((g) => g.id === route);
  return <Screen key={route} onHome={() => go('hub')} />;
}
