import { useEffect, useState } from 'react';
import Hub from './Hub.jsx';
import { GAMES } from './games.js';
import { dayNumber } from './daily.js';

// The URL hash names the game (#rungs), so a refresh or Back stays sensible.
const readRoute = () => {
  const id = window.location.hash.slice(1);
  return GAMES.some((g) => g.id === id) ? id : 'hub';
};

// Today, unless a development build asks for another day with ?day=N.
const startDay = () => {
  const asked = Number(new URLSearchParams(window.location.search).get('day'));
  return import.meta.env.DEV && asked >= 1 ? asked : dayNumber();
};

export default function App() {
  const [route, setRoute] = useState(readRoute);
  const [day, setDay] = useState(startDay);   // the Wits number being played
  const [latest] = useState(() => Math.max(dayNumber(), startDay()));   // › stops here

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

  if (route === 'hub') return <Hub day={day} latest={latest} onDay={setDay} onOpen={go} />;
  const { Screen } = GAMES.find((g) => g.id === route);
  return <Screen key={`${route}-${day}`} day={day} onHome={() => go('hub')} />;
}
