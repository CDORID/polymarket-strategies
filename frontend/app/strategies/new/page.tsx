"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createStrategy, getTemplates } from "@/lib/api";
import type { StrategyTemplate } from "@/lib/types";

export default function NewStrategyPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<StrategyTemplate[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [code, setCode] = useState(`def signal(prices, position, params):
    """Return 1 (buy), -1 (sell), or 0 (hold)."""
    if len(prices) < 2:
        return 0
    if prices[-1] > prices[-2]:
        return 1
    elif prices[-1] < prices[-2]:
        return -1
    return 0
`);
  const [paramsJson, setParamsJson] = useState("{}");
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getTemplates().then(setTemplates).catch(() => {});
  }, []);

  function applyTemplate(template: StrategyTemplate) {
    setName(template.name);
    setDescription(template.description);
    setCode(template.code);
    setParamsJson(JSON.stringify(template.params, null, 2));
    setSelectedTemplate(template.key);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);

    let params: Record<string, any> = {};
    try {
      params = JSON.parse(paramsJson);
    } catch {
      setError("Invalid JSON in parameters");
      setSaving(false);
      return;
    }

    try {
      const strategy = await createStrategy({
        name,
        description,
        code,
        params,
        template_key: selectedTemplate || undefined,
      });
      router.push(`/strategies/${strategy.id}`);
    } catch (err: any) {
      setError(err.message || "Failed to create strategy");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Create Strategy</h1>
        <p className="text-sm text-muted-foreground">
          Build a trading strategy from scratch or use a template
        </p>
      </div>

      {/* Templates */}
      {templates.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground mb-2">
            Templates
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {templates.map((t) => (
              <button
                key={t.key}
                onClick={() => applyTemplate(t)}
                className={`rounded-lg border p-3 text-left transition-all ${
                  selectedTemplate === t.key
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/30"
                }`}
              >
                <p className="font-medium text-sm">{t.name}</p>
                <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                  {t.description}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="My Trading Strategy"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="What does this strategy do?"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Strategy Code (Python)
          </label>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
            rows={18}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            spellCheck={false}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Must define a <code className="bg-muted px-1 rounded">signal(prices, position, params)</code> function that returns 1, -1, or 0.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Parameters (JSON)
          </label>
          <textarea
            value={paramsJson}
            onChange={(e) => setParamsJson(e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            spellCheck={false}
          />
        </div>

        {error && (
          <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? "Creating..." : "Create Strategy"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-lg border border-border px-6 py-2 text-sm font-medium hover:bg-accent"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
