#!/usr/bin/env python3
"""Gera docs/Relatorio_Trabalho_Pratico_BD.pdf a partir do banco real (estrutura, restrições e resultados dos relatórios).

Uso (da raiz do projeto, com o PostgreSQL ligado, o psql no PATH e o Google Chrome ou Edge instalado):
    python3 tools/gerar_relatorio.py [pasta-com-prints]      (no Windows: py tools\\gerar_relatorio.py)

Edite INTEGRANTES abaixo antes de gerar a versão final.
"""
import base64
import html
import json
import os
import re
import subprocess
import sys
from datetime import date

INTEGRANTES = ['[Nome do integrante 1]', '[Nome do integrante 2]', '[Nome do integrante 3]']
CURSO, DISCIPLINA, PROFESSOR = 'Sistemas de Informação', 'Banco de Dados', 'Prof. Sinaide Bezerra'

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOCS = os.path.join(ROOT, 'docs')
SHOTS = sys.argv[1] if len(sys.argv) > 1 else os.path.join(DOCS, 'prints')
DB = ['psql', '-h', 'localhost', '-U', 'aether', '-d', 'aether_jets', '-X', '-q']
ENV = {**os.environ, 'PGPASSWORD': os.environ.get('PGPASSWORD', 'aether')}
e = html.escape


def q(sql):
    """Roda uma consulta e devolve as linhas como dicionários (via JSON do próprio Postgres)."""
    out = subprocess.run(DB + ['-tA', '-c', f'SELECT coalesce(json_agg(_r), \'[]\') FROM ({sql}) _r'],
                         capture_output=True, text=True, env=ENV, check=True).stdout
    return json.loads(out)


def read(path):
    with open(os.path.join(ROOT, path), encoding='utf-8') as f:
        return f.read()


# ---------------------------------------------------------------- dados do banco
COLS = q("""SELECT c.table_name AS t, c.column_name AS c, c.ordinal_position AS n,
  CASE WHEN c.data_type = 'character' THEN 'char(' || c.character_maximum_length || ')'
       WHEN c.data_type = 'character varying' THEN 'varchar(' || c.character_maximum_length || ')'
       WHEN c.data_type = 'numeric' THEN 'numeric(' || c.numeric_precision || ',' || c.numeric_scale || ')'
       WHEN c.data_type = 'ARRAY' THEN 'text[]'
       WHEN c.data_type = 'timestamp with time zone' THEN 'timestamptz'
       ELSE c.data_type END AS tipo,
  c.is_nullable = 'NO' AS obrig, c.column_default AS def
  FROM information_schema.columns c JOIN information_schema.tables t USING (table_schema, table_name)
  WHERE c.table_schema = 'aether' AND t.table_type = 'BASE TABLE' ORDER BY 1, 3""")
CONS = q("""SELECT cl.relname AS t, co.conname AS nome, co.contype AS tipo, pg_get_constraintdef(co.oid) AS def,
  (SELECT array_agg(a.attname ORDER BY a.attnum) FROM pg_attribute a WHERE a.attrelid = co.conrelid AND a.attnum = ANY(co.conkey)) AS cols,
  fr.relname AS ref, (SELECT array_agg(a.attname) FROM pg_attribute a WHERE a.attrelid = co.confrelid AND a.attnum = ANY(co.confkey)) AS refcols
  FROM pg_constraint co JOIN pg_class cl ON cl.oid = co.conrelid JOIN pg_namespace n ON n.oid = cl.relnamespace
  LEFT JOIN pg_class fr ON fr.oid = co.confrelid
  WHERE n.nspname = 'aether' AND co.contype IN ('p','f','u','c') ORDER BY 1, 3 DESC, 2""")
COUNTS = q("""SELECT 'aeroporto' t, count(*) n FROM aether.aeroporto UNION ALL SELECT 'pais', count(*) FROM aether.pais
  UNION ALL SELECT 'estado', count(*) FROM aether.estado UNION ALL SELECT 'regiao', count(*) FROM aether.regiao
  UNION ALL SELECT 'aeronave', count(*) FROM aether.aeronave WHERE ativo UNION ALL SELECT 'item_catering', count(*) FROM aether.item_catering WHERE ativo
  UNION ALL SELECT 'pacote', count(*) FROM aether.pacote UNION ALL SELECT 'passagem', count(*) FROM aether.passagem
  UNION ALL SELECT 'cliente', count(*) FROM aether.cliente""")
N = {r['t']: r['n'] for r in COUNTS}
VERSAO = subprocess.run(DB + ['-tA', '-c', 'SHOW server_version'], capture_output=True, text=True, env=ENV).stdout.split()[0]

TABLES = {}
for c in COLS:
    TABLES.setdefault(c['t'], []).append(c)
PK = {(c['t'], col) for c in CONS if c['tipo'] == 'p' for col in c['cols']}
FK = {}
for c in CONS:
    if c['tipo'] == 'f':
        for col, rc in zip(c['cols'], c['refcols']):
            FK[(c['t'], col)] = (c['ref'], rc)

