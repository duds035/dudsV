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