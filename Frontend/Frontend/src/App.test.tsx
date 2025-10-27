import { test, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";

beforeEach(() => {
  Object.defineProperty(import.meta, "env", {
    value: { VITE_API_URL: "http://localhost:8081" },
    configurable: true,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

test("renders main UI blocks and controls", () => {
  render(<App />);

  expect(screen.getByText(/Text Analysis/i)).toBeInTheDocument();
  expect(screen.getByText(/Paste text to analyze/i)).toBeInTheDocument();
  expect(screen.getByText(/Analyze files \(words\)/i)).toBeInTheDocument();

  expect(screen.getByText(/Mode/i)).toBeInTheDocument();
  expect(screen.getAllByDisplayValue(/words/i)[0]).toBeInTheDocument();

  expect(screen.queryByText(/Step k/i)).not.toBeInTheDocument();
});

test("analyzes text in WORDS mode and shows frequency table + plagiarism table", async () => {
  const analyzePayload = {
    total: 3,
    counts: { hello: 1, world: 2 },
    frequencies: { hello: 1 / 3, world: 2 / 3 },
  };

  const plagiarismPayload = {
    score: 0.42,
    potentialSources: [
      {
        matchedShingles: ["hello world", "world world"],
        url: "http://example.com/src1",
      },
    ],
  };

  const spy = vi.spyOn(globalThis, "fetch");
  spy
    .mockResolvedValueOnce(
      new Response(JSON.stringify(analyzePayload), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    )
    .mockResolvedValueOnce(
      new Response(JSON.stringify(plagiarismPayload), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

  render(<App />);

  await userEvent.type(
    screen.getByPlaceholderText(/type or paste text here/i),
    "hello world world"
  );

  await userEvent.click(
    screen.getByRole("button", { name: /analyze text/i })
  );

  await waitFor(() => {
    expect(screen.getByText("hello")).toBeInTheDocument();
    expect(screen.getByText("world")).toBeInTheDocument();
    expect(screen.getByText(/Total tokens/i)).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  await waitFor(() => {
    expect(screen.getByText(/Plagiarism — text/i)).toBeInTheDocument();
    expect(screen.getByText(/Sources/i)).toBeInTheDocument();
    expect(screen.getByText(/Score/i)).toBeInTheDocument();
    expect(
      screen.getByText(/http:\/\/example\.com\/src1/i)
    ).toBeInTheDocument();
  });

  expect(spy).toHaveBeenCalledTimes(2);

  const [urlAnalyze, optsAnalyze] = spy.mock.calls[0] as [
    string,
    RequestInit
  ];
  expect(urlAnalyze).toMatch(/\/text\/analyze$/);
  expect((optsAnalyze.headers as any)["Content-Type"]).toBe(
    "application/json"
  );
  const sentBodyAnalyze = JSON.parse(optsAnalyze.body as string);
  expect(sentBodyAnalyze).toMatchObject({
    text: "hello world world",
  });

  const [urlPlag, optsPlag] = spy.mock.calls[1] as [string, RequestInit];
  expect(urlPlag).toMatch(/\/plagiarism\/detect$/);
  const sentBodyPlag = JSON.parse(optsPlag.body as string);
  expect(sentBodyPlag).toMatchObject({
    text: "hello world world",
    shingleSize: 5,
    sampleStep: 2,
  });
});

test("analyzes text in SHINGLES mode with given k and sends correct body", async () => {
  const analyzePayload = {
    total: 4,
    counts: {
      "hello world test lol": 1,
      "world test lol X": 1,
    },
    frequencies: {
      "hello world test lol": 0.5,
      "world test lol X": 0.5,
    },
  };

  const plagiarismPayload = {
    score: 0.9,
    potentialSources: [
      {
        matchedShingles: ["hello world test lol"],
        url: "http://copycat.net/a",
      },
    ],
  };

  const spy = vi.spyOn(globalThis, "fetch");
  spy
    .mockResolvedValueOnce(
      new Response(JSON.stringify(analyzePayload), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    )
    .mockResolvedValueOnce(
      new Response(JSON.stringify(plagiarismPayload), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

  render(<App />);

  await userEvent.type(
    screen.getByPlaceholderText(/type or paste text here/i),
    "hello world test lol"
  );

  const selects = screen.getAllByDisplayValue(/words/i);
  const textModeSelect = selects[0];
  await userEvent.selectOptions(textModeSelect, "shingles");

  const kInput = screen.getByLabelText(/Step k/i);
  await userEvent.clear(kInput);
  await userEvent.type(kInput, "4");

  await userEvent.click(
    screen.getByRole("button", { name: /analyze text/i })
  );

  await waitFor(() => {
    expect(screen.getByText(/Results/i)).toBeInTheDocument();
    expect(screen.getByText(/Total tokens/i)).toBeInTheDocument();
    expect(
      screen.getByText(/hello world test lol/i)
    ).toBeInTheDocument();
  });

  expect(spy).toHaveBeenCalledTimes(2);

  const [urlAnalyze, optsAnalyze] = spy.mock.calls[0] as [
    string,
    RequestInit
  ];

  expect(urlAnalyze).toMatch(/\/text\/shingles$/);

  const sentBody = JSON.parse(optsAnalyze.body as string);
  expect(sentBody).toMatchObject({
    text: "hello world test lol",
    k: 4,
  });

  expect(optsAnalyze.headers as any).toMatchObject({
    "Content-Type": "application/json",
  });

  const [urlPlag, optsPlag] = spy.mock.calls[1] as [string, RequestInit];
  expect(urlPlag).toMatch(/\/plagiarism\/detect$/);
  const sentBodyPlag = JSON.parse(optsPlag.body as string);
  expect(sentBodyPlag).toMatchObject({
    text: "hello world test lol",
    shingleSize: 5,
    sampleStep: 2,
  });
});

test("shows API error for text analyze (any mode)", async () => {
  const spy = vi.spyOn(globalThis, "fetch");
  spy.mockResolvedValueOnce(
    new Response("Server error", {
      status: 500,
      headers: { "Content-Type": "text/plain" },
    })
  );

  render(<App />);

  await userEvent.type(
    screen.getByPlaceholderText(/type or paste text here/i),
    "boom"
  );

  await userEvent.click(
    screen.getByRole("button", { name: /analyze text/i })
  );

  await waitFor(() => {
    expect(
      screen.getByText((t) => /API:\s*API\s+500:\s*Server error/i.test(t))
    ).toBeInTheDocument();
  });

  expect(spy).toHaveBeenCalledTimes(1);
});

test("uploads one file and shows its results tab + plagiarism table", async () => {
  const file = new File(["text content"], "demo.txt", {
    type: "text/plain",
  });

  const analyzePayload_demo = {
    total: 2,
    counts: { text: 1, content: 1 },
    frequencies: { text: 0.5, content: 0.5 },
  };

  const plagiarismPayload_demo = {
    score: 0.11,
    potentialSources: [
      {
        matchedShingles: ["text content"],
        url: "http://src.local/demo",
      },
    ],
  };

  const spy = vi.spyOn(globalThis, "fetch");
  spy
    .mockResolvedValueOnce(
      new Response(JSON.stringify(analyzePayload_demo), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    )
    .mockResolvedValueOnce(
      new Response(JSON.stringify(plagiarismPayload_demo), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

  render(<App />);

  const label = screen
    .getByText(/drop files here or click to choose/i)
    .closest("label")!;
  const input = label.querySelector(
    'input[type="file"]'
  ) as HTMLInputElement;

  await userEvent.upload(input, file);

  const analyzeBtn = await screen.findByRole("button", {
    name: /analyze file/i,
  });
  await userEvent.click(analyzeBtn);

  await waitFor(() => {
    expect(
      screen.getByRole("button", { name: /demo\.txt/i })
    ).toBeInTheDocument();

    expect(
      screen.getByText(/Results — demo\.txt/i)
    ).toBeInTheDocument();

    expect(screen.getByText("text")).toBeInTheDocument();
    expect(screen.getByText("content")).toBeInTheDocument();

    expect(
      screen.getByText(/Plagiarism — demo\.txt/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Score/i)).toBeInTheDocument();
    expect(
      screen.getByText(/http:\/\/src\.local\/demo/i)
    ).toBeInTheDocument();
  });

  expect(spy).toHaveBeenCalledTimes(2);

  const [urlAnalyze, optsAnalyze] = spy.mock.calls[0] as [
    string,
    RequestInit
  ];
  expect(urlAnalyze).toMatch(/\/file\/analyze$/);
  expect(optsAnalyze.method).toBe("POST");
  expect(optsAnalyze.body instanceof FormData).toBe(true);

  const [urlPlag, optsPlag] = spy.mock.calls[1] as [
    string,
    RequestInit
  ];
  expect(urlPlag).toMatch(/\/plagiarism\/detect\/file$/);
  expect(optsPlag.method).toBe("POST");
  expect(optsPlag.body instanceof FormData).toBe(true);
});

test("uploads two files, switches tabs, sees different titles", async () => {
  const f1 = new File(["a a"], "a.txt", { type: "text/plain" });
  const f2 = new File(["b b b"], "b.txt", { type: "text/plain" });

  const analyzePayload_a = {
    total: 2,
    counts: { a: 2 },
    frequencies: { a: 1 },
  };

  const analyzePayload_b = {
    total: 3,
    counts: { b: 3 },
    frequencies: { b: 1 },
  };

  const plagiarismPayload_a = {
    score: 0.2,
    potentialSources: [
      {
        matchedShingles: ["a a"],
        url: "http://src.local/a",
      },
    ],
  };

  const plagiarismPayload_b = {
    score: 0.9,
    potentialSources: [
      {
        matchedShingles: ["b b b"],
        url: "http://src.local/b",
      },
    ],
  };

  const spy = vi.spyOn(globalThis, "fetch");
  spy
    .mockResolvedValueOnce(
      new Response(JSON.stringify(analyzePayload_a), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    )
    .mockResolvedValueOnce(
      new Response(JSON.stringify(analyzePayload_b), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    )
    .mockResolvedValueOnce(
      new Response(JSON.stringify(plagiarismPayload_a), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    )
    .mockResolvedValueOnce(
      new Response(JSON.stringify(plagiarismPayload_b), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

  render(<App />);

  const label = screen
    .getByText(/drop files here or click to choose/i)
    .closest("label")!;
  const input = label.querySelector(
    'input[type="file"]'
  ) as HTMLInputElement;

  await userEvent.upload(input, [f1, f2]);

  const btn = await screen.findByRole("button", {
    name: /analyze files?/i,
  });
  await userEvent.click(btn);

  await waitFor(() => {
    expect(
      screen.getByRole("button", { name: /a\.txt/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /b\.txt/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Results — a\.txt/i)
    ).toBeInTheDocument();
  });

  await userEvent.click(
    screen.getByRole("button", { name: /b\.txt/i })
  );

  await waitFor(() => {
    expect(
      screen.getByText(/Results — b\.txt/i)
    ).toBeInTheDocument();
    expect(screen.getByText("b")).toBeInTheDocument();
  });

  expect(spy).toHaveBeenCalledTimes(4);
});

test("table sorting: clicking 'Token / Shingle' header toggles order asc/desc", async () => {
  const analyzePayload = {
    total: 3,
    counts: { b: 1, a: 2 },
    frequencies: { b: 1 / 3, a: 2 / 3 },
  };

  const plagiarismPayload = {
    score: 0.5,
    potentialSources: [],
  };

  const spy = vi.spyOn(globalThis, "fetch");
  spy
    .mockResolvedValueOnce(
      new Response(JSON.stringify(analyzePayload), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    )
    .mockResolvedValueOnce(
      new Response(JSON.stringify(plagiarismPayload), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

  render(<App />);

  await userEvent.type(
    screen.getByPlaceholderText(/type or paste text here/i),
    "a a b"
  );

  await userEvent.click(
    screen.getByRole("button", { name: /analyze text/i })
  );

  await screen.findByText("a");

  const getRows = () =>
    screen
      .getAllByRole("row")
      .filter((r) => within(r).queryAllByRole("cell").length > 0);

  let rows = getRows();
  let cells0 = within(rows[0]).getAllByRole("cell");
  let cells1 = within(rows[1]).getAllByRole("cell");

  expect(cells0[0]).toHaveTextContent(/^a$/i);
  expect(cells0[1]).toHaveTextContent(/^2$/);
  expect(cells1[0]).toHaveTextContent(/^b$/i);
  expect(cells1[1]).toHaveTextContent(/^1$/);

  await userEvent.click(
    screen.getByRole("button", { name: /^Token \/ Shingle/ })
  );

  rows = getRows();
  cells0 = within(rows[0]).getAllByRole("cell");
  cells1 = within(rows[1]).getAllByRole("cell");

  expect(cells0[0]).toHaveTextContent(/^b$/i);
  expect(cells1[0]).toHaveTextContent(/^a$/i);

  await userEvent.click(
    screen.getByRole("button", { name: /^Token \/ Shingle/ })
  );

  rows = getRows();
  cells0 = within(rows[0]).getAllByRole("cell");
  cells1 = within(rows[1]).getAllByRole("cell");

  expect(cells0[0]).toHaveTextContent(/^a$/i);
  expect(cells1[0]).toHaveTextContent(/^b$/i);

  expect(spy).toHaveBeenCalledTimes(2);
});

test("shows error if files API responds with error", async () => {
  const spy = vi.spyOn(globalThis, "fetch");
  spy.mockResolvedValueOnce(
    new Response("Bad request", {
      status: 400,
      headers: { "Content-Type": "text/plain" },
    })
  );

  render(<App />);

  const label = screen
    .getByText(/drop files here or click to choose/i)
    .closest("label")!;
  const input = label.querySelector(
    'input[type="file"]'
  ) as HTMLInputElement;

  const file = new File(["x"], "x.txt", { type: "text/plain" });

  await userEvent.upload(input, file);

  const btn = await screen.findByRole("button", {
    name: /analyze file/i,
  });
  await userEvent.click(btn);

  await waitFor(() => {
    expect(
      screen.getByText((t) =>
        /API:\s*API\s+400:\s*Bad request/i.test(t)
      )
    ).toBeInTheDocument();
  });

  expect(spy).toHaveBeenCalledTimes(1);
});
