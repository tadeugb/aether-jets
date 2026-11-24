-- Aether Jets: esquema PostgreSQL. Rodar: psql -d aether_jets -f db/schema.sql
DROP SCHEMA IF EXISTS aether CASCADE;
CREATE SCHEMA aether;
SET search_path = aether, public;
-- Busca sem acento ('sao paulo' acha 'São Paulo'). Criar uma vez como superusuário:
--   sudo -u postgres psql -d aether_jets -c 'CREATE EXTENSION IF NOT EXISTS unaccent SCHEMA public'

-- ===== Locais =====
CREATE TABLE regiao (
  id   smallserial PRIMARY KEY,
  nome text NOT NULL UNIQUE                       -- 'Sudeste', 'Europa', ...
);

CREATE TABLE pais (
  id   smallserial PRIMARY KEY,
  nome text NOT NULL UNIQUE
);

CREATE TABLE estado (
  id      serial PRIMARY KEY,
  pais_id smallint NOT NULL REFERENCES pais(id) ON DELETE RESTRICT,
  sigla   varchar(3) NOT NULL,
  UNIQUE (pais_id, sigla)                         -- 'SP' existe só uma vez por país
);

-- Cidade fica como texto: são ~5.250 cidades para 5.603 aeroportos (quase 1:1) e 163 vêm sem nome.
CREATE TABLE aeroporto (
  icao           char(4) PRIMARY KEY,             -- chave natural: única e sempre 4 letras
  iata           char(3),                         -- opcional e não é única (ex.: PDP repetido)
  nome           text NOT NULL,
  cidade         text,
  estado_id      int  NOT NULL REFERENCES estado(id) ON DELETE RESTRICT,
  regiao_id      smallint NOT NULL REFERENCES regiao(id) ON DELETE RESTRICT,
  lat            numeric(8,5) NOT NULL CHECK (lat BETWEEN -90 AND 90),
  lon            numeric(8,5) NOT NULL CHECK (lon BETWEEN -180 AND 180),
  pista_ft       int NOT NULL CHECK (pista_ft > 0),
  escala_tecnica boolean NOT NULL DEFAULT false
);
CREATE INDEX aeroporto_iata_idx   ON aeroporto (iata);
CREATE INDEX aeroporto_estado_idx ON aeroporto (estado_id);  -- PG não indexa FK sozinho
CREATE INDEX aeroporto_regiao_idx ON aeroporto (regiao_id);
CREATE INDEX aeroporto_escala_idx ON aeroporto (pista_ft) WHERE escala_tecnica;

-- View plana para a API: devolve o mesmo formato do airports.json atual
CREATE VIEW v_aeroporto AS
SELECT a.icao, coalesce(a.iata,'') AS iata, a.nome, a.cidade, e.sigla AS estado, p.nome AS pais,
       r.nome AS regiao, a.lat, a.lon, a.pista_ft, a.escala_tecnica
FROM aeroporto a
JOIN estado e ON e.id = a.estado_id
JOIN pais   p ON p.id = e.pais_id
JOIN regiao r ON r.id = a.regiao_id;

-- ===== Catálogo =====
CREATE TABLE categoria_aeronave (
  id   text PRIMARY KEY,                          -- 'leves', 'medios', ...
  nome text NOT NULL
);

CREATE TABLE aeronave (
  id             text PRIMARY KEY,                -- slug: 'learjet-75'
  categoria_id   text NOT NULL REFERENCES categoria_aeronave(id) ON DELETE RESTRICT,
  nome           text NOT NULL,
  modelo         text,
  pax            smallint NOT NULL CHECK (pax > 0),
  alcance_km     int NOT NULL CHECK (alcance_km > 0),
  velocidade_kmh int NOT NULL CHECK (velocidade_kmh > 0),
  valor_hora     numeric(12,2) NOT NULL CHECK (valor_hora >= 0),
  tarifa_km      numeric(10,2) NOT NULL CHECK (tarifa_km >= 0),
  imagem         text,
  descricao      text,
  ordem          int NOT NULL DEFAULT 0,          -- ordem de exibição no site
  ativo          boolean NOT NULL DEFAULT true    -- exclusão lógica: jato já vendido em passagem não pode sumir
);
CREATE INDEX aeronave_categoria_idx ON aeronave (categoria_id);

CREATE TABLE item_catering (
  id        text PRIMARY KEY,
  categoria text NOT NULL CHECK (categoria IN ('bebidas','snacks','refeicoes')),
  nome      text NOT NULL,
  descricao text,
  preco     numeric(10,2) NOT NULL CHECK (preco >= 0),
  unidade   text,
  alcool    boolean NOT NULL DEFAULT false,
  tags      text[] NOT NULL DEFAULT '{}',
  imagem    text,
  ordem     int NOT NULL DEFAULT 0,
  ativo     boolean NOT NULL DEFAULT true          -- exclusão lógica (item já vendido fica no histórico)
);

