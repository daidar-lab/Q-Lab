import { request } from './api';
import type { Filial } from '../hooks/useFiliais';

export const getFiliais = () => request<Filial[]>('/api/filiais');