DESC_T = {
    'regiao': 'Região geográfica do aeroporto: macrorregião no Brasil, continente nos demais países.',
    'pais': 'País onde ficam os estados e aeroportos.',
    'estado': 'Estado ou província de um país.',
    'aeroporto': 'Aeroporto da rede, usado como origem, destino ou escala técnica.',
    'categoria_aeronave': 'Classe da aeronave (leves, médios, pesados, turboélices).',
    'aeronave': 'Jato ou turboélice da frota disponível para fretamento.',
    'item_catering': 'Item do cardápio de bordo vendido com a passagem.',
    'pacote': 'Viagem completa (voo, hotel, carro) vendida sob consulta.',
    'cliente': 'Pessoa ou empresa que comprou passagens.',
    'passagem': 'Reserva de voo fretado (ida ou ida e volta).',
    'passagem_trecho': 'Cada perna do voo, incluindo escalas técnicas para reabastecer.',
    'passagem_catering': 'Itens de catering escolhidos em uma passagem (associação N:N).',
    'pagamento': 'Pagamento da passagem (1:1). Guarda só bandeira e 4 últimos dígitos do cartão.',
}
DESC_C = {
    'regiao.id': 'Identificador da região', 'regiao.nome': 'Nome da região (único)',
    'pais.id': 'Identificador do país', 'pais.nome': 'Nome do país (único)',
    'estado.id': 'Identificador do estado', 'estado.pais_id': 'País ao qual o estado pertence', 'estado.sigla': 'Sigla do estado (única dentro do país)',
    'aeroporto.icao': 'Código ICAO de 4 letras (chave natural)', 'aeroporto.iata': 'Código IATA de 3 letras (opcional, pode repetir)',
    'aeroporto.nome': 'Nome do aeroporto', 'aeroporto.cidade': 'Cidade atendida', 'aeroporto.estado_id': 'Estado onde fica',
    'aeroporto.regiao_id': 'Região do aeroporto', 'aeroporto.lat': 'Latitude em graus (-90 a 90)', 'aeroporto.lon': 'Longitude em graus (-180 a 180)',
    'aeroporto.pista_ft': 'Comprimento da maior pista, em pés', 'aeroporto.escala_tecnica': 'Se serve de parada técnica para reabastecimento',
    'categoria_aeronave.id': 'Código da categoria', 'categoria_aeronave.nome': 'Nome exibido',
    'aeronave.id': 'Código da aeronave (slug ou UUID)', 'aeronave.categoria_id': 'Categoria da aeronave', 'aeronave.nome': 'Nome comercial',
    'aeronave.modelo': 'Modelo do fabricante', 'aeronave.pax': 'Capacidade de passageiros', 'aeronave.alcance_km': 'Autonomia em km',
    'aeronave.velocidade_kmh': 'Velocidade de cruzeiro', 'aeronave.valor_hora': 'Preço da hora de voo (R$)',
    'aeronave.tarifa_km': 'Preço por km (valor_hora / velocidade)', 'aeronave.imagem': 'Foto (caminho ou URL)', 'aeronave.descricao': 'Texto de apresentação',
    'aeronave.ordem': 'Ordem de exibição no site', 'aeronave.ativo': 'Falso = removida do catálogo (exclusão lógica)',
    'item_catering.id': 'Código do item', 'item_catering.categoria': 'bebidas, snacks ou refeicoes', 'item_catering.nome': 'Nome do item',
    'item_catering.descricao': 'Descrição', 'item_catering.preco': 'Preço unitário (R$)', 'item_catering.unidade': 'Unidade de venda (garrafa, porção...)',
    'item_catering.alcool': 'Bebida alcoólica (venda só para maiores de 18)', 'item_catering.tags': 'Etiquetas (vegano, sem glúten...)',
    'item_catering.imagem': 'Foto', 'item_catering.ordem': 'Ordem de exibição', 'item_catering.ativo': 'Falso = removido do cardápio',
    'pacote.id': 'Código do pacote', 'pacote.aeronave_id': 'Aeronave incluída no pacote', 'pacote.nome': 'Nome do pacote', 'pacote.destino': 'Destino',
    'pacote.dias': 'Duração em dias', 'pacote.noites': 'Noites de hotel (até o número de dias)', 'pacote.pax': 'Passageiros (até a capacidade da aeronave)',
    'pacote.preco': 'Preço inicial (R$)', 'pacote.hotel': 'Hotel', 'pacote.categoria_hotel': 'Categoria do hotel', 'pacote.carro': 'Tipo de carro',
    'pacote.motorista': 'Motorista', 'pacote.disponibilidade': 'Datas disponíveis', 'pacote.imagem': 'Foto', 'pacote.descricao': 'Descrição',
    'pacote.incluidos': 'Itens incluídos', 'pacote.opcionais': 'Itens opcionais', 'pacote.ordem': 'Ordem de exibição',
    'cliente.id': 'Identificador do cliente', 'cliente.nome': 'Nome do titular', 'cliente.email': 'E-mail (único)', 'cliente.telefone': 'Telefone',
    'cliente.criado_em': 'Data do cadastro',
    'passagem.codigo': 'Localizador da reserva (gerado no site)', 'passagem.cliente_id': 'Cliente que comprou', 'passagem.origem_icao': 'Aeroporto de origem',
    'passagem.destino_icao': 'Aeroporto de destino (diferente da origem)', 'passagem.aeronave_id': 'Aeronave escolhida', 'passagem.tipo': 'ida ou ida-volta',
    'passagem.partida': 'Data e hora da ida', 'passagem.retorno': 'Data e hora da volta (só em ida-volta, depois da ida)', 'passagem.pax': 'Passageiros',
    'passagem.status': 'ativa ou cancelada', 'passagem.valor_total': 'Valor da viagem (R$)', 'passagem.snapshot': 'Cópia dos dados no momento da compra (JSON)',
    'passagem.criado_em': 'Data da compra',
    'passagem_trecho.passagem_codigo': 'Passagem dona do trecho', 'passagem_trecho.ordem': 'Posição do trecho na rota (1, 2, ...)',
    'passagem_trecho.de_icao': 'Aeroporto de saída do trecho', 'passagem_trecho.para_icao': 'Aeroporto de chegada do trecho', 'passagem_trecho.distancia_km': 'Distância do trecho',
    'passagem_catering.passagem_codigo': 'Passagem', 'passagem_catering.item_id': 'Item de catering', 'passagem_catering.quantidade': 'Quantidade (> 0)',
    'passagem_catering.preco_unitario': 'Preço do item na data da compra',
    'pagamento.passagem_codigo': 'Passagem paga (PK e FK: relação 1:1)', 'pagamento.metodo': 'credito, debito, pix, cheque ou transferencia',
    'pagamento.status': 'pendente ou pago', 'pagamento.parcelas': 'Número de parcelas (1 a 12)', 'pagamento.bandeira': 'Bandeira do cartão',
    'pagamento.cartao_final': '4 últimos dígitos do cartão', 'pagamento.titular_email': 'E-mail do pagador', 'pagamento.valor': 'Valor cobrado (R$)',
    'pagamento.pago_em': 'Data da confirmação',
}
ORDER = ['regiao', 'pais', 'estado', 'aeroporto', 'categoria_aeronave', 'aeronave', 'item_catering', 'pacote',
         'cliente', 'passagem', 'passagem_trecho', 'passagem_catering', 'pagamento']
assert set(ORDER) == set(TABLES), set(TABLES) ^ set(ORDER)

RELS = [
    ('rel_faturamento_mensal', 'Faturamento por mês', 'Passagens, cancelamentos, passageiros, receita paga e valores a receber por mês do voo.'),
    ('rel_rotas_mais_vendidas', 'Rotas mais vendidas', 'Pares origem-destino com mais passagens ativas e o valor total.'),
    ('rel_uso_frota', 'Uso da frota', 'Passagens, ocupação média e quilômetros por aeronave, incluindo as que ainda não venderam.'),
    ('rel_catering_mais_vendido', 'Catering mais vendido', 'Quantidade e receita por item do cardápio.'),
    ('rel_clientes', 'Melhores clientes', 'Clientes ordenados pelo total pago.'),
    ('rel_pagamentos', 'Formas de pagamento', 'Quantidade e valor por forma e situação do pagamento.'),
    ('rel_rede_aeroportos', 'Rede de aeroportos por região', 'Países, aeroportos, escalas técnicas e maior pista por região.'),
    ('rel_pacotes', 'Pacotes', 'Lugares usados no jato, preço e preço por noite de cada pacote.'),
]
REL_DATA = {v: q(f'SELECT * FROM aether.{v}') for v, _, _ in RELS}


