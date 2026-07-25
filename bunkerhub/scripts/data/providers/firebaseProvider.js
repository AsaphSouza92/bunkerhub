import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getFirestore, collection, doc, getDoc, getDocs,
  addDoc, updateDoc, deleteDoc
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { FIREBASE_CONFIG } from '../db.config.js';

const app = initializeApp(FIREBASE_CONFIG);
const firestore = getFirestore(app);

function agoraISO() { return new Date().toISOString(); }

export const firebaseProvider = {
  async list(collectionName, filterFn = () => true) {
    const snapshot = await getDocs(collection(firestore, collectionName));
    const itens = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    return itens.filter(filterFn);
  },

  async listAtivos(collectionName, filterFn = () => true) {
    const itens = await this.list(collectionName);
    return itens.filter(item => item.ativo !== false && filterFn(item));
  },

  async get(collectionName, id) {
    const snap = await getDoc(doc(firestore, collectionName, id));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  },

  async create(collectionName, dados) {
    const payload = { ...dados, ativo: dados.ativo ?? true, createdAt: agoraISO(), updatedAt: agoraISO() };
    const ref = await addDoc(collection(firestore, collectionName), payload);
    return { id: ref.id, ...payload };
  },

  async update(collectionName, id, patch) {
    await updateDoc(doc(firestore, collectionName, id), { ...patch, updatedAt: agoraISO() });
    return this.get(collectionName, id);
  },

  async desativar(collectionName, id) { return this.update(collectionName, id, { ativo: false }); },
  async reativar(collectionName, id) { return this.update(collectionName, id, { ativo: true }); },
  async delete(collectionName, id) { await deleteDoc(doc(firestore, collectionName, id)); },

  async seedIfEmpty(collectionName, seedData) {
    const existentes = await this.list(collectionName);
    if (existentes.length === 0) {
      for (const item of seedData) await addDoc(collection(firestore, collectionName), item);
    }
  },
};
