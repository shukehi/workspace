const fs = require('fs');

function writeJsonAtomic(filePath, payload) {
  const tempPath = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(tempPath, JSON.stringify(payload, null, 4));
  fs.renameSync(tempPath, filePath);
}

function readJsonOrFallback(filePath, fallback = {}, logContext) {
  if (!fs.existsSync(filePath)) return fallback;
  try {
    const rawText = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(rawText || '{}');
  } catch (error) {
    if (logContext) {
      console.warn(`[configData] failed to parse ${logContext}, falling back to empty`, error);
    }
    return fallback;
  }
}

function createMappingProfileRoute(options) {
  const {
    profileName,
    endpoint,
    runtimeFile,
    staticFile,
    adapt,
    validate,
    readErrorMessage,
    saveErrorMessage
  } = options;

  function ensureRuntimeFile() {
    if (fs.existsSync(runtimeFile)) return;
    const seed = readJsonOrFallback(staticFile, {}, `static ${profileName} mapping`);
    const payload = adapt(seed);
    writeJsonAtomic(runtimeFile, payload);
  }

  function readMapping() {
    ensureRuntimeFile();
    const rawText = fs.readFileSync(runtimeFile, 'utf8');
    const raw = JSON.parse(rawText || '{}');
    const payload = adapt(raw);
    const issues = validate(raw);
    return { payload, issues };
  }

  function register(router) {
    router.get(endpoint, (req, res) => {
      try {
        const { payload, issues } = readMapping();
        if (issues.length > 0) {
          console.warn(`[configData] ${profileName} mapping validation issues:`, issues);
        }
        res.json(payload);
      } catch (error) {
        console.error(`Error reading ${profileName} mapping:`, error);
        res.status(500).json({ ok: false, error: readErrorMessage });
      }
    });

    router.put(endpoint, (req, res) => {
      try {
        const issues = validate(req.body);
        if (issues.length > 0) {
          return res.status(400).json({ ok: false, errors: issues });
        }
        const payload = adapt(req.body);
        writeJsonAtomic(runtimeFile, payload);
        res.json({ ok: true, data: payload });
      } catch (error) {
        console.error(`Error saving ${profileName} mapping:`, error);
        res.status(500).json({ ok: false, error: saveErrorMessage });
      }
    });
  }

  return {
    ensureRuntimeFile,
    readMapping,
    register
  };
}

module.exports = {
  createMappingProfileRoute,
  writeJsonAtomic
};