# ---------------------------------------------------------------- diagramas (SVG)
def der_svg():
    W, H = 1140, 790
    ent = {  # nome: (x, y, fraca?)
        'PAÍS': (100, 50, 0), 'ESTADO': (100, 250, 0), 'AEROPORTO': (100, 500, 0), 'REGIÃO': (100, 735, 0),
        'PACOTE': (560, 50, 0), 'CLIENTE': (560, 250, 0), 'PASSAGEM': (560, 500, 0), 'TRECHO': (560, 735, 1),
        'CATEGORIA': (1020, 50, 0), 'AERONAVE': (1020, 250, 0), 'ITEM CATERING': (1020, 560, 0), 'PAGAMENTO': (1020, 735, 0),
    }
    rel = [  # (nome, x, y, ent A, card A, ent B, card B, identificadora?)
        ('possui', 100, 150, 'PAÍS', '1', 'ESTADO', 'N', 0),
        ('localiza', 100, 375, 'ESTADO', '1', 'AEROPORTO', 'N', 0),
        ('pertence', 100, 620, 'REGIÃO', '1', 'AEROPORTO', 'N', 0),
        ('origem', 330, 440, 'AEROPORTO', '1', 'PASSAGEM', 'N', 0),
        ('destino', 330, 560, 'AEROPORTO', '1', 'PASSAGEM', 'N', 0),
        ('liga', 330, 735, 'AEROPORTO', '2', 'TRECHO', 'N', 0),
        ('compra', 560, 375, 'CLIENTE', '1', 'PASSAGEM', 'N', 0),
        ('compõe', 560, 620, 'PASSAGEM', '1', 'TRECHO', 'N', 1),
        ('inclui', 790, 150, 'AERONAVE', '1', 'PACOTE', 'N', 0),
        ('classifica', 1020, 150, 'CATEGORIA', '1', 'AERONAVE', 'N', 0),
        ('opera', 790, 375, 'AERONAVE', '1', 'PASSAGEM', 'N', 0),
        ('consome', 790, 530, 'PASSAGEM', 'N', 'ITEM CATERING', 'M', 0),
        ('quita', 790, 680, 'PASSAGEM', '1', 'PAGAMENTO', '1', 0),
    ]
    ew, eh, dw, dh = 150, 46, 104, 52
    out = [f'<svg viewBox="0 0 {W} {H}" xmlns="http://www.w3.org/2000/svg" font-family="Liberation Sans, Arial, sans-serif" role="img" aria-label="Diagrama entidade-relacionamento">']

    def edge(x, y, tx, ty, w, h):
        # ponto na borda do retângulo/losango centrado em (x,y) na direção de (tx,ty)
        dx, dy = tx - x, ty - y
        if dx == 0 and dy == 0:
            return x, y
        s = min((w / 2) / abs(dx) if dx else 1e9, (h / 2) / abs(dy) if dy else 1e9)
        return x + dx * s, y + dy * s

    def dedge(x, y, tx, ty):
        dx, dy = tx - x, ty - y
        s = 1 / (abs(dx) / (dw / 2) + abs(dy) / (dh / 2))
        return x + dx * s, y + dy * s

    for name, rx, ry, a, ca, b, cb, ident in rel:
        for en, card in ((a, ca), (b, cb)):
            ex, ey, _ = ent[en]
            x1, y1 = dedge(rx, ry, ex, ey)
            x2, y2 = edge(ex, ey, rx, ry, ew, eh)
            out.append(f'<line x1="{x1:.0f}" y1="{y1:.0f}" x2="{x2:.0f}" y2="{y2:.0f}" stroke="#333" stroke-width="1.4"/>')
            if ident and en == b:  # participação total do lado fraco
                out.append(f'<line x1="{x1 + 4:.0f}" y1="{y1:.0f}" x2="{x2 + 4:.0f}" y2="{y2:.0f}" stroke="#333" stroke-width="1.4"/>')
            lx, ly = x2 + (x1 - x2) * 0.28, y2 + (y1 - y2) * 0.28
            out.append(f'<text x="{lx + 8:.0f}" y="{ly + 4:.0f}" font-size="13" font-weight="700" fill="#6D0F23">{card}</text>')
        pts = f'{rx},{ry - dh / 2} {rx + dw / 2},{ry} {rx},{ry + dh / 2} {rx - dw / 2},{ry}'
        out.append(f'<polygon points="{pts}" fill="#f3ece4" stroke="#333" stroke-width="1.4"/>')
        if ident:
            p2 = f'{rx},{ry - dh / 2 + 6} {rx + dw / 2 - 10},{ry} {rx},{ry + dh / 2 - 6} {rx - dw / 2 + 10},{ry}'
            out.append(f'<polygon points="{p2}" fill="none" stroke="#333" stroke-width="1"/>')
        out.append(f'<text x="{rx}" y="{ry + 4}" font-size="12" text-anchor="middle" font-style="italic">{name}</text>')
    # atributos do relacionamento N:M
    for i, at in enumerate(['quantidade', 'preço unitário']):
        ax, ay = 700 + i * 180, 470
        out.append(f'<line x1="790" y1="{530 - dh / 2}" x2="{ax}" y2="{ay + 13}" stroke="#777" stroke-width="1"/>')
        out.append(f'<ellipse cx="{ax}" cy="{ay}" rx="56" ry="14" fill="#fff" stroke="#777"/><text x="{ax}" y="{ay + 4}" font-size="11" text-anchor="middle">{at}</text>')
    for name, (x, y, weak) in ent.items():
        out.append(f'<rect x="{x - ew / 2}" y="{y - eh / 2}" width="{ew}" height="{eh}" fill="#fff" stroke="#333" stroke-width="1.6"/>')
        if weak:
            out.append(f'<rect x="{x - ew / 2 + 4}" y="{y - eh / 2 + 4}" width="{ew - 8}" height="{eh - 8}" fill="none" stroke="#333"/>')
        out.append(f'<text x="{x}" y="{y + 5}" font-size="13.5" font-weight="700" text-anchor="middle">{name}</text>')
    out.append('</svg>')
    return '\n'.join(out)


def relational_svg():
    # 3 colunas: localização | vendas | catálogo. FKs entre colunas vizinhas cruzam o vão; na mesma coluna fazem laço pela lateral.
    X1, X2, X3 = 60, 450, 840
    pos = {'regiao': (X1, 20), 'pais': (X1, 110), 'estado': (X1, 200), 'aeroporto': (X1, 330),
           'cliente': (X2, 20), 'passagem': (X2, 170), 'passagem_trecho': (X2, 450), 'pagamento': (X2, 600), 'passagem_catering': (X2, 815),
           'categoria_aeronave': (X3, 20), 'aeronave': (X3, 110), 'item_catering': (X3, 390), 'pacote': (X3, 640)}
    loop_side = {X1: 'left', X2: 'right', X3: 'right'}
    BW, HH, RH = 280, 24, 16.5
    W, H = 1180, 980
    out = [f'<svg viewBox="0 0 {W} {H}" xmlns="http://www.w3.org/2000/svg" font-family="Liberation Sans, Arial, sans-serif" role="img" aria-label="Diagrama relacional">',
           '<defs><marker id="ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#6D0F23"/></marker></defs>']

    def rowy(t, col):
        i = [c['c'] for c in TABLES[t]].index(col)
        return pos[t][1] + HH + RH * i + RH / 2

    loops = {}
    for (t, col), (rt, rc) in FK.items():
        sx, tx = pos[t][0], pos[rt][0]
        y1, y2 = rowy(t, col), rowy(rt, rc)
        if sx == tx:
            k = loops[sx] = loops.get(sx, -1) + 1
            d = 22 + 12 * k
            if loop_side[sx] == 'left':
                x = sx
                path = f'M{x},{y1} H{x - d} V{y2} H{x}'
            else:
                x = sx + BW
                path = f'M{x},{y1} H{x + d} V{y2} H{x}'
        else:
            right = tx > sx
            x1 = sx + BW if right else sx
            x2 = tx if right else tx + BW
            c = abs(x2 - x1) / 2
            c1, c2 = (x1 + c, x2 - c) if right else (x1 - c, x2 + c)
            path = f'M{x1},{y1} C{c1},{y1} {c2},{y2} {x2},{y2}'
        out.append(f'<path d="{path}" fill="none" stroke="#6D0F23" stroke-width="1.5" marker-end="url(#ar)"/>')
        out.append(f'<circle cx="{path.split()[0][1:].split(",")[0]}" cy="{y1}" r="2.6" fill="#6D0F23"/>')
    for t, (x, y) in pos.items():
        cols = TABLES[t]
        h = HH + RH * len(cols) + 4
        out.append(f'<rect x="{x}" y="{y}" width="{BW}" height="{h}" rx="4" fill="#fff" stroke="#333" stroke-width="1.3"/>')
        out.append(f'<rect x="{x}" y="{y}" width="{BW}" height="{HH}" rx="4" fill="#2a2d33"/><text x="{x + 8}" y="{y + 16.5}" font-size="13.5" font-weight="700" fill="#fff">{t}</text>')
        for i, c in enumerate(cols):
            yy = y + HH + RH * i + 12.5
            key = 'PK' if (t, c['c']) in PK else ''
            if (t, c['c']) in FK:
                key = (key + ' FK').strip()
            w = 'font-weight="700"' if 'PK' in key else ''
            u = 'text-decoration="underline"' if 'PK' in key else ''
            out.append(f'<text x="{x + 8}" y="{yy}" font-size="11" fill="#6D0F23" font-weight="700">{key}</text>')
            out.append(f'<text x="{x + 50}" y="{yy}" font-size="12" {w} {u}>{c["c"]}{"" if c["obrig"] else "?"}</text>')
            out.append(f'<text x="{x + BW - 8}" y="{yy}" font-size="11" fill="#666" text-anchor="end">{e(c["tipo"])}</text>')
    out.append('</svg>')
    return '\n'.join(out)


