// packages/types/familia.ts
// Família analítica — determinada pela query de inspeção em runtime
// NUNCA derivar do DIM_TIPO_DE_RESULTADO direto — o tipo declarado não garante o formato real do valor

export type Familia = 'NUMERICO' | 'FAIXA' | 'CATEGORICO';