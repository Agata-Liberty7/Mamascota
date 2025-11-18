// proxy/check-agent-access.mjs
import 'dotenv/config';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

console.log('\n🔍 Проверяем доступ к кастомным агентам (Agent SDK)…\n');

try {
  // Пробуем запросить список доступных агентов
  const list = await openai.agents.list();
  console.log('✅ Agent SDK доступен!');
  console.log('📦 Найдено агентов:', list.data?.length || 0);
  for (const ag of list.data || []) {
    console.log(`— ${ag.name} (${ag.id})`);
  }
  console.log('\nЕсли в списке есть VetManual — встроенный промт доступен.');
} catch (err) {
  // Если SDK не активирован — появится 404 или Unknown path
  console.warn('⚠️ Agent SDK пока не активирован для этого аккаунта.');
  console.warn('Ответ сервера:', err.message);
  console.log('\n→ Пока используем локальный промт VetManual.md.');
}

console.log('\n');
