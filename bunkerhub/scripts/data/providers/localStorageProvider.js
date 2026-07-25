function readAll(collection) {
  const raw = localStorage.getItem(`bunkerhub:${collection}`);
  return raw ? JSON.parse(raw) : [];
}

function writeAll(collection, data) {
  localStorage.setItem(`bunkerhub:${collection}`, JSON.stringify(data));
}

function agora() { return new Date().toISOString(); }

export const localStorageProvider = {
  async list(collection, filterFn = () => true) {
    return readAll(collection).filter(filterFn);
  },

  async listAtivos(collection, filterFn = () => true) {
    return readAll(collection).filter(item => item.ativo !== false && filterFn(item));
  },

  async get(collection, id) {
    return readAll(collection).find(item => item.id === id) || null;
  },

  async create(collection, data) {
    const all = readAll(collection);
    const item = {
      id: crypto.randomUUID(),
      ...data,
      ativo: data.ativo ?? true,
      createdAt: agora(),
      updatedAt: agora(),
    };
    all.push(item);
    writeAll(collection, all);
    return item;
  },

  async update(collection, id, patch) {
    const all = readAll(collection);
    const idx = all.findIndex(item => item.id === id);
    if (idx === -1) return null;
    all[idx] = { ...all[idx], ...patch, updatedAt: agora() };
    writeAll(collection, all);
    return all[idx];
  },

  async desativar(collection, id) { return this.update(collection, id, { ativo: false }); },
  async reativar(collection, id) { return this.update(collection, id, { ativo: true }); },

  async delete(collection, id) {
    const all = readAll(collection).filter(item => item.id !== id);
    writeAll(collection, all);
  },

  async seedIfEmpty(collection, seedData) {
    if (readAll(collection).length === 0) writeAll(collection, seedData);
  }
};
