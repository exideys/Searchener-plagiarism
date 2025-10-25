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

function mockFetchOnce(body: unknown, init?: { status?: number }) {
  const status = init?.status ?? 200;
  const res = new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
  vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(res);
  return (globalThis.fetch as unknown) as vi.Mock;
}

function mockFetchErrorOnce(status: number, text: string) {
  const res = new Response(text, {
    status,
    headers: { "Content-Type": "text/plain" },
  });
  vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(res);
  return (globalThis.fetch as unknown) as vi.Mock;
}


test("renders main UI blocks and controls", () => {
  render(<App />);


  expect(screen.getByText(/Text Analysis/i)).toBeInTheDocument();

  expect(screen.getByText(/Paste text to analyze/i)).toBeInTheDocument();

  expect(screen.getByText(/Analyze files \(words\)/i)).toBeInTheDocument();

  expect(screen.getByText(/Mode/i)).toBeInTheDocument();
  expect(screen.getByDisplayValue(/words/i)).toBeInTheDocument();

  expect(screen.queryByText(/Step k/i)).not.toBeInTheDocument();
});

test("analyzes text in WORDS mode and shows frequency table", async () => {
  const payload = {
    total: 3,
    counts: { hello: 1, world: 2 },
    frequencies: { hello: 1 / 3, world: 2 / 3 },
  };

  mockFetchOnce(payload);

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

    expect(screen.getByText(/Total words/i)).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });


  expect(screen.queryByText(/Shingles Result/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/Total shingles/i)).not.toBeInTheDocument();
});

test("analyzes text in SHINGLES mode with given k and shows shingles table", async () => {
  const shinglesPayload = {
    shingles: ["hello world", "world test", "test lol"],
  };

  const fetchSpy = mockFetchOnce(shinglesPayload);

  render(<App />);

  await userEvent.type(
    screen.getByPlaceholderText(/type or paste text here/i),
    "hello world test lol"
  );

  const modeSelect = screen.getByDisplayValue(/words/i);
  await userEvent.selectOptions(modeSelect, "shingles");

  const kInput = screen.getByLabelText(/Step k/i);
  await userEvent.clear(kInput);
  await userEvent.type(kInput, "4");

  await userEvent.click(
    screen.getByRole("button", { name: /analyze text/i })
  );

  await waitFor(() => {
    expect(screen.getByText(/Shingles Result/i)).toBeInTheDocument();
    expect(screen.getByText(/Total shingles/i)).toBeInTheDocument();

    expect(screen.getByText("hello world")).toBeInTheDocument();
  });

  expect(screen.queryByText(/Total words/i)).not.toBeInTheDocument();

  expect(fetchSpy).toHaveBeenCalledTimes(1);
  const [urlArg, optsArg] = (fetchSpy as vi.Mock).mock.calls[0];

  expect(urlArg).toMatch(/\/text\/shingles$/);

  const sentBody = JSON.parse((optsArg as RequestInit).body as string);
  expect(sentBody).toMatchObject({
    text: "hello world test lol",
    k: 4,
  });

  expect((optsArg as RequestInit).headers).toMatchObject({
    "Content-Type": "application/json",
  });
});

test("shows API error for text analyze (any mode)", async () => {
  mockFetchErrorOnce(500, "Server error");

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
      screen.getByText((t) =>
        /API:\s*API\s+500:\s*Server error/i.test(t)
      )
    ).toBeInTheDocument();
  });
});

test("uploads one file and shows its results tab + table", async () => {
  const file = new File(["text content"], "demo.txt", {
    type: "text/plain",
  });

  const payload = [
    {
      fileName: "demo.txt",
      total: 2,
      counts: { text: 1, content: 1 },
      frequencies: { text: 0.5, content: 0.5 },
    },
  ];

  mockFetchOnce(payload);

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

    expect(screen.getByText(/Results/i)).toBeInTheDocument();
    expect(screen.getByText("text")).toBeInTheDocument();
    expect(screen.getByText("content")).toBeInTheDocument();
  });
});

test("uploads two files, switches tabs, sees different titles", async () => {
  const f1 = new File(["a a"], "a.txt", { type: "text/plain" });
  const f2 = new File(["b b b"], "b.txt", { type: "text/plain" });

  const payload = [
    {
      fileName: "a.txt",
      total: 2,
      counts: { a: 2 },
      frequencies: { a: 1 },
    },
    {
      fileName: "b.txt",
      total: 3,
      counts: { b: 3 },
      frequencies: { b: 1 },
    },
  ];

  mockFetchOnce(payload);

  render(<App />);

  const label = screen
    .getByText(/drop files here or click to choose/i)
    .closest("label")!;
  const input = label.querySelector(
    'input[type="file"]'
  ) as HTMLInputElement;

  await userEvent.upload(input, [f1, f2]);

  const btn = await screen.findByRole("button", {
    name: /analyze files/i,
  });
  await userEvent.click(btn);

  await waitFor(() => {
    expect(
      screen.getByRole("button", { name: /a\.txt/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /b\.txt/i })
    ).toBeInTheDocument();

    // по умолчанию активен первый файл
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
});

test("table sorting: clicking Word header toggles order asc/desc", async () => {
  const payload = {
    total: 3,
    counts: { b: 1, a: 2 },
    frequencies: { b: 1 / 3, a: 2 / 3 },
  };

  mockFetchOnce(payload);

  render(<App />);

  // ввод
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

  await userEvent.click(screen.getByRole("button", { name: /^Word/ }));
  rows = getRows();
  cells0 = within(rows[0]).getAllByRole("cell");
  cells1 = within(rows[1]).getAllByRole("cell");

  expect(cells0[0]).toHaveTextContent(/^b$/i);
  expect(cells1[0]).toHaveTextContent(/^a$/i);

  await userEvent.click(screen.getByRole("button", { name: /^Word/ }));
  rows = getRows();
  cells0 = within(rows[0]).getAllByRole("cell");
  cells1 = within(rows[1]).getAllByRole("cell");

  expect(cells0[0]).toHaveTextContent(/^a$/i);
  expect(cells1[0]).toHaveTextContent(/^b$/i);
});

test("shows error if files API responds with error", async () => {
  mockFetchErrorOnce(400, "Bad request");

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
});
