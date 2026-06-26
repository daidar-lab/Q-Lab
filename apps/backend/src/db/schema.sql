-- apps/backend/src/db/migrations/001_create_usuarios.sql
-- Rodar no banco Q/Lab (não no B/LAB)

CREATE TABLE IF NOT EXISTS usuarios (
  id         INT          NOT NULL AUTO_INCREMENT,
  nome       VARCHAR(100) NOT NULL,
  login      VARCHAR(50)  NOT NULL,
  senha      VARCHAR(255) NOT NULL,  -- bcrypt hash
  role       ENUM('admin', 'user') NOT NULL DEFAULT 'user',
  ativo      TINYINT(1)   NOT NULL DEFAULT 1,
  criado_em  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_login (login)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Usuário admin inicial ────────────────────────────────────────────────────
-- Senha: Admin@2026 — TROCAR IMEDIATAMENTE após o primeiro login
-- Hash gerado com bcrypt rounds=12
INSERT INTO usuarios (nome, login, senha, role, ativo)
VALUES (
  'Administrador',
  'admin',
  '$2b$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'admin',
  1
);

CREATE TABLE IF NOT EXISTS cache_ia (
  id              VARCHAR(255) PRIMARY KEY,
  tipo_bloco      VARCHAR(50) NOT NULL,
  resposta_json   TEXT NOT NULL,
  createdAt       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_tipo_bloco (tipo_bloco)
);