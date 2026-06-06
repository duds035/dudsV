#!/usr/bin/env node
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const repoRoot = process.cwd();
const ignoreDirs = ['.git', 'node_modules', '.github', '.githooks'];
const ignoreFiles = ['package-lock.json', 'yarn.lock'];
let timer = null;
const DEBOUNCE_MS = 3000;

function shouldIgnore(filePath) {
  if (!filePath) return true;
  const normalized = filePath.split(path.sep).join(path.sep);
  if (ignoreFiles.some(f => normalized.endsWith(path.sep + f) || normalized === path.join(repoRoot, f))) return true;
  return ignoreDirs.some(d => normalized.indexOf(path.sep + d + path.sep) !== -1 || normalized.endsWith(path.sep + d));
}

function run(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, { cwd: repoRoot, maxBuffer: 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) return reject({ err, stdout, stderr });
      resolve({ stdout, stderr });
    });
  });
}

async function autoCommitAndPush() {
  try {
    const st = await run('git status --porcelain');
    if (!st.stdout.trim()) {
      console.log('[autowatch] sem alterações para commitar');
      return;
    }
    // Safety: don't run if AUTOWATCH_DISABLED env var is set
    if (process.env.AUTOWATCH_DISABLED) {
      console.log('[autowatch] desabilitado pela variável AUTOWATCH_DISABLED');
      return;
    }
    const br = await run('git rev-parse --abbrev-ref HEAD');
    const branch = br.stdout.trim();
    const msg = `auto: changes ${new Date().toISOString()}`;
    console.log('[autowatch] adicionando, commitando e enviando...');
    await run('git add -A');
    try {
      await run(`git commit -m "${msg}"`);
    } catch (e) {
      console.log('[autowatch] commit falhou (provavelmente sem mudanças adicionais):', e.stderr || e);
    }
    await run(`git push origin ${branch}`);
    console.log('[autowatch] push concluído');
  } catch (e) {
    console.error('[autowatch] erro:', e.stderr || e.err || e);
  }
}

function schedule() {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    autoCommitAndPush();
  }, DEBOUNCE_MS);
}

console.log('[autowatch] iniciando watcher em', repoRoot);

fs.watch(repoRoot, { recursive: true }, (eventType, filename) => {
  if (!filename) return;
  const full = path.join(repoRoot, filename);
  if (shouldIgnore(full)) return;
  console.log('[autowatch] evento', eventType, filename);
  schedule();
});
