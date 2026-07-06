-- apps/backend/src/db/migrations/001_create_usuarios.sql
-- Rodar no banco Q/Lab (não no B/LAB)

CREATE TABLE IF NOT EXISTS usuarios (
  id                INT            NOT NULL AUTO_INCREMENT,
  nome              VARCHAR(100)   NOT NULL,
  login             VARCHAR(50)    NOT NULL,
  senha             VARCHAR(255)   NOT NULL,  -- bcrypt hash
  role              ENUM('admin', 'user') NOT NULL DEFAULT 'user',
  meta_conformidade DECIMAL(5,2)   NOT NULL DEFAULT 95.00, -- Movido direto para a criação
  ativo             TINYINT(1)     NOT NULL DEFAULT 1,
  criado_em         DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_login (login)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Usuário admin inicial ────────────────────────────────────────────────────
-- Senha: Admin@2026 — TROCAR IMEDIATAMENTE após o primeiro login
INSERT INTO usuarios (nome, login, senha, role, ativo, meta_conformidade)
VALUES (
  'Administrador',
  'admin',
  '$2b$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'admin',
  1,
  95.00
);

-- ─── Cache da IA (Groq) ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cache_ia (
  id            VARCHAR(255) NOT NULL,
  tipo_bloco    VARCHAR(50)  NOT NULL,
  resposta_json LONGTEXT     NOT NULL, -- Alterado para LONGTEXT para evitar estouro de bytes
  criado_em     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP, -- Padronizado snake_case

  PRIMARY KEY (id),
  INDEX idx_tipo_bloco (tipo_bloco)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Vínculo N:N Usuário x Filial ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS usuario_filial (
  id             INT        NOT NULL AUTO_INCREMENT,
  cod_usuario    INT        NOT NULL,
  cod_filial     INT        NOT NULL, -- Código vindo do cadastro de filiais
  filial_padrao  TINYINT(1) NOT NULL DEFAULT 0,
  criado_em      DATETIME   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME   NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_usuario_filial (cod_usuario, cod_filial),
  CONSTRAINT fk_usuario_filial_usuario 
    FOREIGN KEY (cod_usuario) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;