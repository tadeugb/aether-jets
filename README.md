# Aether Jets

Site de fretamento de jatos executivos com API em Node.js e banco PostgreSQL.

## Como rodar o sistema

O sistema tem três partes:

| Parte | O que é | Onde roda |
|---|---|---|
| Banco de dados | PostgreSQL com aeroportos, frota, catering, pacotes e passagens | porta **5432** |
| Servidor | `server.js`: entrega as páginas e a API que lê e grava no banco | porta **3000** |
| Site | as páginas `.html`, abertas no navegador | http://localhost:3000 |

### Uso do dia a dia (tudo já instalado)

Os comandos abaixo são do Linux. No Windows, veja [Primeira instalação no Windows](#primeira-instalação-no-windows); o dia a dia lá é só `npm start`.

1. **Confirme que o banco está ligado:**

   ```bash
   systemctl status postgresql        # deve mostrar "active"
   ```

   O PostgreSQL liga sozinho quando o computador inicia. Se estiver parado:

   ```bash
   sudo systemctl start postgresql
   ```

2. **Inicie o servidor** a partir da pasta do projeto:

   ```bash
   cd ~/Downloads/aether-jets
   npm start
   ```

   Ele deve mostrar `Aether Jets em http://localhost:3000`. Deixe esse terminal aberto: fechar o terminal desliga o site.

3. **Abra o site:** http://localhost:3000
   - Painel admin: http://localhost:3000/admin-login.html (usuário `admin`, senha `AetherJets2026!`)

4. **Para desligar o servidor:** no terminal onde ele roda, aperte **Ctrl+C**.

> Abra sempre pelo endereço `localhost:3000`. Se o site for aberto pelo Live Server do VS Code (porta 5501), por `python -m http.server` ou com dois cliques no arquivo `.html`, ele funciona, mas **não grava no banco**: tudo fica só no navegador.

### Primeira instalação no Linux (em outra máquina)

Precisa de **PostgreSQL** (14 ou mais novo) e **Node.js** (18 ou mais novo).

```bash
# 1. Instalar o PostgreSQL e o Node (Ubuntu)
sudo apt install postgresql nodejs npm

# 2. Criar o usuário e o banco (uma vez só)
sudo -u postgres psql -c "CREATE ROLE aether LOGIN PASSWORD 'aether'"
sudo -u postgres createdb -O aether aether_jets
sudo -u postgres psql -d aether_jets -c "CREATE EXTENSION IF NOT EXISTS unaccent SCHEMA public"

# 3. Criar as tabelas e carregar os dados (rodar dentro da pasta do projeto)
cd ~/Downloads/aether-jets
PGPASSWORD=aether psql -h localhost -U aether -d aether_jets -f db/schema.sql
PGPASSWORD=aether psql -h localhost -U aether -d aether_jets -f db/seed.sql

# 4. Instalar as dependências do servidor e iniciar
npm install
npm start
```

### Primeira instalação no Windows

**1. Instale os programas** (aceite as opções padrão dos instaladores):

| Programa | Onde baixar | Atenção |
|---|---|---|
| PostgreSQL 16 ou mais novo | https://www.postgresql.org/download/windows/ (instalador da EDB) | **Anote a senha** pedida para o usuário `postgres`. Porta: 5432. |
| Node.js LTS | https://nodejs.org | Marque a opção de adicionar ao PATH (já vem marcada). |

O instalador do PostgreSQL já inclui o **SQL Shell (psql)**, o **pgAdmin** (para ver o banco com janela) e a extensão `unaccent`. Ele também deixa o banco ligando sozinho com o Windows.

**2. Abra o PowerShell na pasta do projeto.** No Explorador de Arquivos, abra a pasta `aether-jets`, clique na barra de endereço, digite `powershell` e aperte Enter.

**3. Crie o usuário e o banco (uma vez só).** Troque `18` pela versão instalada (veja em `C:\Program Files\PostgreSQL\`). Cada comando pede a senha do `postgres` que você anotou:

```powershell
$psql = "C:\Program Files\PostgreSQL\18\bin\psql.exe"
& $psql -U postgres -c "CREATE ROLE aether LOGIN PASSWORD 'aether'"
& $psql -U postgres -c "CREATE DATABASE aether_jets OWNER aether"
& $psql -U postgres -d aether_jets -c "CREATE EXTENSION IF NOT EXISTS unaccent SCHEMA public"
```

**4. Crie as tabelas, carregue os dados e inicie:**

```powershell
npm install
npm run db:setup     # cria as tabelas e carrega os dados (apaga o que existir no schema aether)
npm start            # http://localhost:3000
```

Se o PowerShell disser que *a execução de scripts foi desabilitada* ao rodar `npm`, rode uma vez `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` e confirme com `S`. Outra saída é usar o **Prompt de Comando** (`cmd`) no lugar do PowerShell.

**No dia a dia:** abra o PowerShell na pasta do projeto e rode `npm start`. Para desligar, **Ctrl+C**.

**Ver o banco no Windows:** abra o **pgAdmin 4** pelo menu Iniciar, entre com a senha do `postgres` e vá em *Servers → PostgreSQL → Databases → aether_jets → Schemas → aether → Tables*. Para ver os registros, clique com o botão direito numa tabela e escolha *View/Edit Data → All Rows*. O diagrama das tabelas fica em botão direito no banco → *ERD For Database*. O DBeaver também funciona no Windows, com os mesmos dados de conexão.

**Gerar o PDF do relatório no Windows:** precisa do Python (https://www.python.org, marque *Add python.exe to PATH*) e do Chrome ou Edge. Antes, coloque o `psql` no PATH da sessão:

```powershell
$env:Path += ";C:\Program Files\PostgreSQL\18\bin"
$env:PGPASSWORD = "aether"
py tools\gerar_relatorio.py
```

### Voltar o banco ao estado inicial

Os comandos abaixo **apagam tudo** (passagens, clientes e edições do painel) e recarregam os dados de `assets/data/*.json`. Em qualquer sistema (Windows, Linux ou macOS):

```bash
npm run db:setup
```

Ou, no Linux, direto pelo `psql`:

```bash
PGPASSWORD=aether psql -h localhost -U aether -d aether_jets -f db/schema.sql
PGPASSWORD=aether psql -h localhost -U aether -d aether_jets -f db/seed.sql
```

Depois, reinicie o servidor (Ctrl+C e `npm start`).

### Ver o banco

- **Com janela (DBeaver):** abra o DBeaver, clique duas vezes em **Aether Jets (PostgreSQL)** e abra `aether_jets → Schemas → aether → Tables`. Na aba **Data**, aperte **F5** para atualizar depois de mudar algo pelo site. Para o diagrama das tabelas, clique com o botão direito em `aether` → **View Diagram**.
- **Pelo terminal:**

  ```bash
  PGPASSWORD=aether psql -h localhost -U aether -d aether_jets
  ```

  Dentro do `psql`: `SET search_path = aether, public;` e depois `\dt` (lista as tabelas), `\d aeronave` (estrutura de uma tabela) e `\q` (sair).

| Tela do site | Tabela no banco |
|---|---|
| Admin → Aeronaves | `aether.aeronave` |
| Admin → Catering | `aether.item_catering` |
| Admin → Pacotes | `aether.pacote` |
| Compra de passagem | `aether.passagem`, `passagem_trecho`, `passagem_catering`, `pagamento`, `cliente` |
| Busca de origem e destino | `aether.aeroporto` (com `pais`, `estado`, `regiao`) |

### Relatório do trabalho (PDF)

O relatório da disciplina fica em `docs/Relatorio_Trabalho_Pratico_BD.pdf`. Ele é gerado a partir do banco (estrutura, restrições e resultados dos relatórios). Para gerar de novo, por exemplo depois de trocar os nomes dos integrantes no início de `tools/gerar_relatorio.py`:

```bash
python3 tools/gerar_relatorio.py
```

Os relatórios gerenciais ficam no painel admin, aba **Relatórios**, e no banco como views `rel_*` (`db/relatorios.sql`).

### Testes da API

Com o banco ligado:

```bash
npm test
```

### Problemas comuns

| Sintoma | Causa e solução |
|---|---|
| `npm start` mostra `EADDRINUSE` | O servidor já está rodando em outro terminal. Use aquele, ou feche-o: no Linux `pkill -f "node server.js"`; no Windows, feche a janela do terminal ou rode `Get-Process node \| Stop-Process` no PowerShell. Depois rode `npm start` de novo. |
| `ECONNREFUSED 127.0.0.1:5432` ou o site sem aeroportos | O banco está desligado. Linux: `sudo systemctl start postgresql`. Windows: abra **Serviços** (`services.msc`), procure `postgresql-x64-18` e clique em **Iniciar**. |
| Windows: `psql` não é reconhecido como comando | O instalador não coloca o `psql` no PATH. Use o caminho completo, como nos comandos acima. |
| `npm run db:setup` falha com `unaccent` | Falta criar a extensão (último comando do passo 3 da instalação no Windows, ou do passo 2 no Linux). |
| `password authentication failed for user "aether"` | Falta criar o usuário (passo 2 da instalação). |
| Editei no admin e não aparece no banco | Confira se o site foi aberto por `localhost:3000`. Se o admin já estava aberto antes do servidor subir, clique em **Sair** e entre de novo. |
| Mudei o banco direto (DBeaver) e o site não mostra | O navegador guarda uma cópia do catálogo depois de uma edição pelo painel e ela tem prioridade. Abra uma janela anônima ou, no console do navegador (F12), rode `localStorage.removeItem('aether.catalog.v1')` e recarregue. |

### Configuração (opcional)

Variáveis de ambiente aceitas pelo `npm start`:

| Variável | Padrão |
|---|---|
| `PORT` | `3000` |
| `DATABASE_URL` | `postgres://aether:aether@localhost:5432/aether_jets` |
| `ADMIN_USER` / `ADMIN_PASS` | `admin` / `AetherJets2026!` |

Exemplo: `PORT=8080 npm start`.

## API

| Rota | O que faz |
|---|---|
| `GET /api/aeroportos?q=sao paulo&limit=8` | busca de aeroportos por código, cidade ou nome, sem acento |
| `GET /api/aeroportos/SBGR` | um aeroporto |
| `GET /api/catalogo` | frota, catering e pacotes |
| `PUT /api/catalogo` | grava o catálogo do painel (exige o token de `POST /api/admin/login`) |
| `PUT /api/passagens/:codigo` | cria a passagem ou atualiza status e pagamento |
| `GET /api/passagens/:codigo` | consulta uma passagem |

O servidor também gera `assets/js/airports.js` e `assets/js/catalog-seed.js` a partir do banco, no mesmo formato dos arquivos originais.

## Cotação e escalas

O simulador usa a base existente de 5.603 aeroportos do OurAirports, com código ICAO/IATA, nome, cidade, país, latitude, longitude e pista. O campo `escalaTecnica` identifica a lista preliminar de aeroportos candidatos. Com o filtro padrão de pista pavimentada de 6.000 pés, a rede utiliza 529 candidatos. Aeroportos de origem e destino continuam selecionáveis conforme a base original.

O cálculo aplica Haversine e o fator de rota a cada trecho, com alcance útil de 90% da autonomia cadastrada. Se a rota direta exceder o limite, o simulador procura o menor número de paradas. Entre rotas com o mesmo número de trechos, privilegia menor distância e distribuição mais equilibrada. A cotação soma o tempo comercial de voo de cada trecho, os minutos em solo, a tarifa sobre a distância efetivamente percorrida, a taxa-base de 8% e as taxas por parada. Ida e volta usa o mesmo itinerário invertido para precificação.

Edite `assets/js/route-config.js` para alterar margem, minutos, pista mínima, fator de rota e taxas técnicas. As premissas iniciais são 45 minutos de parada, R$ 3.200 de pouso e R$ 1.800 de reabastecimento por escala. O preço do combustível de cruzeiro integra a tarifa do voo. A rede auxilia a cotação comercial. O operador confirma disponibilidade de combustível, permissão, desempenho em pista, meteorologia e valores antes de uma operação real.

## Pacotes e catálogo

A página `pacotes.html` oferece viagens completas sob consulta. Empty Legs conserva o catálogo separado de voos de reposicionamento. O botão **Solicitar pacote** abre uma mensagem no WhatsApp configurado no site. Disponibilidade, preços, hotéis e aeronaves do catálogo inicial são exemplos comerciais. A contratação é confirmada pelo concierge.

As fontes iniciais editáveis ficam em `assets/data/frota.json`, `assets/data/catering.json` e `assets/data/pacotes.json`. Depois de editar esses JSONs manualmente, execute `python tools/build_catalog.py` para regenerar `assets/js/catalog-seed.js`. O arquivo gerado contém os JSONs para carregamento no navegador sem requisição assíncrona adicional. O painel salva um catálogo editado, que tem prioridade sobre o inicial no mesmo navegador e origem. Para testar um novo catálogo padrão, abra um perfil novo ou remova a chave `aether.catalog.v1` após salvar uma cópia das alterações.

O painel exige reatribuição ou exclusão de pacotes vinculados antes de apagar uma aeronave. A mesma regra impede reduzir a capacidade abaixo da necessária para esses pacotes. Dados históricos nas passagens são preservados nos snapshots já emitidos.

## Administração e migração para produção

Acesse `admin-login.html` pelo rodapé ou abra `admin.html` para testar o redirecionamento. Usuário inicial **admin**, senha inicial **AetherJets2026!**. Troque ambos no objeto `config` de `assets/js/admin-auth.js`. A sessão de demonstração dura oito horas e usa `sessionStorage`. O catálogo usa `localStorage`. Recarregue páginas públicas que já estavam abertas para ver as alterações.

Em produção, hospede o site e a API Node/Express na mesma origem HTTPS e execute a autenticação no servidor. Uma implementação com SQLite pode partir deste catálogo:

1. Importe os JSONs iniciais ou a chave `aether.catalog.v1` exportada do navegador. Preserve os IDs de aeronaves e pacotes. Crie tabelas para cada seção e uma chave estrangeira entre pacote e aeronave.
2. Implemente `POST /api/admin/login` e `POST /api/admin/logout`. Guarde apenas o hash da senha administrativa, aplique limite de tentativas e use sessões no servidor com cookie HttpOnly, Secure e SameSite.
3. Sirva o catálogo por `GET /api/catalog`. Exija sessão e proteção CSRF nas operações de criação, edição e exclusão. Valide os campos no backend e grave as alterações em transações.
4. Substitua a simulação de sessão e a leitura/gravação de `catalog-store.js` por chamadas à API, com inicialização aguardando o catálogo. Proteja `/admin.html` no servidor e remova as credenciais do JavaScript servido ao público.
5. Ao usar cotações para contratar de fato, recalcule a tarifa do pedido no servidor e integre disponibilidade e confirmação com o operador.

## Imagens e estilo

O arquivo do hero já existia no ZIP. Uma regra de movimento reduzido aplicava `display: none` à foto. A foto agora continua visível e estática nessa preferência. O overlay foi suavizado e a imagem incluída ganhou uma versão WebP. Várias URLs antigas apontavam para imagens externas sem fallback; a revisão também encontrou fotos com conteúdo diferente do destino ou da aeronave anunciados. As imagens do catálogo de partida agora são locais. A frota usa a foto de jato fornecida como referência visual genérica, e o catering usa fotos ilustrativas por categoria. Cadastre fotos próprias por modelo ou prato no painel.

Cada imagem tem fallback local via `onerror` e as faixas decorativas têm gradiente de fundo. Tailwind agora é entregue como CSS compilado. Para regenerar após mudar classes, a partir da pasta do projeto:

```bash
npx tailwindcss@3.4.17 -c assets/js/tailwind-config.js -i assets/css/tailwind-input.css -o assets/css/tailwind.css --minify
```

Veja `ARQUIVOS-ALTERADOS.md` para a lista completa em caminhos relativos à raiz.

## Como testar

| Funcionalidade | Procedimento e resultado esperado |
| --- | --- |
| Voo direto | Na home, simule **SBGR → SBRJ**, 4 passageiros. Confira o rótulo **Voo direto**, um trecho e nenhuma taxa técnica. |
| Uma ou mais escalas | Simule **SBGR → KOPF**, 4 passageiros. O Learjet 75 tem uma parada e o Citation CJ3+ tem duas. Simule **SBGR → LFPG** e confira três paradas no CJ3+, 45 min em cada e R$ 15.000 em taxas técnicas por sentido, além da taxa-base. |
| Rota inviável | Cadastre um avião de teste com alcance de 250 km. Repita **SBGR → LFPG**. Apenas esse avião deve constar sem rota compatível na rede para esse alcance. |
| Cotação até a passagem | Clique em **Continuar**, escolha o CJ3+, configure data futura e avance para cardápio e pagamento simulado. Confira distância, itinerário e total consistentes. Em ida e volta, confira a duplicação da distância e das taxas. Escolha Pix simulado e confira a passagem em `passagens.html`. |
| Pacotes | Em `pacotes.html`, selecione Madri, máximo de R$ 600.000, até 7 dias e 8 passageiros. Deve sobrar Madri Cultural. Abra **Ver detalhes**, feche com Esc e clique em **Limpar**. **Solicitar pacote** deve abrir a conversa com mensagem contendo o pacote escolhido. |
| Imagens | Confira hero, frota, destinos, pacotes e catering. Com movimento reduzido, recarregue a home e confirme que o banner permanece visível. Cadastre `assets/img/inexistente.webp` para uma aeronave de teste e confirme que sua foto é substituída localmente. |
| Sessão | Abra `admin.html` em janela privada. Deve redirecionar ao login. Teste uma senha incorreta, entre com a senha configurada, recarregue o painel e clique em **Sair**. Uma nova abertura direta deve voltar ao login. |
| CRUD integrado | Crie e edite uma aeronave, um prato e um pacote. Recarregue **Frota**, **Criar passagem**, **Cardápio** e **Pacotes** e confira os novos valores. Cancele uma exclusão, confirme depois e verifique que o registro sumiu. Se houver vínculo, exclua ou reatribua antes o pacote. |
| Responsividade e navegação anterior | Repita em uma largura de aproximadamente 390 px. Abra o menu móvel, teste os links **Pacotes** e **Empty Legs**, abra um detalhe e verifique as seções do painel sem rolagem horizontal. |

Validação desta entrega em DOM automatizado incluiu os fluxos principais, a consistência de preço, as exclusões vinculadas, a sessão e o fallback. O ambiente bloqueou o lançamento do Chromium, de modo que a validação visual e o redirecionamento em um navegador real seguem no roteiro acima.

## Créditos de mídia

- São Paulo, Thomas Hobbs, CC BY-SA 2.0. [Arquivo e licença](https://commons.wikimedia.org/wiki/File:Sao_Paulo_Skyline_in_Brazil.jpg)
- Copacabana, Gustavo Facci, CC BY-SA 2.0. [Arquivo e licença](https://commons.wikimedia.org/wiki/File:Aerial_view_of_Copacabana_beach.jpg)
- Ponte Hercílio Luz, Herr stahlhoefer, domínio público. [Arquivo e licença](https://commons.wikimedia.org/wiki/File:Floripa_Ponte_Herc%C3%ADlio_Luz.jpg)

As três fotos acima foram redimensionadas e convertidas para WebP. As versões derivadas de fotos CC BY-SA permanecem sob [CC BY-SA 2.0](https://creativecommons.org/licenses/by-sa/2.0/).

As outras fotos ilustrativas vêm do ZIP original e do Unsplash. [Madri](https://images.unsplash.com/photo-1543785734-4b6e564642f8), [Miami](https://images.unsplash.com/photo-1506966953602-c20cc11f75e3), [avatar](https://images.unsplash.com/photo-1534528741775-53994a69daeb), [catering](https://images.unsplash.com/photo-1512621776951-a57141f2eefd), [bebidas](https://images.unsplash.com/photo-1551024709-8f23befc6f87), [snacks](https://images.unsplash.com/photo-1499636136210-6f4ee915583e). [Licença Unsplash](https://unsplash.com/license)
