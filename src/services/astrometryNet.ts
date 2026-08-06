export interface PlateSolveResult {
  jobId: number;
  ra: number;
  dec: number;
  orientation: number;
  pixelScale: number;
  radius: number;
  objects: string[];
  annotatedImageUrl: string;
}

const API = "https://nova.astrometry.net/api";
const PLATE_SOLVER_KEY = "ehfpmhwwbvthjwgf";
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function json<T>(response: Response): Promise<T> {
  if (!response.ok) throw new Error(`The plate-solving service returned ${response.status}.`);
  const value = (await response.json()) as T & { status?: string; errormessage?: string };
  if (value.status === "error") throw new Error(value.errormessage || "The plate-solving service could not process the request.");
  return value;
}

export async function solveImage(
  file: Blob,
  fileName: string,
  onStatus?: (message: string) => void,
): Promise<PlateSolveResult> {
  onStatus?.("Connecting to the plate solver…");
  const loginBody = new URLSearchParams({ "request-json": JSON.stringify({ apikey: PLATE_SOLVER_KEY }) });
  const login = await json<{ session: string }>(await fetch(`${API}/login`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: loginBody.toString() }));
  onStatus?.("Uploading your image privately…");
  const form = new FormData();
  form.append("request-json", JSON.stringify({ session: login.session, publicly_visible: "n", allow_modifications: "n", allow_commercial_use: "n", downsample_factor: 2 }));
  form.append("file", file, fileName);
  const upload = await json<{ subid: number }>(await fetch(`${API}/upload`, { method: "POST", body: form }));
  let jobId: number | null = null;
  for (let attempt = 0; attempt < 60 && jobId === null; attempt += 1) {
    onStatus?.("Finding the star pattern…");
    await delay(2500);
    const submission = await json<{ jobs: (number | null)[] }>(await fetch(`${API}/submissions/${upload.subid}`));
    jobId = submission.jobs.find((job): job is number => typeof job === "number") ?? null;
  }
  if (jobId === null) throw new Error("The solve timed out before the service assigned a job.");
  for (let attempt = 0; attempt < 60; attempt += 1) {
    onStatus?.("Solving and calibrating the frame…");
    const job = await json<{ status: string }>(await fetch(`${API}/jobs/${jobId}`));
    if (job.status === "failure") throw new Error("The solver could not recognise enough stars in this image.");
    if (job.status === "success") {
      const info = await json<{ calibration: { ra: number; dec: number; orientation: number; pixscale: number; radius: number }; objects_in_field?: string[] }>(await fetch(`${API}/jobs/${jobId}/info/`));
      return { jobId, ra: info.calibration.ra, dec: info.calibration.dec, orientation: info.calibration.orientation, pixelScale: info.calibration.pixscale, radius: info.calibration.radius, objects: info.objects_in_field ?? [], annotatedImageUrl: `https://nova.astrometry.net/annotated_display/${jobId}` };
    }
    await delay(2500);
  }
  throw new Error("The plate solve timed out. Try a smaller image with more visible stars.");
}