# ---------------------------------------------------------------- HTML
def img(name, alt, caption):
    p = os.path.join(SHOTS, name)
    if not os.path.exists(p):
        return f'<p class="falta">[Imagem {e(name)} não encontrada]</p>'
    b = base64.b64encode(open(p, 'rb').read()).decode()
    return f'<figure><img src="data:image/png;base64,{b}" alt="{e(alt)}"><figcaption>{e(caption)}</figcaption></figure>'


def table(rows, cols=None, money=(), num=()):
    if not rows:
        return '<p class="nota">Sem registros no momento da geração.</p>'
    cols = cols or list(rows[0].keys())

    def fmt(c, v):
        if v is None:
            return '—'
        if c in money:
            return 'R$ ' + f'{float(v):,.2f}'.replace(',', 'X').replace('.', ',').replace('X', '.')
        if isinstance(v, (int, float)):
            return f'{v:,}'.replace(',', '.') if isinstance(v, int) else f'{v:,.1f}'.replace(',', 'X').replace('.', ',').replace('X', '.')
        return str(v)
    isnum = lambda c: c in money or c in num or isinstance(rows[0][c], (int, float))
    head = ''.join(f'<th class="{"r" if isnum(c) else ""}">{e(c)}</th>' for c in cols)
    body = ''.join('<tr>' + ''.join(f'<td class="{"r" if c in money or c in num or isinstance(r[c], (int, float)) else ""}">{e(fmt(c, r[c]))}</td>' for c in cols) + '</tr>' for r in rows)
    return f'<table><thead><tr>{head}</tr></thead><tbody>{body}</tbody></table>'


def code(sql, title=None):
    t = f'<p class="code-title">{e(title)}</p>' if title else ''
    return f'{t}<pre><code>{e(sql.strip())}</code></pre>'


def api_sql():
    """Extrai do server.js cada comando SQL, agrupado pela função onde aparece."""
    src = read('server.js')
    groups, current = [], None
    for m in re.finditer(r"^(?:async )?function (\w+)|AIRPORT_SQL \+ '([^']*)'|(`[^`]*`|'(?:SELECT|INSERT|UPDATE|DELETE|BEGIN|COMMIT|ROLLBACK)[^']*')", src, re.M):
        if m.group(1):
            current = m.group(1)
            continue
        if m.group(2) is not None:
            body = '<AIRPORT_SQL>' + m.group(2)
        elif m.group(3):
            body = m.group(3)[1:-1]
        else:
            continue
        if not re.match(r'\s*(SELECT|INSERT|UPDATE|DELETE|BEGIN|COMMIT|ROLLBACK|\$\{|<AIRPORT_SQL>)', body):
            continue
        if body.startswith('${') and 'WHERE' not in body:
            continue
        body = body.replace('${AIRPORT_SQL}', '<AIRPORT_SQL>').replace('${rel[1]}', '<view do relatório escolhido>')
        body = re.sub(r'\n {2,}', '\n  ', body)
        if not groups or groups[-1][0] != current:
            groups.append((current, []))
        if body not in groups[-1][1]:
            groups[-1][1].append(body)
    return groups


API_DESC = {
    'searchAirports': 'Busca de aeroportos do autocomplete (GET /api/aeroportos?q=)',
    'loadCatalog': 'Leitura do catálogo (GET /api/catalogo e catalog-seed.js)',
    'saveCatalog': 'Gravação do catálogo pelo painel, numa transação (PUT /api/catalogo)',
    'upsertTicket': 'Gravação da passagem com trechos, catering e pagamento (PUT /api/passagens/:codigo)',
    'route': 'Demais rotas: aeroporto por ICAO, airports.js, consulta de passagem e relatórios',
}

CSS = """
@page { size: A4; margin: 22mm 18mm 20mm 18mm; }
* { box-sizing: border-box; }
body { font-family: 'Liberation Serif', 'Times New Roman', serif; font-size: 11.5pt; line-height: 1.5; color: #1d1f23; margin: 0; }
h1, h2, h3, h4, .capa, th, figcaption, .code-title, .nota, .tag { font-family: 'Liberation Sans', Arial, sans-serif; }
h1 { font-size: 19pt; margin: 0 0 10pt; color: #6D0F23; break-after: avoid; }
h2 { font-size: 14pt; margin: 18pt 0 6pt; break-after: avoid; }
h3 { font-size: 12pt; margin: 14pt 0 4pt; break-after: avoid; }
p { margin: 0 0 7pt; text-align: justify; }
ul, ol { margin: 0 0 8pt; padding-left: 18pt; } li { margin-bottom: 2pt; }
.cap { break-before: page; }
.capa { height: 250mm; display: flex; flex-direction: column; justify-content: space-between; text-align: center; }
.capa .topo { font-size: 12pt; line-height: 1.6; } .capa .titulo { font-size: 24pt; font-weight: 700; color: #6D0F23; margin-bottom: 6pt; }
.capa .sub { font-size: 14pt; color: #444; } .capa .grupo { font-size: 12pt; line-height: 1.7; } .capa .rodape { font-size: 11pt; }
table { width: 100%; border-collapse: collapse; margin: 4pt 0 10pt; font-family: 'Liberation Sans', Arial, sans-serif; font-size: 8.8pt; break-inside: auto; }
th { background: #2a2d33; color: #fff; text-align: left; padding: 4pt 5pt; font-weight: 700; }
td { padding: 3pt 5pt; border-bottom: 0.5pt solid #ccc; vertical-align: top; }
tr { break-inside: avoid; } tbody tr:nth-child(even) td { background: #f6f3ef; }
td.r, th.r { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
pre { background: #f6f3ef; border-left: 3pt solid #6D0F23; padding: 6pt 8pt; font-family: 'Liberation Mono', monospace; font-size: 7.6pt; line-height: 1.35; white-space: pre-wrap; word-break: break-word; margin: 0 0 10pt; }
.code-title { font-weight: 700; font-size: 9.5pt; margin: 10pt 0 3pt; break-after: avoid; }
figure { margin: 6pt 0 12pt; break-inside: avoid; text-align: center; }
figure img, figure svg { max-width: 100%; border: 0.5pt solid #bbb; }
figure.diag svg { border: 0; }
figcaption { font-size: 9pt; color: #555; margin-top: 4pt; }
.nota { font-size: 9.5pt; color: #555; background: #f6f3ef; padding: 5pt 8pt; border-radius: 3pt; }
.falta { color: #b00; }
.sumario li { margin-bottom: 1pt; }
.tag { display: inline-block; font-size: 8pt; font-weight: 700; padding: 0 4pt; border-radius: 2pt; background: #6D0F23; color: #fff; }
.dict-t { break-inside: avoid; }
"""


