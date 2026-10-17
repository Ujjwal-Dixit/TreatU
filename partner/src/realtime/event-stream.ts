import { fetch } from 'expo/fetch';

export interface StreamEvent {
  type: string;
  data: unknown;
}

interface OpenEventStreamOptions {
  url: string;
  accessToken: string | null;
  signal: AbortSignal;
  onOpen: () => void;
  onEvent: (event: StreamEvent) => void;
}

/**
 * Minimal Server-Sent Events client over expo/fetch's streaming body.
 * React Native has no built-in EventSource, and the text/event-stream
 * format is simple enough that a ~40-line parser beats a polyfill
 * dependency. Resolves when the server closes the stream; rejects on a
 * network error or non-2xx — the caller owns reconnecting.
 */
export async function openEventStream({ url, accessToken, signal, onOpen, onEvent }: OpenEventStreamOptions) {
  const response = await fetch(url, {
    headers: {
      Accept: 'text/event-stream',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    signal,
  });
  if (!response.ok || !response.body) {
    throw new Error(`Event stream failed with status ${response.status}`);
  }

  const reader = response.body.getReader();
  signal.addEventListener('abort', () => void reader.cancel().catch(() => {}));
  onOpen();

  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) return;
    buffer += decoder.decode(value, { stream: true });

    // Events are separated by a blank line; keep any trailing partial one.
    const blocks = buffer.split(/\r?\n\r?\n/);
    buffer = blocks.pop() ?? '';
    for (const block of blocks) {
      const event = parseBlock(block);
      if (event) onEvent(event);
    }
  }
}

function parseBlock(block: string): StreamEvent | null {
  let type = 'message';
  const dataLines: string[] = [];
  for (const line of block.split(/\r?\n/)) {
    if (line.startsWith(':')) continue; // comment, e.g. the server's heartbeat
    const separator = line.indexOf(':');
    const field = separator === -1 ? line : line.slice(0, separator);
    const value = separator === -1 ? '' : line.slice(separator + 1).replace(/^ /, '');
    if (field === 'event') type = value;
    else if (field === 'data') dataLines.push(value);
  }
  if (dataLines.length === 0) return null;

  const raw = dataLines.join('\n');
  try {
    return { type, data: JSON.parse(raw) };
  } catch {
    return { type, data: raw };
  }
}
