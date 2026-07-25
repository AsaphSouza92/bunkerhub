import { supabase } from '../supabaseClient.js';

function agoraISO() { return new Date().toISOString(); }

function paraCamelCase(registro) {
  if (!registro) return registro;
  const { created_at, updated_at, ...resto } = registro;
  return { ...resto, createdAt: created_at, updatedAt: updated_at };
}

function paraSnakeCase(dados) {
  const { createdAt, updatedAt, ...resto } = dados;
  const payload = { ...resto };
  if (createdAt) payload.created_at = createdAt;
  if (updatedAt) payload.updated_at = updatedAt;
  return payload;
}

export const supabaseProvider = {
  async list(table, filterFn = () => true) {
    const { data, error } = await supabase.from(table).select('*');
    if (error) throw new Error(`Erro ao ler "${table}": ${error.message}`);
    return (data || []).map(paraCamelCase).filter(filterFn);
  },

  async listAtivos(table, filterFn = () => true) {
    const itens = await this.list(table);
    return itens.filter(item => item.ativo !== false && filterFn(item));
  },

  async get(table, id) {
    const { data, error } = await supabase.from(table).select('*').eq('id', id).single();
    if (error) return null;
    return paraCamelCase(data);
  },

  async create(table, dados) {
    const payload = paraSnakeCase({ ...dados, ativo: dados.ativo ?? true, createdAt: agoraISO(), updatedAt: agoraISO() });
    const { data, error } = await supabase.from(table).insert(payload).select().single();
    if (error) throw new Error(`Erro ao criar em "${table}": ${error.message}`);
    return paraCamelCase(data);
  },

  async update(table, id, patch) {
    const payload = paraSnakeCase({ ...patch, updatedAt: agoraISO() });
    const { data, error } = await supabase.from(table).update(payload).eq('id', id).select().single();
    if (error) throw new Error(`Erro ao atualizar em "${table}": ${error.message}`);
    return paraCamelCase(data);
  },

  async desativar(table, id) { return this.update(table, id, { ativo: false }); },
  async reativar(table, id) { return this.update(table, id, { ativo: true }); },

  async delete(table, id) {
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) throw new Error(`Erro ao remover de "${table}": ${error.message}`);
  },

  async seedIfEmpty(table, seedData) {
    const existentes = await this.list(table);
    if (existentes.length === 0) await supabase.from(table).insert(seedData.map(paraSnakeCase));
  },
};
