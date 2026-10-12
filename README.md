# Learning Hub

My self-study course for Fall 2026, run like a college class: three tracks over 7 weeks (Oct 12 to Nov 29), with weekly modules, labs, quizzes and a gradebook.

- **GPU Kernels** (core, about 8 hrs a week): CUDA fundamentals, then Triton, ending with a fused AV preprocessing kernel.
- **Inference Systems** (about 2 hrs a week): KV cache, vLLM, quantization, speculative decoding, prefix caching, and agents that write kernels.
- **Building Agents** (about 2 hrs a week): agent patterns, a tool-use loop from scratch, MCP, context engineering, evals and multi-agent orchestration.

Both agent tracks end in one shared capstone: a mini Wafer, an agent that searches serving configs and ships the measured winner.

## Using the site

The site is hosted with GitHub Pages. Checkboxes, quiz readiness and check-in grades are saved in your browser's local storage. To move progress to another device, use **Export progress** in the sidebar, then **Import** on the other device.

## Editing the course

All content lives in `course.json`. Each module has a `track`, a `week`, a `title`, a `goal`, `blocks` of checklist items, and a `quiz`. Items support `` `code` `` and `[links](https://...)`.

Changing an item's text resets its checkbox, because checkbox ids are derived from the text.

## Running locally

```
python3 -m http.server 8000
```

Then open http://localhost:8000. Opening `index.html` directly from disk won't work, because the browser blocks loading `course.json` from a file path.
