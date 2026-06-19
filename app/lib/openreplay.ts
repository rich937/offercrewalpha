// lib/openreplay.ts
import Tracker from '@openreplay/tracker';

const tracker = new Tracker({
  projectKey: process.env.NEXT_PUBLIC_OPENREPLAY_KEY || '',
});

export default tracker;