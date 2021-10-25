const path = require('path');
const fs = require('fs');

const defaultEnvName = 'local';
const sampleExt = '.sample';

function isObjectLike(value) {
  return typeof value === 'object' && Boolean(value);
}

function getErrorMessage(err) {
  return (isObjectLike(err) && err.message) || String(err);
}

function slugifyFsPath(value) {
  value = String(value);
  return value.replace(/[^\w_\-\+\~\^,.\s]/g, '_');
}

function createSimpleParser(reSubst, { replaceFallback, replaceTransform } = {}) {
  return (contents, context) => {
    const originalPath = String(contents);
    let remainingPath = originalPath;
    let parsedPath = '';
    let captures;
    let matchCount = 0;

    while ((captures = remainingPath.match(reSubst))) {
      matchCount += 1;
      const expression = captures[0];
      const valuePrefix = remainingPath.substring(0, captures.index);
      remainingPath = remainingPath.substring(captures.index + expression.length);

      const pathExpression = captures[1];
      const contextPath = parseObjectPath(pathExpression);
      let contextValue;

      try {
        contextValue = navigateObject(context, contextPath);
      } catch (error) {
        if (typeof replaceFallback === 'function') {
          contextValue = replaceFallback({ context, contextPath, expression, pathExpression, error });
        } else {
          throw error;
        }
      }

      const substituteValue = replaceTransform ? replaceTransform(contextValue) : contextValue;
      parsedPath = parsedPath + valuePrefix + substituteValue;
    }
    const finalPath = matchCount === 0 ? originalPath : parsedPath + remainingPath;
    return finalPath;
  };
}

const deduceDestinationFilename = createSimpleParser(/(?<!\[)\[{2}([^\[\]]+)\]{2}(?!\])/, {
  replaceTransform: slugifyFsPath,
});

const replaceEnvVars = createSimpleParser(/(?<!\\)\$\{([^}]+)\}/m, {
  replaceFallback: ({ expression, error }) => {
    const message = getErrorMessage(error);
    console.warn(`*** [SAMPLE] Failed to substitute expression "${expression}"; Reason: ${message}`);
    return expression;
  },
});

const copyProcessor = async (src, dst, _options = {}) => {
  console.log(`*** [SAMPLE] Copying "${src}" -> "${dst}"`);
  fs.copyFileSync(src, dst);
};

const envFileProcessor = async (src, dst, { context }) => {
  console.log(`*** [SAMPLE] Generating env-var-substituted file: "${src}" -> "${dst}"`);
  const srcContents = fs.readFileSync(src, { encoding: 'utf-8' });
  const dstContents = replaceEnvVars(srcContents, context).replace(/\\\$\{/g, '${');
  fs.writeFileSync(dst, dstContents);
};

const processorConfigs = [
  {
    name: 'env-file',
    test: /^\.env|\.env$/,
    processor: envFileProcessor,
  },
];

const PROJECT_ROOT_DIR = path.resolve(__dirname, '..', '..');
const defaultRoots = [
  PROJECT_ROOT_DIR,
  path.resolve(PROJECT_ROOT_DIR, '.vscode'),
  ...['dbvolve', 'dbvolve-cli'].map(projectName => [
    path.resolve(PROJECT_ROOT_DIR, 'packages', projectName),
    path.resolve(PROJECT_ROOT_DIR, 'packages', projectName, '.vscode'),
  ]),
];

function createContext() {
  const envName = process.env.APP_ENV || process.env.NODE_ENV || defaultEnvName;

  const context = Object.assign(
    Object.create(process.env),
    {
      envName,
      env: {
        name: envName,
      },
    },
  );

  return context;
}

function parseObjectPath(path) {
  const pathSplits = path.replace(/\.{3,}/g, '..').split(/\.(?!\.)/);
  const pathParts = pathSplits.reduce((parts, next, index) => {
    if (index === 0) {
      parts.push(next);
    } else {
      let previous = parts.pop();
      if (previous.endsWith('.')) {
        parts.push(`${previous}${next}`);
      } else {
        parts.push(previous);
        parts.push(next);
      }
    }
    return parts;
  }, []);
  return pathParts;
}

function navigateObject(obj, path) {
  let current = obj;
  path.forEach((propertyName, index, array) => {
    const isLast = index === (array.length - 1);
    current = current[propertyName];
    const isObject = isObjectLike(current);
    if (!isLast && !isObject) {
      throw new Error(`The navigation for path ${JSON.stringify(path)} terminated prematurely.`);
    }
  });
  if (current === undefined) {
    throw new Error(`Could not find a value for path ${JSON.stringify(path)}.`);
  }
  return current;
}

async function main() {
  const reEnvAssign = /^([^=]+)=(.+)/;
  const args = process.argv.slice(2);
  const argsRoots = [];

  for (const arg of args) {
    const captures = arg.match(reEnvAssign);
    if (captures) {
      const envVarName = captures[1].trim();
      const envVarValue = captures[2].replace(/^\s+/, '');
      process.env[envVarName] = envVarValue;
    } else {
      argsRoots.push(arg);
    }
  }

  const context = createContext();
  const roots = argsRoots.length > 0 ? argsRoots : defaultRoots;

  for (let root of roots) {
    root = path.resolve(root);

    if (!fs.existsSync(root)) {
      console.log(`*** [SAMPLE] Root "${root}" does not exist. Skipping...`);
      continue;
    }

    console.debug(`*** [SAMPLE] Evaluating root "${root}"...`);

    for (const fsEntry of fs.readdirSync(root, { withFileTypes: true })) {
      if (!fsEntry.isFile || !fsEntry.name.endsWith(sampleExt)) continue;
      const src = path.resolve(root, fsEntry.name);
      let dst, deducedBasename;

      try {
        console.debug(`*** [SAMPLE] In root "${root}": Found source file "${src}"`);
        const dstBasename = path.basename(fsEntry.name, sampleExt);
        deducedBasename = deduceDestinationFilename(dstBasename, context);
        console.debug(`*** [SAMPLE] In root "${root}": Deduced destination file basename "${dstBasename}" -> "${deducedBasename}"`);
        dst = path.resolve(root, deducedBasename);
      } catch (err) {
        const message = getErrorMessage(err);
        console.error(`*** [SAMPLE] ERROR: Could not deduce destination filename for source "${src}"! Reason: ${message}`);
        continue;
      }

      if (fs.existsSync(dst)) {
        console.log(`*** [SAMPLE] "${dst}" already exists, skipping...`);
        continue;
      }

      const processorConfig = processorConfigs.find(({ test }) => test.test(deducedBasename));
      const processor = processorConfig?.processor || copyProcessor;
      await processor(src, dst, { context });
    }
  }
}

main();
