const fs = require('fs');
const content = `import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL required");
}

export default defineConfig({
  schema: "./src/schema/index.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
`;
fs.writeFileSync('lib/db/drizzle.config.ts', content);
console.log('drizzle.config.ts actualizado correctamente');
