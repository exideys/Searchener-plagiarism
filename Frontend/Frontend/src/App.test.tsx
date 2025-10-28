import { describe, beforeEach, afterEach, test, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";

beforeEach(() => {
  Object.defineProperty(import.meta, "env", {
    value: { VITE_API_URL: "http://localhost:8081" },
    configurable: true,
  });
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("App UI and behavior", () => {
  test("mounts basic UI (header, text and files sections)", () => {
    render(<App />);
    expect(screen.getByText(/Searchener-plagiarism/i)).toBeInTheDocument();
    expect(screen.getByText(/Paste text to analyze/i)).toBeInTheDocument();
    expect(screen.getByText(/Analyze files/i)).toBeInTheDocument();
    const selects = screen.getAllByRole("combobox");
    expect(selects.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("button", { name: /Analyze text/i })).toBeDisabled();
  });

  test("text analysis (mode=words): shows stats table and plagiarism table", async () => {
    const analyzeResponse = {
      total: 3,
      counts: { hello: 1, world: 2 },
      frequencies: { hello: 1 / 3, world: 2 / 3 },
    };

    const plagiarismResponse = {
      score: 0.5,
      potentialSources: [
        {
          matchedShingles: ["hello world", "world world"],
          url: "http://example.com/source",
        },
      ],
    };

    const fetchSpy = vi.spyOn(globalThis, "fetch");
    fetchSpy
      .mockResolvedValueOnce(
        new Response(JSON.stringify(analyzeResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(plagiarismResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );

    render(<App />);

    await userEvent.type(
      screen.getByPlaceholderText(/type or paste text here/i),
      "hello world world"
    );

    const analyzeBtn = screen.getByRole("button", { name: /Analyze text/i });
    expect(analyzeBtn).toBeEnabled();
    await userEvent.click(analyzeBtn);

    await waitFor(() => {
      expect(screen.getByText("hello")).toBeInTheDocument();
      expect(screen.getByText("world")).toBeInTheDocument();
      expect(screen.getByText(/Total tokens/i)).toBeInTheDocument();
      expect(screen.getByText("3")).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText(/Plagiarism — text/i)).toBeInTheDocument();
      expect(screen.getByText(/Score/i)).toBeInTheDocument();
      expect(screen.getByText(/http:\/\/example\.com\/source/i)).toBeInTheDocument();
    });

    expect(fetchSpy).toHaveBeenCalledTimes(2);

    {
      const call0 = fetchSpy.mock.calls[0];
      const url0 = call0[0] as string;
      const opts0 = call0[1] as RequestInit;
      expect(url0).toMatch(/\/text\/analyze$/);
      expect(opts0.method).toBe("POST");
      const headers0 = opts0.headers as Record<string, unknown> | undefined;
      expect(headers0?.["Content-Type"]).toBe("application/json");
      const body0 = opts0.body as string;
      const parsed0 = JSON.parse(body0) as Record<string, unknown>;
      expect(parsed0.text).toBe("hello world world");
      expect(parsed0).not.toHaveProperty("k");
    }

    {
      const call1 = fetchSpy.mock.calls[1];
      const url1 = call1[0] as string;
      const opts1 = call1[1] as RequestInit;
      expect(url1).toMatch(/\/plagiarism\/detect$/);
      expect(opts1.method).toBe("POST");
      const body1 = opts1.body as string;
      const parsed1 = JSON.parse(body1) as Record<string, unknown>;
      expect(parsed1.text).toBe("hello world world");
      expect(parsed1.shingleSize).toBe(5);
      expect(parsed1.sampleStep).toBe(2);
    }
  });

  test("if text analysis returns 500 → shows error alert", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    fetchSpy.mockResolvedValueOnce(
      new Response("Server exploded", {
        status: 500,
        headers: { "Content-Type": "text/plain" },
      })
    );

    render(<App />);

    await userEvent.type(
      screen.getByPlaceholderText(/type or paste text here/i),
      "boom"
    );

    await userEvent.click(screen.getByRole("button", { name: /Analyze text/i }));

    await waitFor(() => {
      expect(
        screen.getByText((txt) => /API:\s*API\s+500:\s*Server exploded/i.test(txt))
      ).toBeInTheDocument();
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  test("single file analysis: upload → Analyze file → shows results and plagiarism for demo.txt", async () => {
    const demoFile = new File(["text content"], "demo.txt", { type: "text/plain" });

    const analyzeFileResponse = {
      total: 2,
      counts: { text: 1, content: 1 },
      frequencies: { text: 0.5, content: 0.5 },
    };

    const plagiarismFileResponse = {
      score: 0.25,
      potentialSources: [
        {
          matchedShingles: ["text content"],
          url: "http://src.local/demo",
        },
      ],
    };

    const fetchSpy = vi.spyOn(globalThis, "fetch");
    fetchSpy
      .mockResolvedValueOnce(
        new Response(JSON.stringify(analyzeFileResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(plagiarismFileResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );

    render(<App />);

    const dropLabel = screen.getByText(/drop files here or click to choose/i).closest("label");
    if (!dropLabel) {
      throw new Error("file input label not found");
    }

    const fileInput = dropLabel.querySelector('input[type="file"]') as HTMLInputElement;
    if (!fileInput) {
      throw new Error("file input not found");
    }

    await userEvent.upload(fileInput, demoFile);

    const analyzeFilesBtn = await screen.findByRole("button", { name: /Analyze file/i });
    await userEvent.click(analyzeFilesBtn);

    await waitFor(() => {
      expect(screen.getByText(/Results — demo\.txt/i)).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText(/Plagiarism — demo\.txt/i)).toBeInTheDocument();
    });

    expect(screen.getByText("text")).toBeInTheDocument();
    expect(screen.getByText("content")).toBeInTheDocument();
    expect(screen.getByText(/Total tokens/i)).toBeInTheDocument();
    expect(screen.getByText(/Score/i)).toBeInTheDocument();
    expect(screen.getByText(/http:\/\/src\.local\/demo/i)).toBeInTheDocument();

    expect(fetchSpy).toHaveBeenCalledTimes(2);

    {
      const call0 = fetchSpy.mock.calls[0];
      const url0 = call0[0] as string;
      const opts0 = call0[1] as RequestInit;
      expect(url0).toMatch(/\/file\/analyze$/);
      expect(opts0.method).toBe("POST");
      expect(opts0.body instanceof FormData).toBe(true);
    }

    {
      const call1 = fetchSpy.mock.calls[1];
      const url1 = call1[0] as string;
      const opts1 = call1[1] as RequestInit;
      expect(url1).toMatch(/\/plagiarism\/detect\/file$/);
      expect(opts1.method).toBe("POST");
      expect(opts1.body instanceof FormData).toBe(true);
    }
  });

  test("if file analysis returns 400 → shows error alert", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    fetchSpy.mockResolvedValueOnce(
      new Response("Bad request", {
        status: 400,
        headers: { "Content-Type": "text/plain" },
      })
    );

    render(<App />);

    const dropLabel = screen.getByText(/drop files here or click to choose/i).closest("label");
    if (!dropLabel) {
      throw new Error("file input label not found");
    }

    const fileInput = dropLabel.querySelector('input[type="file"]') as HTMLInputElement;
    if (!fileInput) {
      throw new Error("file input not found");
    }

    const dummyFile = new File(["x"], "x.txt", { type: "text/plain" });
    await userEvent.upload(fileInput, dummyFile);

    const analyzeFilesBtn = await screen.findByRole("button", { name: /Analyze file/i });
    await userEvent.click(analyzeFilesBtn);

    await waitFor(() => {
      expect(
        screen.getByText((txt) => /API:\s*API\s+400:\s*Bad request/i.test(txt))
      ).toBeInTheDocument();
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
