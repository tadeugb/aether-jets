-- Relatórios gerenciais (views). Incluído no fim do schema.sql; para aplicar sozinho:
--   psql -h localhost -U aether -d aether_jets -f db/relatorios.sql
SET search_path = aether, public;

-- 1. Faturamento por mês: só conta pagamento confirmado de passagem não cancelada
CREATE OR REPLACE VIEW rel_faturamento_mensal AS
SELECT to_char(date_trunc('month', p.partida), 'YYYY-MM')                          AS mes,
       count(*) FILTER (WHERE p.status = 'ativa')                                  AS passagens,
       count(*) FILTER (WHERE p.status = 'cancelada')                              AS canceladas,
       coalesce(sum(p.pax) FILTER (WHERE p.status = 'ativa'), 0)                   AS passageiros,
       coalesce(sum(g.valor) FILTER (WHERE p.status = 'ativa' AND g.status = 'pago'), 0)   AS receita_paga,
       coalesce(sum(g.valor) FILTER (WHERE p.status = 'ativa' AND g.status = 'pendente'), 0) AS a_receber
FROM passagem p JOIN pagamento g ON g.passagem_codigo = p.codigo
GROUP BY 1 ORDER BY 1;

-- 2. Rotas mais vendidas
CREATE OR REPLACE VIEW rel_rotas_mais_vendidas AS
SELECT o.cidade || ' (' || o.icao || ')' AS origem,
       d.cidade || ' (' || d.icao || ')' AS destino,
       count(*)                           AS passagens,
       sum(p.pax)                         AS passageiros,
       sum(p.valor_total)                 AS valor_total
FROM passagem p
JOIN aeroporto o ON o.icao = p.origem_icao
JOIN aeroporto d ON d.icao = p.destino_icao
WHERE p.status = 'ativa'
GROUP BY o.icao, o.cidade, d.icao, d.cidade
ORDER BY passagens DESC, valor_total DESC;

-- 3. Uso da frota: LEFT JOIN para listar também as aeronaves sem venda
CREATE OR REPLACE VIEW rel_uso_frota AS
SELECT a.nome                                         AS aeronave,
       k.nome                                         AS categoria,
       a.pax                                          AS capacidade,
       count(p.codigo)                                AS passagens,
       coalesce(sum(p.pax), 0)                        AS passageiros,
       round(100.0 * avg(p.pax::numeric / a.pax), 1)  AS ocupacao_media_pct,
       coalesce((SELECT sum(t.distancia_km) FROM passagem_trecho t JOIN passagem x ON x.codigo = t.passagem_codigo
                 WHERE x.aeronave_id = a.id AND x.status = 'ativa'), 0) AS km_por_sentido,
       coalesce(sum(p.valor_total), 0)                AS valor_total
FROM aeronave a
JOIN categoria_aeronave k ON k.id = a.categoria_id
LEFT JOIN passagem p ON p.aeronave_id = a.id AND p.status = 'ativa'
WHERE a.ativo
GROUP BY a.id, a.nome, k.nome, a.pax
ORDER BY passagens DESC, valor_total DESC;

-- 4. Catering mais vendido
CREATE OR REPLACE VIEW rel_catering_mais_vendido AS
SELECT i.nome, i.categoria,
       sum(c.quantidade)                    AS quantidade,
       sum(c.quantidade * c.preco_unitario) AS receita
FROM passagem_catering c
JOIN item_catering i ON i.id = c.item_id
JOIN passagem p ON p.codigo = c.passagem_codigo AND p.status = 'ativa'
GROUP BY i.id, i.nome, i.categoria
ORDER BY quantidade DESC, receita DESC;

-- 5. Melhores clientes
CREATE OR REPLACE VIEW rel_clientes AS
SELECT cl.nome, cl.email,
       count(p.codigo)                                   AS passagens,
       coalesce(sum(g.valor) FILTER (WHERE g.status = 'pago'), 0) AS total_pago,
       max(p.criado_em)::date                            AS ultima_compra
FROM cliente cl
JOIN passagem p  ON p.cliente_id = cl.id AND p.status = 'ativa'
JOIN pagamento g ON g.passagem_codigo = p.codigo
GROUP BY cl.id, cl.nome, cl.email
ORDER BY total_pago DESC;

-- 6. Formas de pagamento
CREATE OR REPLACE VIEW rel_pagamentos AS
SELECT g.metodo, g.status, count(*) AS quantidade, sum(g.valor) AS valor,
       round(avg(g.parcelas), 1) AS parcelas_media
FROM pagamento g JOIN passagem p ON p.codigo = g.passagem_codigo AND p.status = 'ativa'
GROUP BY g.metodo, g.status
ORDER BY valor DESC;

-- 7. Rede de aeroportos por região
CREATE OR REPLACE VIEW rel_rede_aeroportos AS
SELECT r.nome                                    AS regiao,
       count(DISTINCT e.pais_id)                 AS paises,
       count(*)                                  AS aeroportos,
       count(*) FILTER (WHERE a.escala_tecnica)  AS escalas_tecnicas,
       max(a.pista_ft)                           AS maior_pista_ft
FROM aeroporto a
JOIN regiao r ON r.id = a.regiao_id
JOIN estado e ON e.id = a.estado_id
GROUP BY r.nome
ORDER BY aeroportos DESC;

-- 8. Pacotes: ocupação do jato e preço por noite
CREATE OR REPLACE VIEW rel_pacotes AS
SELECT pc.nome AS pacote, pc.destino, a.nome AS aeronave,
       pc.pax || ' de ' || a.pax                 AS lugares,
       pc.dias, pc.noites, pc.preco,
       round(pc.preco / nullif(pc.noites, 0), 2) AS preco_por_noite
FROM pacote pc JOIN aeronave a ON a.id = pc.aeronave_id
ORDER BY pc.preco DESC;