def build():
    hoje = date.today()
    meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
    h = []
    add = h.append

    # ---------- capa
    add(f'''<section class="capa"><div class="topo">{e(CURSO)}<br>Disciplina: {e(DISCIPLINA)}<br>{e(PROFESSOR)}</div>
    <div><div class="titulo">Aether Jets</div><div class="sub">Sistema de reservas de voos executivos fretados<br>Relatório do Trabalho Prático</div></div>
    <div class="grupo"><strong>Integrantes</strong><br>{"<br>".join(e(n) for n in INTEGRANTES)}</div>
    <div class="rodape">{meses[hoje.month - 1].capitalize()} de {hoje.year}</div></section>''')

    # ---------- sumário
    add('''<section class="cap"><h1>Sumário</h1><ol class="sumario">
    <li>Introdução</li><li>Análise de objetivos<ol><li>Descrição do problema</li><li>Situação atual</li><li>Análise de alternativas</li></ol></li>
    <li>Análise de requisitos<ol><li>Detalhamento da solução</li><li>Casos de uso</li><li>Tabela de requisitos</li></ol></li>
    <li>Modelagem do domínio<ol><li>Restrições de integridade</li><li>Dicionário de dados</li></ol></li>
    <li>Projeto de banco de dados<ol><li>Sistema gerenciador (SGBD)</li><li>Diagrama entidade-relacionamento (DER)</li><li>Diagrama relacional</li><li>Decisões de projeto</li></ol></li>
    <li>A aplicação<ol><li>Arquitetura e execução</li><li>Telas e interação do usuário</li><li>Relatórios gerenciais</li><li>Código SQL</li></ol></li>
    <li>Conclusão</li></ol></section>''')

    # ---------- 1 introdução
    n_aero = f'{N["aeroporto"]:,}'.replace(',', '.')
    add(f'''<section class="cap"><h1>1. Introdução</h1>
    <p>Este relatório documenta o trabalho prático da disciplina de Banco de Dados: a construção do <strong>Aether Jets</strong>, um sistema de informação para uma empresa de fretamento de jatos executivos. O sistema permite cotar voos entre aeroportos do mundo todo, montar a passagem com aeronave e cardápio de bordo, registrar o pagamento e acompanhar as reservas. Um painel administrativo mantém o catálogo (aeronaves, catering e pacotes) e emite relatórios gerenciais.</p>
    <p>Os dados ficam em um banco <strong>PostgreSQL {e(VERSAO)}</strong> com {len(TABLES)} tabelas, {len(RELS)} views de relatório e uma função de gatilho. A base de aeroportos tem {n_aero} registros reais (fonte OurAirports), distribuídos em {N["pais"]} países. Uma API em Node.js faz a ponte entre as páginas web e o banco.</p>
    <p>O relatório segue a estrutura proposta na especificação, que corresponde às etapas T1 a T5 do trabalho:</p>
    <ul>
    <li><strong>Seção 2 – Análise de objetivos (T1):</strong> o problema, os envolvidos e as alternativas de solução.</li>
    <li><strong>Seção 3 – Análise de requisitos (T1):</strong> objetivos dos usuários, casos de uso e requisitos funcionais e não funcionais.</li>
    <li><strong>Seção 4 – Modelagem do domínio:</strong> restrições de integridade e dicionário de dados.</li>
    <li><strong>Seção 5 – Projeto de banco de dados (T2 e T3):</strong> SGBD escolhido, DER e diagrama relacional.</li>
    <li><strong>Seção 6 – A aplicação (T4 e T5):</strong> telas, relatórios e todo o código SQL usado.</li>
    <li><strong>Seção 7 – Conclusão:</strong> resultados, limitações e próximos passos.</li>
    </ul></section>''')

    # ---------- 2 objetivos
    add('''<section class="cap"><h1>2. Análise de objetivos</h1>
    <h2>2.1 Descrição do problema</h2>
    <p>Empresas de fretamento executivo costumam atender o cliente por telefone e WhatsApp. Cada cotação é calculada à mão: o atendente estima a distância, verifica se a aeronave tem autonomia para o trecho, procura aeroportos para escalas técnicas quando o jato não alcança o destino, soma taxas e serviços de bordo e envia o valor por mensagem. As reservas e os pagamentos ficam espalhados em planilhas e conversas.</p>
    <p>Esse processo gera três problemas principais:</p>
    <ul>
    <li><strong>Demora e erro na cotação:</strong> o cálculo de rota, escalas e preço depende de conhecimento técnico e é refeito a cada pedido.</li>
    <li><strong>Informação dispersa:</strong> não há um registro único de clientes, passagens, itens de catering vendidos e pagamentos.</li>
    <li><strong>Falta de visão gerencial:</strong> a gerência não sabe com facilidade o faturamento do mês, as rotas mais procuradas ou o uso de cada aeronave.</li>
    </ul>
    <p>O Aether Jets resolve isso com um site onde o próprio cliente faz a cotação e a reserva, um banco de dados que centraliza as informações e um painel administrativo para manter o catálogo e acompanhar os resultados.</p>
    <h2>2.2 Situação atual</h2>
    <p>Os atores (stakeholders) envolvidos e as dependências entre eles:</p>
    <table><thead><tr><th>Ator</th><th>Papel</th><th>Depende de</th></tr></thead><tbody>
    <tr><td>Cliente (passageiro ou empresa)</td><td>Solicita cotação, compra a passagem, escolhe o cardápio e paga.</td><td>Atendente para o preço; operador para a aeronave disponível.</td></tr>
    <tr><td>Atendente / concierge</td><td>Calcula cotações, registra reservas, organiza pacotes e catering.</td><td>Gerente para preços e catálogo; operador aéreo para disponibilidade.</td></tr>
    <tr><td>Gerente comercial</td><td>Define preços, frota oferecida, pacotes e acompanha o faturamento.</td><td>Atendente para os dados de vendas.</td></tr>
    <tr><td>Operador aéreo / tripulação</td><td>Opera o voo, confirma pista, combustível e escalas técnicas.</td><td>Reserva confirmada com rota, data e passageiros.</td></tr>
    <tr><td>Fornecedor de catering</td><td>Prepara os itens de bordo.</td><td>Lista de itens e quantidades de cada voo.</td></tr>
    <tr><td>Financeiro</td><td>Confirma pagamentos e reembolsos de cancelamentos.</td><td>Registro do pagamento de cada passagem.</td></tr>
    </tbody></table>
    <h2>2.3 Análise de alternativas</h2>
    <p>Objetivos de cada stakeholder no contexto do problema:</p>
    <table><thead><tr><th>Stakeholder</th><th>Objetivos</th></tr></thead><tbody>
    <tr><td>Cliente</td><td>Saber o preço na hora, comparar aeronaves, reservar sem depender de atendimento e consultar as próprias passagens.</td></tr>
    <tr><td>Atendente</td><td>Parar de calcular cotações à mão e ter todas as reservas num único lugar.</td></tr>
    <tr><td>Gerente</td><td>Atualizar frota, cardápio e pacotes sem programador e ver relatórios de vendas.</td></tr>
    <tr><td>Operador e fornecedor</td><td>Receber rota, escalas, passageiros e itens de bordo de forma consistente.</td></tr>
    <tr><td>Financeiro</td><td>Saber o que está pago, pendente ou cancelado.</td></tr>
    </tbody></table>
    <p>Soluções consideradas:</p>
    <table><thead><tr><th>Alternativa</th><th>Vantagens</th><th>Desvantagens</th></tr></thead><tbody>
    <tr><td>1. Manter planilhas e WhatsApp</td><td>Custo zero, sem mudança de processo.</td><td>Continua lento, sujeito a erro e sem relatórios.</td></tr>
    <tr><td>2. Comprar um software de gestão de fretamento</td><td>Pronto para uso.</td><td>Caro, genérico, não calcula escalas na rede própria, dados fora do controle da empresa.</td></tr>
    <tr><td><strong>3. Sistema web próprio com banco relacional (escolhida)</strong></td><td>Cotação automática com escalas, dados centralizados com integridade garantida pelo banco, relatórios sob medida.</td><td>Exige desenvolvimento e manutenção.</td></tr>
    </tbody></table>
    <p>A alternativa 3 foi escolhida por atender todos os stakeholders e por permitir aplicar os conceitos da disciplina: modelagem, normalização, integridade referencial e consultas de agregação.</p></section>''')

    # ---------- 3 requisitos
    add('''<section class="cap"><h1>3. Análise de requisitos</h1>
    <h2>3.1 Detalhamento da solução</h2>
    <p>Os usuários do sistema são o <strong>cliente</strong>, que usa o site público, e o <strong>administrador</strong> (gerente ou atendente), que usa o painel. Os objetivos de cada um em relação ao sistema:</p>
    <ul>
    <li><strong>Cliente:</strong> buscar aeroportos pelo nome da cidade ou pelo código; simular a cotação e ver quais jatos fazem a rota; montar a passagem (ida ou ida e volta, data, passageiros, aeronave, cardápio e serviços); pagar por cartão, Pix, cheque ou transferência; consultar, pagar e cancelar suas passagens.</li>
    <li><strong>Administrador:</strong> entrar com usuário e senha; cadastrar, editar e excluir aeronaves, itens de catering e pacotes; consultar os relatórios gerenciais de vendas, frota, clientes e rede de aeroportos.</li>
    </ul>
    <h2>3.2 Casos de uso</h2>
    <table><thead><tr><th>Código</th><th>Caso de uso</th><th>Ator</th><th>Cenário principal</th></tr></thead><tbody>
    <tr><td>UC01</td><td>Buscar aeroporto</td><td>Cliente</td><td>O cliente digita parte do nome, cidade ou código; o sistema lista os aeroportos mais relevantes (código exato, cidade, nome), sem diferenciar acentos.</td></tr>
    <tr><td>UC02</td><td>Simular cotação</td><td>Cliente</td><td>Informa origem, destino, data e passageiros; o sistema calcula a distância, as escalas técnicas necessárias para cada aeronave e o preço.</td></tr>
    <tr><td>UC03</td><td>Criar passagem</td><td>Cliente</td><td>Escolhe tipo de viagem, aeronave, cardápio e serviços; o sistema valida capacidade, data mínima e rota.</td></tr>
    <tr><td>UC04</td><td>Pagar passagem</td><td>Cliente</td><td>Escolhe a forma de pagamento e parcelas; o sistema grava a passagem, os trechos, os itens de catering e o pagamento numa única transação.</td></tr>
    <tr><td>UC05</td><td>Consultar e cancelar passagem</td><td>Cliente</td><td>Vê suas passagens, confirma pagamento pendente ou cancela com reembolso calculado.</td></tr>
    <tr><td>UC06</td><td>Entrar no painel</td><td>Administrador</td><td>Informa usuário e senha; o servidor devolve um token válido por 8 horas.</td></tr>
    <tr><td>UC07</td><td>Manter aeronaves</td><td>Administrador</td><td>Inclui, altera ou exclui aeronaves; o banco impede excluir aeronave usada em pacote ou reduzir a capacidade abaixo da exigida por um pacote.</td></tr>
    <tr><td>UC08</td><td>Manter catering</td><td>Administrador</td><td>Inclui, altera ou exclui itens do cardápio de bordo.</td></tr>
    <tr><td>UC09</td><td>Manter pacotes</td><td>Administrador</td><td>Inclui, altera ou exclui pacotes ligados a uma aeronave.</td></tr>
    <tr><td>UC10</td><td>Emitir relatórios</td><td>Administrador</td><td>Escolhe um dos relatórios gerenciais e vê o resultado em tabela.</td></tr>
    </tbody></table>
    <h2>3.3 Tabela de requisitos</h2>
    <table><thead><tr><th>Código</th><th>Requisito funcional</th><th>Caso de uso</th></tr></thead><tbody>
    <tr><td>RF01</td><td>Pesquisar aeroportos por código ICAO/IATA, cidade, nome ou país, ignorando acentos.</td><td>UC01</td></tr>
    <tr><td>RF02</td><td>Calcular rota com escalas técnicas, respeitando 90% da autonomia da aeronave e pista mínima de 6.000 pés.</td><td>UC02</td></tr>
    <tr><td>RF03</td><td>Calcular o preço: tarifa por km, taxa de 8%, taxas por escala, catering e serviços.</td><td>UC02, UC03</td></tr>
    <tr><td>RF04</td><td>Registrar passagem com cliente, origem, destino, aeronave, datas, passageiros e valor.</td><td>UC03, UC04</td></tr>
    <tr><td>RF05</td><td>Registrar os trechos da rota e os itens de catering com o preço da data da compra.</td><td>UC04</td></tr>
    <tr><td>RF06</td><td>Registrar o pagamento (forma, parcelas, situação) sem guardar número completo de cartão nem CVV.</td><td>UC04</td></tr>
    <tr><td>RF07</td><td>Consultar uma passagem pelo código; confirmar pagamento e cancelar.</td><td>UC05</td></tr>
    <tr><td>RF08</td><td>Autenticar o administrador antes de qualquer alteração no catálogo ou consulta a relatórios.</td><td>UC06</td></tr>
    <tr><td>RF09</td><td>Incluir, alterar, listar e excluir aeronaves, itens de catering e pacotes (CRUD).</td><td>UC07–UC09</td></tr>
    <tr><td>RF10</td><td>Impedir exclusão de aeronave ligada a pacote e pacote com mais passageiros que a aeronave.</td><td>UC07, UC09</td></tr>
    <tr><td>RF11</td><td>Emitir relatórios: faturamento mensal, rotas mais vendidas, uso da frota, catering mais vendido, melhores clientes, formas de pagamento, rede de aeroportos e pacotes.</td><td>UC10</td></tr>
    </tbody></table>
    <table><thead><tr><th>Código</th><th>Requisito não funcional</th></tr></thead><tbody>
    <tr><td>RNF01</td><td>Banco relacional PostgreSQL com integridade garantida por PK, FK, UNIQUE, CHECK e gatilho, e não só pela aplicação.</td></tr>
    <tr><td>RNF02</td><td>Operações compostas (passagem + trechos + catering + pagamento; catálogo inteiro) em transação única: ou grava tudo, ou nada.</td></tr>
    <tr><td>RNF03</td><td>Consultas parametrizadas em todas as rotas da API, contra injeção de SQL.</td></tr>
    <tr><td>RNF04</td><td>Interface web responsiva, utilizável em celular (largura de 390 px).</td></tr>
    <tr><td>RNF05</td><td>Busca de aeroportos com resposta em menos de 300 ms na base de 5.603 aeroportos.</td></tr>
    <tr><td>RNF06</td><td>Testes automatizados da API (npm test).</td></tr>
    </tbody></table></section>''')

    # ---------- 4 domínio
    cons_rows = []
    tipo = {'p': 'Chave primária', 'f': 'Chave estrangeira', 'u': 'Unicidade', 'c': 'Verificação (CHECK)'}
    for c in sorted(CONS, key=lambda c: (ORDER.index(c['t']), 'pfuc'.index(c['tipo']))):
        cons_rows.append({'Tabela': c['t'], 'Tipo': tipo[c['tipo']], 'Definição': c['def']})
    cons_rows.append({'Tabela': 'pacote', 'Tipo': 'Gatilho (trigger)', 'Definição': 'pacote_pax: antes de INSERT/UPDATE, recusa pacote com pax maior que a capacidade da aeronave'})
    dict_html = []
    for t in ORDER:
        rows = []
        for c in TABLES[t]:
            k = []
            if (t, c['c']) in PK:
                k.append('PK')
            if (t, c['c']) in FK:
                rt, rc = FK[(t, c['c'])]
                k.append(f'FK → {rt}.{rc}')
            rows.append({'Coluna': c['c'], 'Tipo': c['tipo'], 'Nulo': 'não' if c['obrig'] else 'sim', 'Chave': ', '.join(k), 'Descrição': DESC_C.get(f'{t}.{c["c"]}', '')})
        dict_html.append(f'<div class="dict-t"><h3>{e(t)}</h3><p>{e(DESC_T[t])}</p>{table(rows)}</div>')
    add(f'''<section class="cap"><h1>4. Modelagem do domínio</h1>
    <p>O domínio tem três grupos de informação: <strong>localização</strong> (região, país, estado e aeroporto), <strong>catálogo</strong> (categoria, aeronave, item de catering e pacote) e <strong>vendas</strong> (cliente, passagem, trecho, catering da passagem e pagamento). O diagrama da seção 5 mostra as entidades e seus relacionamentos; esta seção lista as restrições e o significado de cada atributo.</p>
    <h2>4.1 Restrições de integridade</h2>
    <p>Todas as regras abaixo são verificadas pelo próprio PostgreSQL. Uma gravação que viole qualquer uma delas é recusada, mesmo que venha de fora da aplicação.</p>
    {table(cons_rows)}
    <p>Ações referenciais adotadas:</p>
    <ul>
    <li><strong>ON DELETE RESTRICT</strong> (país, estado, região, categoria, aeronave de pacote, item de catering vendido): não se apaga um registro que outro usa.</li>
    <li><strong>ON DELETE CASCADE</strong> (trechos, catering e pagamento da passagem): são partes da passagem e saem junto com ela.</li>
    <li><strong>ON DELETE SET NULL</strong> (cliente e aeronave da passagem): a passagem continua no histórico mesmo sem o cadastro de origem.</li>
    <li><strong>Exclusão lógica</strong> (coluna <code>ativo</code>): aeronaves e itens de catering já vendidos ficam no banco, só deixam de aparecer no catálogo.</li>
    </ul>
    <h2>4.2 Dicionário de dados</h2>
    <p>Na coluna Chave: PK = chave primária; FK = chave estrangeira, com a tabela e a coluna referenciadas.</p>
    {"".join(dict_html)}</section>''')

    # ---------- 5 projeto
    add(f'''<section class="cap"><h1>5. Projeto de banco de dados</h1>
    <h2>5.1 Sistema gerenciador (SGBD)</h2>
    <p>O SGBD escolhido foi o <strong>PostgreSQL {e(VERSAO)}</strong>, pelos motivos:</p>
    <ul><li>Software livre, sem custo de licença, e padrão de mercado.</li>
    <li>Suporte completo a chaves estrangeiras com ações referenciais, restrições CHECK, gatilhos em PL/pgSQL, views e transações ACID.</li>
    <li>Tipos úteis ao domínio: <code>numeric</code> para dinheiro sem erro de arredondamento, <code>timestamptz</code> para datas com fuso, <code>jsonb</code> para a cópia da passagem e vetores <code>text[]</code> para listas.</li>
    <li>Extensão <code>unaccent</code> para busca sem acentos.</li></ul>
    <p>As tabelas ficam no esquema <code>aether</code> do banco <code>aether_jets</code>.</p>
    <h2>5.2 Diagrama entidade-relacionamento (DER)</h2>
    <p>Modelo conceitual em notação de Chen. Retângulos são entidades, losangos são relacionamentos e os números indicam a cardinalidade. TRECHO é entidade fraca (borda dupla): só existe dentro de uma PASSAGEM, pelo relacionamento identificador <em>compõe</em>. O relacionamento <em>consome</em> é N:M e tem atributos próprios. Os atributos de cada entidade estão no dicionário de dados (seção 4.2).</p>
    <figure class="diag">{der_svg()}<figcaption>Figura 1 – DER do Aether Jets</figcaption></figure>
    <h2 class="cap">5.3 Diagrama relacional</h2>
    <p>Modelo lógico com as {len(TABLES)} tabelas implementadas. PK = chave primária (sublinhada), FK = chave estrangeira; as setas vão da FK para a chave referenciada. O sinal <strong>?</strong> marca colunas que aceitam nulo.</p>
    <figure class="diag">{relational_svg()}<figcaption>Figura 2 – Diagrama relacional (gerado a partir do catálogo do PostgreSQL)</figcaption></figure>
    <h2>5.4 Decisões de projeto</h2>
    <p>Do DER para o modelo relacional:</p>
    <ul>
    <li><strong>Relacionamentos 1:N</strong> viram uma FK no lado N (ex.: <code>estado.pais_id</code>, <code>aeronave.categoria_id</code>, <code>passagem.cliente_id</code>).</li>
    <li><strong>Origem e destino</strong> são dois relacionamentos entre AEROPORTO e PASSAGEM, por isso a passagem tem duas FKs para a mesma tabela.</li>
    <li><strong>N:M consome</strong> virou a tabela associativa <code>passagem_catering</code>, com PK composta (passagem, item) e os atributos quantidade e preço unitário.</li>
    <li><strong>Entidade fraca TRECHO</strong> virou <code>passagem_trecho</code>, com PK composta (passagem, ordem) e CASCADE na exclusão.</li>
    <li><strong>1:1 quita</strong>: a PK de <code>pagamento</code> é a própria FK para a passagem, o que garante no máximo um pagamento por passagem.</li>
    </ul>
    <p>Normalização e outras escolhas:</p>
    <ul>
    <li><strong>País, estado e região em tabelas próprias (3FN):</strong> o nome do país é gravado uma vez, e não repetido em cada um dos 5.603 aeroportos.</li>
    <li><strong>Região no aeroporto, não no país:</strong> os dados mostraram países com aeroportos em mais de um continente (Rússia, Egito, Espanha) e, no Brasil, a região muda por estado.</li>
    <li><strong>Cidade como texto no aeroporto:</strong> são cerca de 5.250 cidades para 5.603 aeroportos e 163 aeroportos sem cidade; uma tabela própria não traria ganho.</li>
    <li><strong>ICAO como chave natural:</strong> é único e sempre tem 4 letras. O IATA não pode ser chave porque é opcional e se repete.</li>
    <li><strong>Desnormalização controlada:</strong> <code>passagem.snapshot</code> (jsonb) e <code>passagem_catering.preco_unitario</code> guardam os valores da data da compra. Se o catálogo mudar depois, a passagem emitida não muda.</li>
    </ul></section>''')

    # ---------- 6 aplicação
    rel_html = []
    money = {'receita_paga', 'a_receber', 'valor_total', 'receita', 'total_pago', 'valor', 'preco', 'preco_por_noite'}
    for v, titulo, desc in RELS:
        rel_html.append(f'<h3>{e(titulo)} <span class="tag">{e(v)}</span></h3><p>{e(desc)}</p>{table(REL_DATA[v], money=money)}')
    api_html = ''.join(code('\n\n'.join(sqls), API_DESC.get(fn, fn)) for fn, sqls in api_sql())
    add(f'''<section class="cap"><h1>6. A aplicação</h1>
    <h2>6.1 Arquitetura e execução</h2>
    <p>A aplicação tem três camadas:</p>
    <ul>
    <li><strong>Front-end:</strong> páginas HTML, CSS (Tailwind) e JavaScript, abertas no navegador.</li>
    <li><strong>API:</strong> servidor Node.js (<code>server.js</code>, biblioteca <code>pg</code>) que entrega as páginas e expõe as rotas abaixo. Todas as consultas usam parâmetros (<code>$1</code>, <code>$2</code>...), nunca concatenação de texto do usuário.</li>
    <li><strong>Banco:</strong> PostgreSQL com tabelas, restrições, gatilho e views de relatório.</li>
    </ul>
    <table><thead><tr><th>Rota</th><th>Função</th><th>Operação no banco</th></tr></thead><tbody>
    <tr><td>GET /api/aeroportos?q=</td><td>Busca de aeroportos (UC01)</td><td>SELECT com ranking</td></tr>
    <tr><td>GET /api/aeroportos/:icao</td><td>Um aeroporto</td><td>SELECT</td></tr>
    <tr><td>GET /api/catalogo</td><td>Frota, catering e pacotes</td><td>SELECT</td></tr>
    <tr><td>PUT /api/catalogo</td><td>CRUD do painel (UC07–UC09)</td><td>INSERT … ON CONFLICT, UPDATE, DELETE em transação</td></tr>
    <tr><td>POST /api/admin/login</td><td>Login do administrador (UC06)</td><td>—</td></tr>
    <tr><td>PUT /api/passagens/:codigo</td><td>Cria ou atualiza a passagem (UC04, UC05)</td><td>INSERT em 5 tabelas ou UPDATE, em transação</td></tr>
    <tr><td>GET /api/passagens/:codigo</td><td>Consulta a passagem (UC05)</td><td>SELECT</td></tr>
    <tr><td>GET /api/relatorios/:nome</td><td>Relatórios gerenciais (UC10)</td><td>SELECT na view</td></tr>
    </tbody></table>
    <p>Para executar: com o PostgreSQL ligado, rodar <code>npm start</code> na pasta do projeto e abrir <code>http://localhost:3000</code>. A criação do banco está no <code>README.md</code> e em <code>db/schema.sql</code>, <code>db/seed.sql</code> e <code>db/relatorios.sql</code>.</p>
    <h2>6.2 Telas e interação do usuário</h2>
    <p><strong>Simulador e busca de aeroportos.</strong> Na página inicial o cliente digita a origem; a lista mostra os aeroportos mais relevantes. Os aeroportos vêm da tabela <code>aeroporto</code> (com <code>estado</code>, <code>pais</code> e <code>regiao</code>), pela view <code>v_aeroporto</code>.</p>
    {img('simulador.png', 'Simulador de cotação com a lista de aeroportos', 'Figura 3 – Simulador com busca de aeroportos (UC01, UC02)')}
    <p><strong>Criar passagem.</strong> O cliente escolhe tipo de viagem, origem, destino, data, passageiros e aeronave; o resumo ao lado mostra distância, escalas e preço. Depois vêm o cardápio e o pagamento. Ao pagar, a API grava em <code>cliente</code>, <code>passagem</code>, <code>passagem_trecho</code>, <code>passagem_catering</code> e <code>pagamento</code> numa única transação.</p>
    {img('criar.png', 'Tela de criação de passagem', 'Figura 4 – Criação de passagem (UC03)')}
    <p><strong>Painel administrativo – cadastro.</strong> Após o login, o administrador alterna entre Aeronaves, Catering e Pacotes. Cada item pode ser editado ou excluído, e o botão Adicionar abre o formulário de inclusão. Ao salvar, o catálogo é enviado à API, que faz <code>INSERT … ON CONFLICT DO UPDATE</code> de cada registro dentro de uma transação. Se o banco recusar (por exemplo, excluir uma aeronave usada em pacote), nada é gravado e o painel mostra o motivo.</p>
    {img('admin-aeronaves.png', 'Lista de aeronaves no painel', 'Figura 5 – Listagem de aeronaves com editar e excluir (UC07)')}
    {img('admin-editar.png', 'Formulário de edição de aeronave', 'Figura 6 – Formulário de edição de aeronave')}
    <p><strong>Painel administrativo – relatórios.</strong> A aba Relatórios lista as views de relatório; ao escolher uma, a API executa <code>SELECT * FROM</code> a view e a tela mostra o resultado em tabela, com valores em reais.</p>
    {img('rel-faturamento.png', 'Relatório de faturamento por mês', 'Figura 7 – Relatório de faturamento por mês (UC10)')}
    {img('rel-frota.png', 'Relatório de uso da frota', 'Figura 8 – Relatório de uso da frota')}
    <h2>6.3 Relatórios gerenciais</h2>
    <p>Resultados obtidos no banco na data deste relatório. A base contém {N["passagem"]} passagens de demonstração criadas pelo próprio fluxo de compra do site, {N["cliente"]} clientes, {N["aeronave"]} aeronaves, {N["item_catering"]} itens de catering e {N["pacote"]} pacotes.</p>
    {"".join(rel_html)}
    <h2>6.4 Código SQL</h2>
    <p>Todo o SQL usado pelo sistema, em quatro partes: criação das tabelas (<code>db/schema.sql</code>), views de relatório (<code>db/relatorios.sql</code>), carga inicial a partir dos arquivos JSON (<code>db/seed.sql</code>) e os comandos executados pela API (<code>server.js</code>).</p>
    <h3>6.4.1 Criação do banco (DDL) – db/schema.sql</h3>
    {code(read('db/schema.sql'))}
    <h3>6.4.2 Relatórios – db/relatorios.sql</h3>
    {code(read('db/relatorios.sql'))}
    <h3>6.4.3 Carga inicial – db/seed.sql</h3>
    {code(read('db/seed.sql'))}
    <h3>6.4.4 Comandos executados pela API – server.js</h3>
    <p><code>&lt;AIRPORT_SQL&gt;</code> é a consulta base abaixo, reaproveitada em várias rotas:</p>
    {code(re.search(r"const AIRPORT_SQL = `([^`]*)`", read('server.js')).group(1))}
    {api_html}</section>''')

    # ---------- conclusão
    add(f'''<section class="cap"><h1>7. Conclusão</h1>
    <p>O trabalho resultou em um sistema funcional que cobre todo o ciclo de uma empresa de fretamento: cotação com cálculo de escalas, reserva, pagamento, manutenção do catálogo e acompanhamento gerencial. O banco de dados é o centro da solução: as regras de negócio mais importantes (integridade referencial, capacidade da aeronave em pacotes, datas coerentes, valores não negativos, um pagamento por passagem) são garantidas pelo PostgreSQL e não dependem só da aplicação.</p>
    <p>A modelagem passou pelas etapas da disciplina: do problema (seção 2) aos requisitos (seção 3), ao modelo conceitual (DER), ao modelo lógico (diagrama relacional) e à implementação física (DDL), com decisões de normalização baseadas na análise dos dados reais de aeroportos.</p>
    <p>Limitações e próximos passos:</p>
    <ul>
    <li>O preço é calculado no navegador; em produção, o servidor deveria recalculá-lo antes de gravar a passagem.</li>
    <li>O login do administrador usa uma única conta configurada no servidor; uma tabela de usuários com senhas cifradas permitiria vários administradores.</li>
    <li>O pagamento é simulado; uma integração com operadora de cartão e Pix seria necessária para cobrança real.</li>
    <li>Com bases muito maiores, a busca de aeroportos pode usar índice de trigramas (<code>pg_trgm</code>).</li>
    </ul></section>''')
    return f'<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Relatório – Aether Jets</title><style>{CSS}</style></head><body>{"".join(h)}</body></html>'


