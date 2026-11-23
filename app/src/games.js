// Every game on the opening screen, in order. `results()` lists the
// puzzles finished this visit as { label?, elapsed, detail }.
import Rungs, { rungsResults } from './rungs/Rungs.jsx';
import Lockpick, { lockpickResults } from './lockpick/Lockpick.jsx';
import ReelGaps, { reelGapsResults } from './reelgaps/ReelGaps.jsx';
import Relay, { relayResults } from './relay/Relay.jsx';
import Stowaway, { stowawayResults } from './stowaway/Stowaway.jsx';
import Poise, { poiseResults } from './poise/Poise.jsx';

export const GAMES = [
  { id: 'rungs', name: 'Rungs', blurb: 'Change one letter at a time, word to word.', Screen: Rungs, results: rungsResults },
  { id: 'lockpick', name: 'Lockpick', blurb: 'Before or after? Close in on the secret word.', Screen: Lockpick, results: lockpickResults },
  { id: 'reelgaps', name: 'Reel Gaps', blurb: 'Movie titles, minus the vowels. Beat the clock.', Screen: ReelGaps, results: reelGapsResults },
  { id: 'relay', name: 'Relay', blurb: 'Last letter starts the next word. Keep the chain going.', Screen: Relay, results: relayResults },
  { id: 'stowaway', name: 'Stowaway', blurb: 'A word is hiding across the gaps. Find it.', Screen: Stowaway, results: stowawayResults },
  { id: 'poise', name: 'Poise', blurb: 'Hang words on a mobile. Letters are weight.', Screen: Poise, results: poiseResults },
];
