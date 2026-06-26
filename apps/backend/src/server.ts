// apps/backend/src/server.ts

import 'dotenv/config';
import app from './app';

const PORT = Number(process.env.PORT ?? 3333);

app.listen(PORT, () => {
    console.log(`[Q/Lab API] rodando em http://:${PORT}`);
    console.log(`[Q/Lab API] ambiente: ${process.env.NODE_ENV ?? 'development'}`);
});