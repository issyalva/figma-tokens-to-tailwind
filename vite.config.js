import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

const isGithubActions = process.env.GITHUB_ACTIONS === "true";
const repositoryName = process.env.GITHUB_REPOSITORY?.split("/")[1] ?? "";
const base = isGithubActions && repositoryName ? `/${repositoryName}/` : "./";

export default defineConfig({
  plugins: [tailwindcss()],
  base,
});