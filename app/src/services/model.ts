import * as ort from 'onnxruntime-web';

export const MODEL_REPO = 'TunahanCnr/se-primer-v2';
export const MODEL_COMMIT = 'YOK';

export interface ModelConfig {
  features: Array<{ name: string }>;
  decision_threshold: number;
  [key: string]: unknown;
}

export interface ModelArtifacts {
  session: ort.InferenceSession;
  config: ModelConfig;
}

// Read URL parameters once at startup
const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
const isModelDisabled = searchParams.get('model') === 'kapali';
const pParam = searchParams.get('p');
const parsedP = pParam !== null ? parseFloat(pParam) : NaN;
const testHookP: number | null = !isNaN(parsedP) && parsedP >= 0 && parsedP <= 1 ? parsedP : null;

let modelPromise: Promise<ModelArtifacts | null> | null = null;
let loadedConfig: ModelConfig | null = null;

export function getDecisionThreshold(): number {
  if (loadedConfig && typeof loadedConfig.decision_threshold === 'number') {
    return loadedConfig.decision_threshold;
  }
  return 0.5;
}

export function loadModel(): Promise<ModelArtifacts | null> {
  if (modelPromise) {
    return modelPromise;
  }

  modelPromise = (async () => {
    // If MODEL_COMMIT === 'YOK' or URL has model=kapali, resolve to null without any network request
    if (MODEL_COMMIT === 'YOK' || isModelDisabled) {
      return null;
    }

    const baseUrl = `https://huggingface.co/${MODEL_REPO}/resolve/${MODEL_COMMIT}/`;

    try {
      ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.31.1/dist/';
      ort.env.wasm.numThreads = 1;

      // 10 second timeout for model loading
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => {
        abortController.abort();
      }, 10000);

      const configRes = await fetch(`${baseUrl}config.json`, { signal: abortController.signal });
      if (!configRes.ok) {
        clearTimeout(timeoutId);
        console.warn(`Failed to fetch model config: HTTP ${configRes.status}`);
        return null;
      }

      const config: ModelConfig = await configRes.json();
      loadedConfig = config;

      const session = await ort.InferenceSession.create(`${baseUrl}model.onnx`);
      clearTimeout(timeoutId);

      return { session, config };
    } catch (error) {
      console.warn('Error loading ONNX model:', error);
      return null;
    }
  })();

  return modelPromise;
}

export async function predictP(
  features: Record<string, number>,
  ignoreTestHook = false
): Promise<number | null> {
  // Test hook: if page URL has p=<0..1>, return that number instead (no model needed)
  if (!ignoreTestHook && testHookP !== null) {
    return testHookP;
  }

  const model = await loadModel();
  if (!model || !model.session || !model.config) {
    return null;
  }

  try {
    const { session, config } = model;
    const inputData = Float32Array.from(config.features.map((f) => features[f.name] ?? 0));
    const tensor = new ort.Tensor('float32', inputData, [1, config.features.length]);

    const inputName = session.inputNames[0] || 'input';
    const feeds: Record<string, ort.Tensor> = {
      [inputName]: tensor,
      input: tensor,
    };

    const result = await session.run(feeds);
    const probTensor = (result.probabilities || result[session.outputNames[1]] || result[session.outputNames[0]]) as ort.Tensor;

    if (probTensor && probTensor.data) {
      return Number(probTensor.data[1]);
    }

    return null;
  } catch (error) {
    console.warn('Error during model inference:', error);
    return null;
  }
}
