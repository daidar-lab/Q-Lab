import { useState } from 'react';

const BASE_URL = import.meta.env.VITE_API_URL;

export function useExportPDF(nivel: 'dashboard' | 'detalhe' | 'faixa') {
  const [exportando, setExportando] = useState(false);

  async function exportar(payload: Record<string, any>) {
    setExportando(true);
    try {
      const token = localStorage.getItem('qlab_token');
      const baseUrlClean = BASE_URL?.endsWith('/') ? BASE_URL.slice(0, -1) : BASE_URL;

      const res = await fetch(`${baseUrlClean}/api/v1/export/${nivel}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Falha no export');

      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `qlab-${nivel}-${new Date().toISOString().slice(0,10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExportando(false);
    }
  }

  return { exportar, exportando };
}
