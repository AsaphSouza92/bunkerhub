const listeners = {};

export function on(eventName, callback) {
  if (!listeners[eventName]) listeners[eventName] = [];
  listeners[eventName].push(callback);
  return () => off(eventName, callback);
}

export function off(eventName, callback) {
  if (!listeners[eventName]) return;
  listeners[eventName] = listeners[eventName].filter(cb => cb !== callback);
}

export function emit(eventName, payload) {
  if (!listeners[eventName]) return;
  listeners[eventName].forEach(cb => cb(payload));
}
