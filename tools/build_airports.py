#!/usr/bin/env python3
"""Gera airports.json e airports.js (window.AIRPORTS) a partir do OurAirports.
Uso: python build_airports.py <pasta com airports.csv, runways.csv, countries.csv> [data.js]
Filtro: tipo large/medium/small, com ICAO, com pista pavimentada >= 4.000 ft e não fechada.
Coordenadas e pistas vêm só do CSV; nada é inventado."""
import sys, re, json, os
from pathlib import Path
import pandas as pd

src = sys.argv[1] if len(sys.argv) > 1 else '.'
datajs = sys.argv[2] if len(sys.argv) > 2 else None
# Preserva a seleção de escalas técnicas da base versionada em novas importações.
base = Path(__file__).resolve().parents[1] / 'assets/data/airports.json'
stop_codes = {item['icao'] for item in json.loads(base.read_text(encoding='utf-8')) if item.get('escalaTecnica')} if base.exists() else set()
MIN_FT = 4000
PAVED = ('ASP', 'CON', 'PEM', 'BIT', 'TAR', 'PAV', 'PAVED', 'MAC', 'CONC', 'ASPH')

a = pd.read_csv(os.path.join(src, 'airports.csv'), low_memory=False, keep_default_na=False, na_values=[''], dtype={'continent': str})
a['continent'] = a['continent'].fillna('NA')
r = pd.read_csv(os.path.join(src, 'runways.csv'), low_memory=False)
c = pd.read_csv(os.path.join(src, 'countries.csv'), low_memory=False)
cname = dict(zip(c.code, c.name))

PT = {'BR':'Brasil','US':'Estados Unidos','AR':'Argentina','CL':'Chile','UY':'Uruguai','PY':'Paraguai','BO':'Bolívia','PE':'Peru',
 'CO':'Colômbia','VE':'Venezuela','EC':'Equador','MX':'México','CA':'Canadá','PA':'Panamá','CR':'Costa Rica','CU':'Cuba',
 'DO':'República Dominicana','JM':'Jamaica','BS':'Bahamas','PR':'Porto Rico','KY':'Ilhas Cayman','GB':'Reino Unido','FR':'França',
 'DE':'Alemanha','ES':'Espanha','PT':'Portugal','IT':'Itália','CH':'Suíça','NL':'Países Baixos','BE':'Bélgica','AT':'Áustria',
 'IE':'Irlanda','GR':'Grécia','SE':'Suécia','NO':'Noruega','DK':'Dinamarca','FI':'Finlândia','PL':'Polônia','RU':'Rússia',
 'AE':'Emirados Árabes Unidos','QA':'Catar','SA':'Arábia Saudita','IL':'Israel','TR':'Turquia','EG':'Egito','ZA':'África do Sul',
 'MA':'Marrocos','JP':'Japão','CN':'China','IN':'Índia','SG':'Singapura','TH':'Tailândia','AU':'Austrália','NZ':'Nova Zelândia',
 'MC':'Mônaco','LU':'Luxemburgo','BH':'Bahrein','KW':'Kuwait','OM':'Omã','JO':'Jordânia','HK':'Hong Kong','KR':'Coreia do Sul'}

CARIBE = {'BS','BB','CU','DO','HT','JM','PR','TT','KY','AG','AW','CW','VG','VI','TC','LC','VC','GD','DM','KN','BM','MQ','GP','BL','MF','SX','AI','MS','BQ'}
ORIENTE = {'AE','QA','SA','IL','BH','KW','OM','JO','LB','IQ','IR','YE','SY','TR'}
BR_REG = {}
for reg, ufs in {'Sudeste':'SP RJ MG ES','Sul':'PR SC RS','Nordeste':'BA SE AL PE PB RN CE PI MA','Norte':'AM PA AC RO RR AP TO','Centro-Oeste':'DF GO MT MS'}.items():
    for uf in ufs.split(): BR_REG[uf] = reg

def regiao(row):
    cc, cont = row.iso_country, row.continent
    if cc == 'BR': return BR_REG.get(str(row.iso_region).split('-')[-1], 'Brasil')
    if cc in CARIBE: return 'Caribe'
    if cc in ORIENTE: return 'Oriente Médio'
    return {'SA':'América do Sul','NA':'América do Norte','EU':'Europa','AS':'Ásia','AF':'África','OC':'Oceania','AN':'Antártida'}.get(cont, cont)

# pistas: maior pista pavimentada aberta por aeroporto
r = r[(r.closed.fillna(0) == 0) & r.length_ft.notna()]
r = r[r.surface.fillna('').str.upper().str.contains('|'.join(PAVED))]
best = r.groupby('airport_ident').length_ft.max()

# nomes curados do data.js atual (PT) têm prioridade e esses aeroportos entram sempre
curated, curated_iata = {}, {}
if datajs and os.path.exists(datajs):
    txt = open(datajs, encoding='utf-8').read()
    for m in re.finditer(r'\{\s*icao:\s*"(\w+)",\s*iata:\s*"(\w*)",\s*nome:\s*"([^"]+)",\s*cidade:\s*"([^"]+)"', txt):
        curated[m.group(1)] = (m.group(3), m.group(4))
        curated_iata[m.group(1)] = m.group(2)

a = a[a.type.isin(['large_airport','medium_airport','small_airport'])].copy()
# o código do site (ident) prevalece para os aeroportos curados; ex.: KPBI aparece como KDJT em icao_code
a['icao'] = a.icao_code.fillna(a.ident)
a.loc[a.ident.isin(curated), 'icao'] = a.ident
a = a[a.icao_code.notna() | a.icao.isin(curated)].copy()
a['pista_ft'] = a.ident.map(best)
a = a[(a.pista_ft >= MIN_FT) | a.icao.isin(curated)].copy()
a['regiao'] = a.apply(regiao, axis=1)

def clean(n):
    n = re.sub(r'\s+(International|Intl\.?)?\s*Airport$', '', str(n)).strip()
    return n or str(n)

out = []
for row in a.itertuples():
    icao = row.icao
    nome, cidade = curated.get(icao, (clean(row.name), row.municipality if isinstance(row.municipality, str) else ''))
    out.append({'icao': icao, 'iata': curated_iata.get(icao) or (row.iata_code if isinstance(row.iata_code, str) else ''), 'nome': nome, 'cidade': cidade,
                'estado': str(row.iso_region).split('-')[-1], 'pais': PT.get(row.iso_country, cname.get(row.iso_country, row.iso_country)),
                'regiao': row.regiao, 'lat': round(float(row.latitude_deg), 4), 'lon': round(float(row.longitude_deg), 4),
                'pista_ft': int(row.pista_ft) if pd.notna(row.pista_ft) else None})
for airport in out:
    if airport['icao'] in stop_codes:
        airport['escalaTecnica'] = True
out.sort(key=lambda x: (x['pais'] != 'Brasil', x['pais'], x['cidade'], x['icao']))
json.dump(out, open('airports.json', 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
open('airports.js', 'w', encoding='utf-8').write('window.AIRPORTS = ' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n')
print(len(out), 'aeroportos;', sum(1 for x in out if x['pais'] == 'Brasil'), 'no Brasil')
