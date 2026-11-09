import { useEffect, useEffectEvent, useState } from 'react';
import Workspace from '../components/Workspace';
import { invoke } from '../api';
type Reel = {
  id: string;
  input_ready: boolean;
  input_status: string;
  input_error?: string;
  prompt: string;
};
type Clip = { id: string; status: string; scene_index: number; error_code?: string };
export default function VideoStudio() {
  const [reel, setReel] = useState<Reel | null>(null);
  const [clips, setClips] = useState<Clip[]>([]);
  const [prompt, setPrompt] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [preview, setPreview] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [links, setLinks] = useState<Record<string, string>>({});
  const [output, setOutput] = useState('');
  const call = (action: string, extra: Record<string, unknown> = {}) =>
    invoke('generate-video', { action, ...extra });
  async function refresh(id?: string) {
    const data = await call('list', id ? { reel_id: id } : {});
    setReel(data.reel);
    setClips(data.clips || []);
    if (data.reel?.input_ready) {
      const result = await call('input_link', { reel_id: data.reel.id });
      setPreview(result.url);
    }
    return data as { reel: Reel | null; clips: Clip[] };
  }
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError('');
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }
  const reload = useEffectEvent(async () => {
    if (busy) return;
    try {
      const data = await refresh(reel?.id);
      if (!data.reel?.input_ready || document.visibilityState !== 'visible') return;
      const index = [0, 1, 2, 3, 4, 5].find(
        (i) => !data.clips.some((c) => c.scene_index === i && c.status === 'complete'),
      );
      if (index === undefined || data.clips.some((c) => ['queued', 'saving'].includes(c.status)))
        return;
      if (data.clips.some((c) => c.scene_index === index && c.status === 'failed')) return;
      await run(async () => {
        await call('scene', {
          id: crypto.randomUUID(),
          reel_id: data.reel!.id,
          scene_index: index,
        });
        await refresh(data.reel!.id);
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  });
  useEffect(() => {
    reload();
  }, []);
  const reelId = reel?.id;
  useEffect(() => {
    if (!reelId) return;
    const timer = window.setInterval(() => reload(), 10000);
    return () => clearInterval(timer);
  }, [reelId]);
  useEffect(
    () => () => {
      if (output) URL.revokeObjectURL(output);
    },
    [output],
  );
  async function continueReel() {
    if (!reel) return;
    let current = await refresh(reel.id);
    if (!current.reel?.input_ready) {
      if (current.reel?.input_status === 'failed') await call('retry_image', { reel_id: reel.id });
      await refresh(reel.id);
      return;
    }
    for (let index = 0; index < 6; index++) {
      current = await refresh(reel.id);
      const existing =
        current.clips.find((c) => c.scene_index === index && c.status === 'complete') ||
        current.clips.find((c) => c.scene_index === index);
      if (existing?.status === 'complete') continue;
      if (existing && ['queued', 'saving'].includes(existing.status)) return;
      await call('scene', { id: crypto.randomUUID(), reel_id: reel.id, scene_index: index });
      await refresh(reel.id);
      return;
    }
  }
  async function link(clip: Clip) {
    const data = await call('link', { id: clip.id });
    setLinks((prev) => ({ ...prev, [clip.id]: data.url }));
    return data.url as string;
  }
  async function combine() {
    if (!window.MediaRecorder)
      throw new Error('This browser does not support reel export. Download individual scenes.');
    const ordered = [...clips].sort((a, b) => a.scene_index - b.scene_index);
    const blobs: Blob[] = [];
    for (const clip of ordered) {
      const response = await fetch(await link(clip));
      if (!response.ok) throw new Error('Scene download failed.');
      blobs.push(await response.blob());
    }
    const canvas = document.createElement('canvas');
    canvas.width = 720;
    canvas.height = 1280;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Video canvas unavailable.');
    const mime = ['video/mp4', 'video/webm;codecs=vp9', 'video/webm'].find((type) =>
      MediaRecorder.isTypeSupported(type),
    );
    if (!mime) throw new Error('No supported export format.');
    const stream = canvas.captureStream(30);
    const recorder = new MediaRecorder(stream, { mimeType: mime });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size) chunks.push(e.data);
    };
    const done = new Promise<Blob>((resolve, reject) => {
      recorder.onstop = () => resolve(new Blob(chunks, { type: mime }));
      recorder.onerror = () => reject(new Error('Export failed.'));
    });
    recorder.start();
    try {
      for (const blob of blobs) {
        const url = URL.createObjectURL(blob);
        const video = document.createElement('video');
        video.muted = true;
        video.playsInline = true;
        video.src = url;
        try {
          await new Promise<void>((resolve, reject) => {
            video.onloadeddata = () => resolve();
            video.onerror = () => reject(new Error('Scene could not be decoded.'));
          });
          await video.play();
          await new Promise<void>((resolve, reject) => {
            let frame = 0;
            const draw = () => {
              context.fillStyle = '#000';
              context.fillRect(0, 0, 720, 1280);
              const scale = Math.max(720 / video.videoWidth, 1280 / video.videoHeight);
              const width = video.videoWidth * scale,
                height = video.videoHeight * scale;
              context.drawImage(video, (720 - width) / 2, (1280 - height) / 2, width, height);
              frame = requestAnimationFrame(draw);
            };
            video.onended = () => {
              cancelAnimationFrame(frame);
              resolve();
            };
            video.onerror = () => {
              cancelAnimationFrame(frame);
              reject(new Error('Scene playback failed.'));
            };
            draw();
          });
        } finally {
          video.pause();
          URL.revokeObjectURL(url);
        }
      }
    } finally {
      recorder.stop();
      stream.getTracks().forEach((track) => track.stop());
    }
    const blob = await done;
    setOutput(URL.createObjectURL(blob));
  }
  const complete = clips.filter((c) => c.status === 'complete').length;
  return (
    <Workspace title="Video studio" description="One idea. Six scenes. A story in motion.">
      {error && (
        <p role="alert" className="notice">
          {error}
        </p>
      )}
      <div className="feature-layout-grid">
        <section className="feature-panel stack">
          <h3>{reel ? 'Your latest reel' : 'Create a 30-second reel'}</h3>
          <p>
            Six distinct five-second scenes. Generation uses your account’s shared provider quota.
          </p>
          {!reel ? (
            <>
              <label>
                Describe your scene
                <textarea
                  className="feature-input"
                  maxLength={1000}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                />
              </label>
              <label>
                Optional starting image
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  disabled={busy}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    run(async () => {
                      if (file.size > 2 * 1024 * 1024)
                        throw new Error('Choose an image up to 2 MB.');
                      const bitmap = await createImageBitmap(file);
                      const canvas = document.createElement('canvas');
                      const scale = Math.min(1, 1024 / Math.max(bitmap.width, bitmap.height));
                      canvas.width = Math.round(bitmap.width * scale);
                      canvas.height = Math.round(bitmap.height * scale);
                      canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
                      bitmap.close();
                      const data = canvas.toDataURL('image/jpeg', 0.8);
                      if (data.length > 1400000)
                        throw new Error('Image too large after resizing. Choose a smaller image.');
                      setImage(data.split(',')[1]);
                      setPreview(data);
                    });
                  }}
                />
              </label>
              {image && (
                <button
                  onClick={() => {
                    setImage(null);
                    setPreview('');
                  }}
                >
                  Remove image and use my prompt
                </button>
              )}
              <button
                className="btn-primary"
                disabled={busy || !prompt.trim()}
                onClick={() =>
                  run(async () => {
                    const data = await call('create_reel', {
                      id: crypto.randomUUID(),
                      prompt,
                      ...(image ? { image } : {}),
                    });
                    await refresh(data.id);
                  })
                }
              >
                Generate 30-second reel
              </button>
            </>
          ) : (
            <>
              <p>{reel.prompt}</p>
              <p>
                Starting image: {reel.input_status} {reel.input_error}
              </p>
              <p>{complete} of 6 scenes complete</p>
              <progress max={6} value={complete} />
              <button
                disabled={busy || complete === 6}
                className="btn-primary"
                onClick={() => run(continueReel)}
              >
                Continue generation
              </button>
              <p>
                Scenes advance while this tab stays open. Failed scenes require Continue generation
                to retry.
              </p>
              <button
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    await refresh(reel.id);
                  })
                }
              >
                Refresh
              </button>
              {complete === 6 && (
                <button disabled={busy} onClick={() => run(combine)}>
                  Combine & export reel
                </button>
              )}
              {output && (
                <a
                  href={output}
                  download={
                    MediaRecorder.isTypeSupported('video/mp4')
                      ? 'stride-reel.mp4'
                      : 'stride-reel.webm'
                  }
                >
                  Download combined reel
                </a>
              )}
              <button
                disabled={busy}
                onClick={() => {
                  setReel(null);
                  setClips([]);
                  setPreview('');
                  setOutput('');
                }}
              >
                Start another reel
              </button>
            </>
          )}
          {preview && <img className="video-preview" src={preview} alt="Reel starting image" />}
          {busy && <p role="status">Working… Keep this tab open.</p>}
        </section>
        <section className="stack">
          <h3>Scene timeline</h3>
          {[0, 1, 2, 3, 4, 5].map((index) => {
            const clip =
              clips.find((c) => c.scene_index === index && c.status === 'complete') ||
              clips.find((c) => c.scene_index === index);
            return (
              <article className="feature-panel stack" key={index}>
                <h3>
                  Scene {index + 1} · {clip?.status || 'Waiting'}
                </h3>
                {clip?.error_code && <p>{clip.error_code}</p>}
                {clip?.status === 'complete' && (
                  <button
                    disabled={busy}
                    onClick={() =>
                      run(async () => {
                        await link(clip);
                      })
                    }
                  >
                    Load playback & download
                  </button>
                )}
                {clip && links[clip.id] && (
                  <>
                    <video controls src={links[clip.id]} className="video-preview" />
                    <a href={links[clip.id]} target="_blank" rel="noreferrer">
                      Download scene MP4
                    </a>
                  </>
                )}
              </article>
            );
          })}
        </section>
      </div>
    </Workspace>
  );
}
