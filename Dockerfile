# 1. Usamos uma imagem leve do Nginx (servidor web) baseada em Linux Alpine
FROM nginx:alpine

# 2. Copiamos todos os arquivos da sua pasta atual (.) para a pasta pública do Nginx no container
COPY . /usr/share/nginx/html

# 3. Informamos ao Docker que o container vai "escutar" na porta 80
EXPOSE 80

# 4. O comando para iniciar o Nginx quando o container rodar
CMD ["nginx", "-g", "daemon off;"]