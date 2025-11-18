// app/logic/yamlReasoning.ts
export type Paso =
  | {
      id: number;
      тип: 'вопрос';
      вопрос: string;
      варианты: { [key: string]: number }[];
    }
  | {
      id: number;
      тип: 'диагноз';
      заголовок: string;
      действия?: string;
      примечания?: string;
      конец: true;
    };

export interface Алгоритм {
  название: string;
  категория: string;
  виды: string[];
  описание: string;
  схема: Paso[];
}

export class ReasoningEngine {
  steps: Paso[];
  currentId: number;
  finished: boolean;

  constructor(algorithm: Алгоритм) {
    this.steps = algorithm.схема;
    this.currentId = 1;
    this.finished = false;
  }

  getCurrentStep(): Paso | undefined {
    return this.steps.find((s) => s.id === this.currentId);
  }

  next(answer: string): Paso | null {
    const step = this.getCurrentStep();
    if (!step || this.finished) return null;

    if (step.тип === 'вопрос') {
      const cleanedAnswer = answer.trim().toLowerCase();
      const вариант = step.варианты.find((v) =>
        Object.keys(v)[0].toLowerCase() === cleanedAnswer
      );

      let nextId: number | undefined;

      if (вариант) {
        const matchedKey = Object.keys(вариант)[0];
        nextId = вариант[matchedKey];
      }

      if (nextId) {
        this.currentId = nextId;
        const nextStep = this.getCurrentStep();
        if (nextStep?.тип === 'диагноз') this.finished = true;
        return nextStep ?? null;
      }
    } else if (step.тип === 'диагноз') {
      this.finished = true;
      return step;
    }

    return null;
  }

}
