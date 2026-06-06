# NORM

Instruções para automação de commits/push (autowatch)

Aviso: o watcher faz `git add -A`, `git commit` e `git push` automaticamente. Use com cuidado.

Como usar

1. Instale dependências (se necessário):

```bash
npm install
```

2. Inicie o watcher:

```bash
npm run autowatch
```

3. Para desativar temporariamente o watcher (sessão atual):

```bash
export AUTOWATCH_DISABLED=1   # macOS / Linux / WSL
setx AUTOWATCH_DISABLED 1     # Windows (persistente)
# ou para sessão atual no PowerShell:
$env:AUTOWATCH_DISABLED = '1'
```

Segurança e boas práticas

- O watcher ignora `node_modules`, `.git`, `.github` e `.githooks` por padrão.
- Não use este watcher em branches críticos sem revisão pregressa.
- Para compartilhar hooks entre colaboradores, mantenha-os em `.githooks/` e adicione instruções para instalar os hooks localmente.

Removido

- Removi os hooks locais redundantes em `.git/hooks/post-commit*` para evitar push duplo.

Quer que eu configure um gerenciador de hooks versionado (como `husky`) para tornar a configuração replicável entre colaboradores?

Deploy no Render e banco de dados

1. No painel do Render, crie uma instância de *Managed PostgreSQL* (Dashboard → Databases → New Database).
2. Copie o *Connection String* (algo como `postgres://user:pass@host:5432/dbname`).
3. No seu Web Service (dudsV), vá em **Environment → Environment Variables** e adicione `DATABASE_URL` com essa string.
4. No deploy do Render, certifique-se de que `npm install` roda (o `prepare` com Husky pode rodar automaticamente).

Importar seus dados locais

1. Instale dependências localmente:

```bash
npm install
```

2. Exporte `DATABASE_URL` apontando para sua DB do Render (ou use localmente com postgres local):

```bash
export DATABASE_URL="postgres://..."   # Linux / macOS / WSL
setx DATABASE_URL "postgres://..."     # Windows (persistente)
$env:DATABASE_URL = 'postgres://...'
```

3. Rode o script de importação:

```bash
node scripts/import-db.js
```

Depois disso, atualize `server.js` para usar o banco quando `DATABASE_URL` estiver definido (posso fazer essa alteração para você).