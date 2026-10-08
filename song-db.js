/*
 * LALI-O - songs/song-db.js
 * Storing songs you add (IndexedDB, in this browser only).
 */
"use strict";

const SONGDB = (() => {
  let dbp = null;
  const open = () => dbp || (dbp = new Promise((res, rej) => {
    try {
      const r = indexedDB.open("lalio-songs", 1);
      r.onupgradeneeded = () => r.result.createObjectStore("songs", { keyPath: "id" });
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    } catch (e) { rej(e); }
  }));
  const run = (mode, fn) => open().then(db => new Promise((res, rej) => {
    const tx = db.transaction("songs", mode), st = tx.objectStore("songs"), req = fn(st);
    tx.oncomplete = () => res(req && req.result); tx.onerror = () => rej(tx.error);
  }));
  return {
    all: () => run("readonly", st => st.getAll()).then(list => (list || []).filter(r => (r.acct || 1) === ACCT && r.kind !== "music")),
    get: (id) => run("readonly", st => st.get(id)),
    music: () => run("readonly", st => st.getAll()).then(list => (list || []).filter(r => (r.acct || 1) === ACCT && r.kind === "music")),
    clearMusic: async function () { const mine = await this.music(); for (const r of mine) await run("readwrite", st => st.delete(r.id)); },
    clearMine: async function () { const mine = await this.all(); for (const r of mine) await run("readwrite", st => st.delete(r.id)); },
    put: (rec) => run("readwrite", st => st.put(rec)),
    del: (id) => run("readwrite", st => st.delete(id)),
    clear: () => run("readwrite", st => st.clear()),
  };
})();
