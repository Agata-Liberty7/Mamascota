import mitt from 'mitt';

type Events = {
  chatSessionStarted: void;
  chatSessionEnded: void; // ✅ добавлено новое событие
};

const eventBus = mitt<Events>();

export default eventBus;
