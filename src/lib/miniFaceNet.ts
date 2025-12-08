import * as ort from "onnxruntime-web";

let session: ort.InferenceSession | null = null;

export async function loadMiniFaceNet() {
  console.log("Loading model from:", "/models/minifacenet_256d.onnx");
  if (!session) {
    session = await ort.InferenceSession.create("/models/minifacenet_256d.onnx");
  }
  return session;
}

// ----------- GET EMBEDDING ----------
export async function getEmbedding(imageData: ImageData): Promise<number[]> {
  const session = await loadMiniFaceNet();

  // Preprocess -> 112x112, normalized tensor
  const tensor = preprocessToTensor(imageData);

  // NOTE: "input" harus sama dengan model ONNX input name
  const feeds: Record<string, ort.Tensor> = {
    input: tensor,
  };

  const output = await session.run(feeds);

  // NOTE: "embeddings" harus sama dengan output name
  const embedding = output["embeddings"].data as number[];

  return Array.from(embedding);
}

// ----------- PREPROCESS ----------
function preprocessToTensor(image: ImageData): ort.Tensor {
  const target = 112;
  const resized = resizeImageData(image, target, target);
  const data = resized.data; // RGBA

  const floatArr = new Float32Array(1 * 3 * target * target);

  // Convert RGBA → Float32 R,G,B normalized [CHW format]
  for (let y = 0; y < target; y++) {
    for (let x = 0; x < target; x++) {
      const pixelIndex = (y * target + x) * 4;

      const r = data[pixelIndex] / 255;
      const g = data[pixelIndex + 1] / 255;
      const b = data[pixelIndex + 2] / 255;

      const base = y * target + x;
      floatArr[base] = r;
      floatArr[base + target * target] = g;
      floatArr[base + 2 * target * target] = b;
    }
  }

  return new ort.Tensor("float32", floatArr, [1, 3, target, target]);
}

// ----------- RESIZE ----------
function resizeImageData(imageData: ImageData, width: number, height: number): ImageData {
  const canvas = document.createElement("canvas");
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext("2d")!;
  ctx.putImageData(imageData, 0, 0);

  const resizedCanvas = document.createElement("canvas");
  resizedCanvas.width = width;
  resizedCanvas.height = height;
  const resizedCtx = resizedCanvas.getContext("2d")!;
  resizedCtx.drawImage(canvas, 0, 0, width, height);

  return resizedCtx.getImageData(0, 0, width, height);
}
