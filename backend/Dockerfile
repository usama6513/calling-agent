FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY prisma ./prisma
RUN npx prisma generate

COPY . .

EXPOSE 7860
ENV PORT=7860
ENV NODE_ENV=production

CMD ["sh", "-c", "npx prisma db push --skip-generate && node src/index.js"]
