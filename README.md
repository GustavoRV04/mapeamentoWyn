# Wyn Ativos

MVP para registrar atendimentos de equipamentos de rede, manter o inventário atualizado, consultar o histórico e copiar uma mensagem padronizada para o Teams.

## O que já funciona

- Acesso individual com senha e cadastro protegido por código de convite.
- Registro de instalação, substituição, recolhimento, preventiva, manutenção e transferência.
- Atualização do inventário a cada registro, com técnico e horário associados.
- Histórico geral em formato de tabela e feed individual por técnico.
- Anexo de até cinco fotos JPEG, PNG ou WebP de até 5 MB cada.
- Geração e cópia da mensagem para o Teams. O envio ao Teams continua manual.
- Exportação do inventário em CSV.

## Banco de dados

O projeto usa **SQLite por padrão**: os dados ficam em um arquivo local, sem precisar instalar ou administrar um servidor de banco. É uma escolha prática para validar o fluxo e hospedar um MVP com poucos usuários, desde que o arquivo esteja em um disco persistente e seja incluído nas cópias de segurança.

O banco padrão é `backend/data/ativos.db`. As fotos ficam no próprio banco e são servidas somente a usuários autenticados. Em caso de crescimento, uso simultâneo intenso ou necessidade de alta disponibilidade, configure PostgreSQL usando `DATABASE_URL`; o driver já está nas dependências. Faça uma cópia de segurança antes de qualquer migração.

## Desenvolvimento local

### API

Na raiz do projeto, crie e ative um ambiente virtual, instale as dependências e configure um código de convite:

```bash
python -m venv backend/.venv
```

Linux/macOS:

```bash
source backend/.venv/bin/activate
pip install -r backend/requirements.txt
export INVITE_CODE="$(python -c 'import secrets; print(secrets.token_urlsafe(24))')"
cd backend
uvicorn app.main:app --reload
```

Windows PowerShell:

```powershell
backend\.venv\Scripts\Activate.ps1
pip install -r backend\requirements.txt
$env:INVITE_CODE = (python -c "import secrets; print(secrets.token_urlsafe(24))")
Set-Location backend
uvicorn app.main:app --reload
```

A API ficará em `http://localhost:8000`; a documentação interativa fica em `/docs`. O código de convite deve ser compartilhado apenas com os integrantes da equipe. Se `INVITE_CODE` não estiver configurado, a API desativa novos cadastros.

### Interface

Em outro terminal:

```bash
cd frontend
npm install
npm run dev
```

A interface usa `http://localhost:8000` por padrão. Para apontar para outro endereço da API, defina `VITE_API_URL` antes de gerar o build. Configure também `CORS_ORIGINS` na API com a origem exata da interface, separando múltiplas origens por vírgula.

## Hospedagem Linux

1. Mantenha a API atrás de um proxy reverso com HTTPS; não exponha o servidor de desenvolvimento do Vite na internet.
2. Defina `INVITE_CODE`, `CORS_ORIGINS` e, se necessário, `DATABASE_URL` no ambiente do serviço — nunca grave segredos no repositório.
3. Garanta que `backend/data` (ou o caminho configurado no `DATABASE_URL`) seja um volume/disco persistente, gravável pelo usuário do serviço e incluído no backup.
4. Para PostgreSQL, use uma URL no formato `postgresql+psycopg://usuario:senha@host:5432/banco` e proteja a senha no gerenciador de segredos do host.
5. Faça backups testados do banco. O MVP cria as tabelas automaticamente ao iniciar; para evoluir o esquema em produção, adote migrações versionadas antes de alterar modelos existentes.

## Observações

- Senhas são armazenadas com derivação criptográfica e sessões expiram após 12 horas.
- O cadastro usa um único código de convite compartilhado; ele controla a entrada inicial, não substitui políticas corporativas de identidade.
- Para produção, configure HTTPS, limite tentativas de autenticação no proxy e defina rotina de backup/restore.
- O histórico é paginado para manter a consulta de registros antigos; cada página mostra até 20 atendimentos.
- O inventário é paginado, e a exportação CSV respeita a busca e o filtro selecionados.
