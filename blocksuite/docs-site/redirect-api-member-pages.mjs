import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';

const apiDir = join(process.cwd(), 'api');
const distApiDir = join(process.cwd(), '.vitepress', 'dist', 'api');

const kindDirs = new Map([
  ['Classes', 'classes'],
  ['Enumerations', 'enumerations'],
  ['Functions', 'functions'],
  ['Interfaces', 'interfaces'],
  ['Type Aliases', 'type-aliases'],
  ['Variables', 'variables'],
]);
const fallbackKindDirs = [...kindDirs.values()];

if (existsSync(apiDir) && existsSync(distApiDir)) {
  for (const markdownFile of findMarkdownFiles(apiDir)) {
    const markdownPath = relative(apiDir, markdownFile);
    const htmlPath = markdownPath.replace(/\.md$/, '.html');
    const targetPath = join(distApiDir, htmlPath);

    if (!existsSync(targetPath)) {
      continue;
    }

    for (const redirect of getRedirects(markdownFile, htmlPath)) {
      const redirectPath = join(distApiDir, redirect.path);
      mkdirSync(dirname(redirectPath), { recursive: true });
      writeFileSync(redirectPath, getRedirectHtml(redirect.target), 'utf8');
    }
  }
}

function findMarkdownFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name);

    if (entry.isDirectory()) {
      return findMarkdownFiles(path);
    }

    return entry.isFile() && entry.name.endsWith('.md') ? [path] : [];
  });
}

function getRedirects(markdownFile, htmlPath) {
  const redirects = [];

  for (const line of readFileSync(markdownFile, 'utf8').split('\n')) {
    const member = line.match(/^### (.+)$/);

    if (!member) {
      continue;
    }

    const name = getMemberName(member[1]);

    if (!name) {
      continue;
    }

    for (const kindDir of fallbackKindDirs) {
      redirects.push({
        path: htmlPath.replace(/\.html$/, `/${kindDir}/${name}.html`),
        target: getRelativeTarget(htmlPath, kindDir, name),
      });
    }
  }

  return redirects;
}

function getMemberName(heading) {
  return heading
    .replaceAll('`', '')
    .replace(/^(abstract|readonly)\s+/, '')
    .replace(/\(\)$/, '')
    .replace(/<.*>$/, '')
    .trim();
}

function getRelativeTarget(htmlPath, kindDir, name) {
  const redirectPath = htmlPath.replace(/\.html$/, `/${kindDir}/${name}.html`);
  return relative(dirname(redirectPath), htmlPath).split(sep).join('/');
}

function getRedirectHtml(target) {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="robots" content="noindex">
    <script>
      location.replace(${JSON.stringify(target)} + location.hash);
    </script>
  </head>
  <body>
    <a href="${target}">Redirecting...</a>
  </body>
</html>
`;
}
