# Usar Node.js como base
FROM node:20-alpine

# Crear directorio de trabajo
WORKDIR /app

# Copiar package.json y lock
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar el resto del código
COPY . .

# Exponer puerto donde correrá el frontend
EXPOSE 3000

# Comando para levantar el frontend
CMD ["npm", "run", "dev"]
