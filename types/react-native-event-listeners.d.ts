declare module "react-native-event-listeners" {
  export const EventRegister: {
    on(
      event: string,
      callback: (...args: any[]) => void
    ): string;
    emit(event: string, data?: any): void;
    removeEventListener(id: string): void;
  };
}