def chrome():
    """Caminho do Chrome/Edge: variável CHROME, PATH ou locais padrão do Windows."""
    import shutil
    for c in [os.environ.get('CHROME'), shutil.which('google-chrome'), shutil.which('chrome'), shutil.which('chromium'),
              r'C:\Program Files\Google\Chrome\Application\chrome.exe', r'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe',
              r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe']:
        if c and os.path.exists(c):
            return c
    sys.exit('Chrome não encontrado. Informe o caminho na variável CHROME.')


def to_pdf(html_path, pdf_path):
    """Imprime o HTML com o Chrome sem cabeçalho/rodapé do navegador."""
    import pathlib
    import tempfile
    with tempfile.TemporaryDirectory() as prof:
        subprocess.run([chrome(), '--headless=new', '--no-pdf-header-footer', f'--user-data-dir={prof}',
                        f'--print-to-pdf={pdf_path}', pathlib.Path(html_path).as_uri()], check=True, capture_output=True, timeout=180)


if __name__ == '__main__':
    os.makedirs(DOCS, exist_ok=True)
    html_path = os.path.join(DOCS, 'relatorio.html')
    with open(html_path, 'w', encoding='utf-8') as f:
        f.write(build())
    pdf = os.path.join(DOCS, 'Relatorio_Trabalho_Pratico_BD.pdf')
    to_pdf(html_path, pdf)
    print(pdf)
