export type Species =
  | ''
  | 'cat'
  | 'dog'
  | 'rabbit'
  | 'ferret'
  | 'bird'
  | 'rodent'
  | 'reptile'
  | 'fish'
  | 'exotic';


export type Pet = {
  id: string;
  name: string;
  species: Species;
  breed?: string;
  sex?: 'male' | 'female';
  neutered?: boolean;
  birthDate?: string; // ISO
  ageYears?: number;
};
