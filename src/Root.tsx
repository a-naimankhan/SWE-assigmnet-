import { useEffect, useState } from 'react';
import App from './App.tsx';
import SingleRoomChecker from './SingleRoomChecker.tsx';
import type { ExplainAdapter } from '@/ai/explain';

/** Hash routing keeps the build static (works on GitHub Pages without rewrites). */
export default function Root({ explainAdapter }: { explainAdapter: ExplainAdapter }) {
  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => {
    const onChange = () => setHash(window.location.hash);
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return hash === '#/single-room' ? <SingleRoomChecker /> : <App explainAdapter={explainAdapter} />;
}
