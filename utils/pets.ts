import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Pet } from '../types/pet';

const LIST_KEY = 'pets:list';

function genId() {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Получить всех питомцев из AsyncStorage */
export async function getPets(): Promise<Pet[]> {
  const raw = await AsyncStorage.getItem(LIST_KEY);
  const list: Pet[] = raw ? JSON.parse(raw) : [];

  let changed = false;
  for (const p of list) {
    // миграция: у старых могло не быть id
    if (!p.id) {
      (p as any).id = genId();
      changed = true;
    }
    // миграция: убрать невалидные значения sex
    if (p.sex && p.sex !== 'male' && p.sex !== 'female') {
      delete (p as any).sex;
      changed = true;
    }
  }
  if (changed) await savePets(list);

  return list;
}

/** Сохранить всех питомцев */
export async function savePets(list: Pet[]) {
  await AsyncStorage.setItem(LIST_KEY, JSON.stringify(list));
}

/**
 * Добавить или обновить питомца:
 * 1. если есть id — обновляем по id
 * 2. если нет id — ищем дубль по (name+species+sex)
 * 3. если дубля нет — создаём нового
 */
export async function upsertPet(pet: Partial<Pet>): Promise<Pet> {
  const list = await getPets();

  // 1. Обновление по id
  if (pet.id) {
    const idx = list.findIndex(p => p.id === pet.id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...pet } as Pet;
      await savePets(list);
      return list[idx];
    }
  }

  // 2. Поиск дубля по name+species+sex
  const nameKey = (pet.name || '').trim().toLowerCase();
  const speciesKey = pet.species;
  const sexKey: Pet['sex'] =
    pet.sex === 'male' || pet.sex === 'female' ? pet.sex : undefined;

  const dup = list.find(p =>
    (p.name || '').trim().toLowerCase() === nameKey &&
    p.species === speciesKey &&
    (p.sex ?? undefined) === sexKey
  );

  if (dup) {
    const idx = list.findIndex(p => p.id === dup.id);
    const merged = { ...dup, ...pet, id: dup.id } as Pet;
    list[idx] = merged;
    await savePets(list);
    return merged;
  }

  // 3. Создание нового
  const created: Pet = {
    id: genId(),
    name: pet.name?.trim() || 'Безымянный',
    species: (pet.species as Pet['species']) || 'cat',
    sex: sexKey,
    ageYears: pet.ageYears,
    breed: pet.breed,
    neutered: pet.neutered ?? false,
    birthDate: pet.birthDate,
  };

  list.push(created);
  await savePets(list);
  return created;
}

/** Установить активного питомца (id сохраняется в AsyncStorage) */
const ACTIVE_KEY = 'pets:activeId';

export async function setActivePet(id: string) {
  await AsyncStorage.setItem(ACTIVE_KEY, id);
}

export async function getActivePetId() {
  return AsyncStorage.getItem(ACTIVE_KEY);
}
