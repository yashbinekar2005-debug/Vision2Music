import { pipeline, env } from "@huggingface/transformers";

env.allowLocalModels = false;

const IMAGENET_MAP: Record<string, string> = {
  "grand piano": "piano",
  "upright, upright piano": "piano",
  "upright piano": "piano",
  "acoustic guitar": "guitar",
  "electric guitar": "guitar",
  "bass drum": "drums",
  "snare drum": "drums",
  "steel drum": "drums",
  "drum, membranophone, tympan": "drums",
  "violin, fiddle": "violin",
  "violin": "violin",
  "flute": "flute",
};

let classifierPromise: Promise<any> | null = null;

self.addEventListener("message", async (event) => {
  const { type, imageBuffer, mimeType } = event.data;
  if (type !== "classify") return;

  try {
    if (!classifierPromise) {
      self.postMessage({ status: "loading", progress: 0, text: "Starting download..." });
      classifierPromise = pipeline(
        "image-classification",
        "Xenova/resnet-50",
        {
          dtype: "q4",
          progress_callback: (progress: any) => {
            if (progress.status === "progress") {
              const pct = Math.round((progress.loaded / progress.total) * 100);
              self.postMessage({
                status: "progress",
                progress: pct,
                text: `Downloading model (${progress.file || ""})`,
              });
            } else if (progress.status === "done") {
              self.postMessage({ status: "progress", progress: 100, text: "Model ready" });
            }
          },
        },
      ).then((clf) => {
        self.postMessage({ status: "ready" });
        return clf;
      });
    }

    const classifier = await classifierPromise;
    const blob = new Blob([imageBuffer], { type: mimeType || "image/jpeg" });
    const url = URL.createObjectURL(blob);
    const predictions = await classifier(url, { topk: 10 });
    URL.revokeObjectURL(url);

    const results: { label: string; score: number }[] = [];
    const seen = new Set<string>();

    for (const p of predictions) {
      const label = p.label.toLowerCase();
      for (const [keyword, instrument] of Object.entries(IMAGENET_MAP)) {
        if (label.includes(keyword)) {
          if (!seen.has(instrument)) {
            seen.add(instrument);
            results.push({ label: instrument, score: p.score });
          }
          break;
        }
      }
    }

    const fallback = predictions.slice(0, 5).map((p: any) => ({
      label: p.label.toLowerCase().slice(0, 30),
      score: p.score,
    }));

    self.postMessage({
      status: "complete",
      results: results.length > 0 ? results : fallback,
    });
  } catch (err) {
    self.postMessage({
      status: "error",
      error: err instanceof Error ? err.message : String(err),
    });
  }
});
