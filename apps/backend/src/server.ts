// apps/backend/src/server.ts

import 'dotenv/config';
import app from './app';
import cron from 'node-cron';
import { warmDashboardCache } from './jobs/cache-warmer';

const PORT = Number(process.env.PORT ?? 3333);

app.listen(PORT, () => {
    console.log(`[Q/Lab API] rodando em http://:${PORT}`);
    console.log(`[Q/Lab API] ambiente: ${process.env.NODE_ENV ?? 'development'}`);

    // Roda todo dia às 05:00
    cron.schedule('0 5 * * *', () => {
        warmDashboardCache().catch(err =>
            console.error('Cache warmer falhou:', err)
        );
    });
});