CREATE TABLE pacote (
  id              text PRIMARY KEY,
  aeronave_id     text NOT NULL REFERENCES aeronave(id) ON DELETE RESTRICT, -- mesma regra do painel: não apaga jato com pacote
  nome            text NOT NULL,
  destino         text NOT NULL,
  dias            smallint NOT NULL CHECK (dias > 0),
  noites          smallint NOT NULL CHECK (noites >= 0),
  pax             smallint NOT NULL CHECK (pax > 0),
  preco           numeric(12,2) NOT NULL CHECK (preco >= 0),
  hotel           text, categoria_hotel text, carro text, motorista text,
  disponibilidade text, imagem text, descricao text,
  incluidos       text[] NOT NULL DEFAULT '{}',
  opcionais       text[] NOT NULL DEFAULT '{}',
  ordem           int NOT NULL DEFAULT 0,
  CHECK (noites <= dias)
);
CREATE INDEX pacote_aeronave_idx ON pacote (aeronave_id);

-- Pacote não pode pedir mais passageiros que o jato comporta (o painel já bloqueia isso)
CREATE FUNCTION checa_pax_pacote() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.pax > (SELECT pax FROM aeronave WHERE id = NEW.aeronave_id) THEN
    RAISE EXCEPTION 'pacote % pede % pax, acima da capacidade da aeronave', NEW.id, NEW.pax;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER pacote_pax BEFORE INSERT OR UPDATE ON pacote FOR EACH ROW EXECUTE FUNCTION checa_pax_pacote();

-- ===== Clientes e passagens =====
CREATE TABLE cliente (
  id         bigserial PRIMARY KEY,
  nome       text NOT NULL,
  email      text NOT NULL UNIQUE,
  telefone   text,
  criado_em  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE passagem (
  codigo          varchar(12) PRIMARY KEY,        -- o código gerado hoje no front
  cliente_id      bigint REFERENCES cliente(id) ON DELETE SET NULL,
  origem_icao     char(4) NOT NULL REFERENCES aeroporto(icao),
  destino_icao    char(4) NOT NULL REFERENCES aeroporto(icao),
  aeronave_id     text REFERENCES aeronave(id) ON DELETE SET NULL,
  tipo            text NOT NULL CHECK (tipo IN ('ida','ida-volta')),
  partida         timestamptz NOT NULL,
  retorno         timestamptz,
  pax             smallint NOT NULL CHECK (pax > 0),
  status          text NOT NULL DEFAULT 'ativa' CHECK (status IN ('ativa','cancelada')),
  valor_total     numeric(12,2) NOT NULL CHECK (valor_total >= 0),
  snapshot        jsonb NOT NULL,                 -- cópia de preços/aeronave na compra; não muda se o catálogo mudar
  criado_em       timestamptz NOT NULL DEFAULT now(),
  CHECK (origem_icao <> destino_icao),
  CHECK ((tipo = 'ida' AND retorno IS NULL) OR (tipo = 'ida-volta' AND retorno > partida))
);
CREATE INDEX passagem_cliente_idx  ON passagem (cliente_id);
CREATE INDEX passagem_origem_idx   ON passagem (origem_icao);
CREATE INDEX passagem_destino_idx  ON passagem (destino_icao);
CREATE INDEX passagem_aeronave_idx ON passagem (aeronave_id);

-- Trechos da rota (escalas técnicas). PK composta: (passagem, ordem)
CREATE TABLE passagem_trecho (
  passagem_codigo varchar(12) NOT NULL REFERENCES passagem(codigo) ON DELETE CASCADE,
  ordem           smallint NOT NULL CHECK (ordem > 0),
  de_icao         char(4) NOT NULL REFERENCES aeroporto(icao),
  para_icao       char(4) NOT NULL REFERENCES aeroporto(icao),
  distancia_km    numeric(9,1) NOT NULL,
  PRIMARY KEY (passagem_codigo, ordem)
);

-- N:N passagem x catering, com preço congelado no momento da compra
CREATE TABLE passagem_catering (
  passagem_codigo varchar(12) NOT NULL REFERENCES passagem(codigo) ON DELETE CASCADE,
  item_id         text NOT NULL REFERENCES item_catering(id) ON DELETE RESTRICT,
  quantidade      smallint NOT NULL CHECK (quantidade > 0),
  preco_unitario  numeric(10,2) NOT NULL,
  PRIMARY KEY (passagem_codigo, item_id)
);

-- 1:1 com passagem (PK = FK). Só bandeira e 4 últimos dígitos, igual ao front.
CREATE TABLE pagamento (
  passagem_codigo varchar(12) PRIMARY KEY REFERENCES passagem(codigo) ON DELETE CASCADE,
  metodo          text NOT NULL CHECK (metodo IN ('credito','debito','pix','cheque','transferencia')),
  status          text NOT NULL CHECK (status IN ('pendente','pago')),
  parcelas        smallint NOT NULL DEFAULT 1 CHECK (parcelas BETWEEN 1 AND 12),
  bandeira        text,
  cartao_final    char(4),
  titular_email   text,
  valor           numeric(12,2) NOT NULL CHECK (valor >= 0),
  pago_em         timestamptz
);

-- Relatórios gerenciais (views)
\ir relatorios.sql
