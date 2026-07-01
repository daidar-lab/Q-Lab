import { createClient } from 'redis';

const redisClient = createClient({
  url: process.env.REDIS_URL
});

redisClient.on('error', (err) => console.error('Redis Client Error', err));

// Inicializa a conexão
(async () => {
  await redisClient.connect();
  console.log('⚡ Conectado ao Redis com sucesso!');
})();

export { redisClient };