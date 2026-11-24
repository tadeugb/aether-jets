-- Carrega os JSONs de assets/data. Rodar da raiz do projeto: psql -d aether_jets -f db/seed.sql
SET search_path = aether;
\set ON_ERROR_STOP on
\set airports `cat assets/data/airports.json`
\set frota    `cat assets/data/frota.json`
\set catering `cat assets/data/catering.json`
\set pacotes  `cat assets/data/pacotes.json`

BEGIN;
CREATE TEMP TABLE j AS SELECT x FROM jsonb_array_elements(:'airports'::jsonb) x;

INSERT INTO regiao (nome) SELECT DISTINCT x->>'regiao' FROM j;
INSERT INTO pais   (nome) SELECT DISTINCT x->>'pais'   FROM j;
INSERT INTO estado (pais_id, sigla)
  SELECT DISTINCT p.id, x->>'estado' FROM j JOIN pais p ON p.nome = x->>'pais';

INSERT INTO aeroporto (icao, iata, nome, cidade, estado_id, regiao_id, lat, lon, pista_ft, escala_tecnica)
SELECT x->>'icao', nullif(x->>'iata',''), x->>'nome', nullif(x->>'cidade',''), e.id, r.id,
       (x->>'lat')::numeric, (x->>'lon')::numeric, (x->>'pista_ft')::int,
       coalesce((x->>'escalaTecnica')::boolean, false)
FROM j
JOIN pais p   ON p.nome = x->>'pais'
JOIN estado e ON e.pais_id = p.id AND e.sigla = x->>'estado'
JOIN regiao r ON r.nome = x->>'regiao';

INSERT INTO categoria_aeronave (id, nome)
SELECT DISTINCT x->>'categoria', x->>'categoriaNome' FROM jsonb_array_elements(:'frota'::jsonb) x;

INSERT INTO aeronave (id, categoria_id, nome, modelo, pax, alcance_km, velocidade_kmh, valor_hora, tarifa_km, imagem, descricao, ordem)
SELECT x->>'id', x->>'categoria', x->>'nome', x->>'modelo', (x->>'pax')::int, (x->>'alcance_km')::int,
       (x->>'velocidade_kmh')::int, (x->>'valor_hora')::numeric, (x->>'tarifa_km')::numeric, x->>'imagem', x->>'descricao', n
FROM jsonb_array_elements(:'frota'::jsonb) WITH ORDINALITY t(x, n);

INSERT INTO item_catering (id, categoria, nome, descricao, preco, unidade, alcool, tags, imagem, ordem)
SELECT x->>'id', x->>'categoria', x->>'nome', x->>'desc', (x->>'preco')::numeric, x->>'unidade',
       coalesce((x->>'alcool')::boolean,false), ARRAY(SELECT jsonb_array_elements_text(x->'tags')), x->>'imagem', n
FROM jsonb_array_elements(:'catering'::jsonb) WITH ORDINALITY t(x, n);

INSERT INTO pacote (id, aeronave_id, nome, destino, dias, noites, pax, preco, hotel, categoria_hotel, carro, motorista,
                    disponibilidade, imagem, descricao, incluidos, opcionais, ordem)
SELECT x->>'id', x->>'aeronaveId', x->>'nome', x->>'destino', (x->>'dias')::int, (x->>'noites')::int, (x->>'pax')::int,
       (x->>'preco')::numeric, x->>'hotel', x->>'categoriaHotel', x->>'carro', x->>'motorista', x->>'disponibilidade',
       x->>'imagem', x->>'descricao',
       ARRAY(SELECT jsonb_array_elements_text(x->'incluidos')), ARRAY(SELECT jsonb_array_elements_text(x->'opcionais')), n
FROM jsonb_array_elements(:'pacotes'::jsonb) WITH ORDINALITY t(x, n);
COMMIT;
