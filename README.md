# 🚀 Sistema de Gestão de Vagas (Day Pharma)

Sistema web para gerenciamento de processos seletivos, permitindo que recrutadores publiquem vagas e candidatos se apliquem e acompanhem feedbacks.

## 🛠 Tecnologias Utilizadas

* **Frontend:** HTML5, Bootstrap 5, JavaScript (ES6+)
* **Backend (BaaS):** Supabase (PostgreSQL + Auth)
* **Infraestrutura:** Docker & Docker Compose (Servidor Nginx Alpine)

---

## 🐳 Como Rodar o Projeto (Via Docker)

Este projeto está containerizado para facilitar a execução. Certifique-se de ter o **Docker Desktop** instalado e rodando.

1.  **Clone ou baixe o repositório** para sua máquina.
2.  Abra o terminal na pasta raiz do projeto.
3.  Execute o comando de build e start:

    ```bash
    docker compose up -d --build
    ```

4.  Acesse a aplicação no navegador:
    👉 **http://localhost:8080**

5.  Para parar a aplicação:
    ```bash
    docker compose down
    ```

---

## 📚 Guia de Uso

### 1. Acesso ao Sistema
Ao abrir o sistema, você verá a tela de Login. Se não tiver conta, utilize o link "Cadastre-se" (configurado para criar usuários comuns por padrão).

### 2. Perfil Recrutador (Admin)
* **Visualização:** Tem acesso ao "Painel do Recrutador" no topo da tela.
* **Criar Vaga:** Preencha o formulário no painel e clique em "Publicar".
* **Gerenciar:** Nos cards das vagas, use os botões para:
    * ✏️ **Editar:** Alterar dados da vaga.
    * 🗑️ **Excluir:** Remover a vaga.
    * 👥 **Candidatos:** Ver lista de interessados, aprovar/reprovar e enviar feedback.

### 3. Perfil Candidato (Usuário)
* **Visualização:** Vê a lista de vagas disponíveis.
* **Candidatura:** Clica em "Candidatar-se agora". O botão muda para "Pendente".
* **Acompanhamento:** Se o recrutador atualizar o status ou enviar feedback, a informação aparecerá diretamente no card da vaga logada.

---

## 📂 Estrutura de Arquivos

* `Dockerfile` & `docker-compose.yml`: Configurações do ambiente containerizado.
* `app.js`: Lógica de negócios, controle de UI e conexão com API.
* `painel.html`: Estrutura principal da aplicação (Dashboard).
* `index.html`: Tela de Login/Registro.
