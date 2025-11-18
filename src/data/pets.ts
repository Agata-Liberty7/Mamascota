// src/data/pets.ts
// 🐾 Единая работа с карточками питомцев (AsyncStorage)
// — поддерживает неполные карточки (species может отсутствовать при создании)
// — без дублирования кода, с миграциями id
// — наружу (в UI) отдаём всегда валидный Pet[]

// Импорты
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Pet, Species } from '../../types/pet';

// Ключи хранилища
const LIST_KEY = 'pets:list';
const ACTIVE_KEY = 'pets:activeId';

// Утилита генерации id (стабильно и коротко)
function genId() {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

// Тип записи в хранилище: допускаем частичный объект и species?: Species
type StoredPet = Partial<Pet> & { id: string; species?: Species };

// ───────────────────────────────────────────────────────────────────────────────
// ВНУТРЕННИЕ ПОМОЩНИКИ
// ───────────────────────────────────────────────────────────────────────────────

async function readRaw(): Promise<StoredPet[]> {
  const raw = await AsyncStorage.getItem(LIST_KEY);
  const list: StoredPet[] = raw ? JSON.parse(raw) : [];

  // Миграция: добавляем отсутствующие id
  let mutated = false;
  for (const p of list) {
    if (!p.id) {
      p.id = genId();
      mutated = true;
    }
  }
  if (mutated) {
    await AsyncStorage.setItem(LIST_KEY, JSON.stringify(list));
  }

  return list;
}

async function writeRaw(list: StoredPet[]) {
  await AsyncStorage.setItem(LIST_KEY, JSON.stringify(list));
}

/**
 * Преобразование "сырой" записи к полному типу Pet для UI.
 * Здесь только ДЛЯ ВЫДАЧИ в интерфейс ставим species 'exotic',
 * если он отсутствует в storage. Сам storage не переписываем.
 */
function toUiPet(p: StoredPet): Pet {
  return {
    id: p.id,
    name: p.name ?? '',
    species: (p.species ?? 'exotic') as Species,
    ageYears: p.ageYears,
    breed: p.breed,
    sex: p.sex,
    neutered: p.neutered ?? false,
  };
}

// ───────────────────────────────────────────────────────────────────────────────
// ПУБЛИЧНОЕ API
// ───────────────────────────────────────────────────────────────────────────────

/** Список питомцев для UI (всегда валидный Pet[]) */
export async function getPets(): Promise<Pet[]> {
  const list = await readRaw();
  return list.map(toUiPet);
}

/** То же, что getPets(), оставлено для совместимости с UI */
export async function getPetsForSettings(): Promise<Pet[]> {
  return getPets();
}

/** Сохранение текущего активного питомца */
export async function setCurrentPetId(id: string) {
  await AsyncStorage.setItem(ACTIVE_KEY, id);
}

/** Получение активного питомца */
export async function getCurrentPetId(): Promise<string | null> {
  return AsyncStorage.getItem(ACTIVE_KEY);
}

/** Удаление питомца по id (и коррекция activeId при необходимости) */
export async function deletePet(id: string) {
  const [list, activeId] = await Promise.all([readRaw(), getCurrentPetId()]);
  const next = list.filter(p => p.id !== id);
  await writeRaw(next);

  if (activeId === id) {
    // если удалили активного — сбросим/перевыберем
    const newActive = next.length ? next[0].id : '';
    if (newActive) await setCurrentPetId(newActive);
    else await AsyncStorage.removeItem(ACTIVE_KEY);
  }
}

/**
 * Создание/обновление карточки питомца.
 * species может быть опциональной — это норма для кейса "Добавить" (вид выберут позже).
 */
export async function upsertPet(
  pet: Partial<Omit<Pet, 'species'>> & { species?: Species }
) {
  const list = await readRaw();

  // Базовый слепок (безопасные дефолты), используется и при создании, и при обновлении
  const base: StoredPet = {
    id: pet.id ?? genId(),
    name: pet.name ?? '',
    species: pet.species,                // ← сохраняем как есть (может быть undefined)
    ageYears: pet.ageYears,
    breed: pet.breed,
    sex: pet.sex,
    neutered: pet.neutered ?? false,
  };

  const idx = list.findIndex(p => p.id === pet.id);

  if (idx >= 0) {
    // 🐾 Обновление существующего питомца
    list[idx] = { ...list[idx], ...base, ...pet };
  } else {
    // 🆕 Создание нового питомца
    list.push(base);
  }

  await writeRaw(list);
}

/** Для совместимости со старым кодом */
export const setActivePetId = setCurrentPetId;
export const getActivePetId = getCurrentPetId;
