import { test, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";

type AnalyzeResponse = {
  total: number;
  counts: Record<string, number>;
  frequencies: Record<string, number>;
};

type ShinglesResponse = {
  shingles: string[];
};

type FileAnalyzeItem = AnalyzeResponse & { fileName?: string };

type PlagiarismResponse = {
  score: number;
  potentialSources: Array<{
    matchedShingles: string[];
    url: string;
  }>;
};

type FilePlagiarismItem = PlagiarismResponse & { fileName?: string };

// ================== env mock ==================

beforeEach(() => {
  Object.defineProperty(import.meta, "env", {
    value: { VITE_API_URL: "http://localhost:8081" },
    configurable: true,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ================== fetch helpers ==================

function mockFetchJsonOnce(
  body: unknown,
  init?: { status?: number }
): vi.Mock {
  const status = init?.status ?? 200;
  const res = new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
  const spy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(res);
  return spy;
}

function mockFetchTextErrorOnce(status: number, text: string): vi.Mock {
  const res = new Response(text, {
    status,
    headers: { "Content-Type": "text/plain" },
  });
  const spy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(res);
  return spy;
}

// ================== tests ==================

test("renders main UI blocks and controls", () => {
  render(<App />);

  // основные секции
  expect(
    screen.getByText(/Text Analysis: Unique Words/i)
  ).toBeInTheDocument();
  expect(
    screen.getByText(/Paste text to analyze/i)
  ).toBeInTheDocument();
  expect(screen.getByText(/Analyze files/i)).toBeInTheDocument();

  // режимы анализа текста
  expect(screen.getByLabelText(/Words mode/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/Shingles mode/i)).toBeInTheDocument();

  // инпуты параметров шинглов
  expect(
    screen.getByLabelText(/Shingle size/i)
  ).toBeInTheDocument();
  expect(
    screen.getByLabelText(/Sample step/i)
  ).toBeInTheDocument();

  // plagiarism блок
  expect(
    screen.getByText(/Plagiarism Check/i)
  ).toBeInTheDocument();
  expect(
    screen.getByText(/Check plagiarism for text/i)
  ).toBeInTheDocument();
  expect(
    screen.getByText(/Check plagiarism for file/i)
  ).toBeInTheDocument();
});

test("analyzes text in WORDS mode and shows frequency table", async () => {
  render(<App />);

  // Мокаем ответ /text/analyze
  mockFetchJsonOnce(<AnalyzeResponse>{
    total: 4,
    counts: { hello: 2, world: 1, test: 1 },
    frequencies: { hello: 0.5, world: 0.25, test: 0.25 },
  });

  // Ввод текста
  const ta = screen.getByPlaceholderText(/Paste text to analyze/i);
  await userEvent.clear(ta);
  await userEvent.type(ta, "hello hello world test");

  // Режим WORDS уже выбран по умолчанию (предполагаем), просто жмём Analyze
  const analyzeBtn = screen.getByRole("button", {
    name: /Analyze text/i,
  });
  await userEvent.click(analyzeBtn);

  // Ожидаем таблицу
  await waitFor(() => {
    expect(screen.getByText(/Total tokens/i)).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();

    expect(screen.getByRole("table")).toBeInTheDocument();

    // проверим строки таблицы через within
    const rows = screen.getAllByRole("row");
    const headerRow = rows[0];
    const dataRows = rows.slice(1);

    expect(
      within(headerRow).getByText(/Word/i)
    ).toBeInTheDocument();
    expect(
      within(headerRow).getByText(/Count/i)
    ).toBeInTheDocument();
    expect(
      within(headerRow).getByText(/Freq/i)
    ).toBeInTheDocument();

    // одна из строк должна содержать hello 2 50.0%
    const helloRow = dataRows.find((r) =>
      within(r).queryByText("hello")
    );
    expect(helloRow).toBeTruthy();
    if (helloRow) {
      expect(
        within(helloRow).getByText("2")
      ).toBeInTheDocument();
      expect(
        within(helloRow).getByText(/50\.0%/)
      ).toBeInTheDocument();
    }
  });
});

test("analyzes text in SHINGLES mode with given k and shows shingles table", async () => {
  render(<App />);

  // переключаем режим SHINGLES
  const shinglesRadio = screen.getByLabelText(/Shingles mode/i);
  await userEvent.click(shinglesRadio);

  // задаём параметры шинглов
  const sizeInput = screen.getByLabelText(/Shingle size/i);
  await userEvent.clear(sizeInput);
  await userEvent.type(sizeInput, "4");

  const stepInput = screen.getByLabelText(/Sample step/i);
  await userEvent.clear(stepInput);
  await userEvent.type(stepInput, "2");

  // мок эндпоинта /text/shingles
  mockFetchJsonOnce(<ShinglesResponse>{
    shingles: [
      "hello world test lol",
      "world test lol kek",
    ],
  });

  // ввод текста
  const ta = screen.getByPlaceholderText(/Paste text to analyze/i);
  await userEvent.clear(ta);
  await userEvent.type(
    ta,
    "hello world test lol kek"
  );

  // жмём Analyze
  const analyzeBtn = screen.getByRole("button", {
    name: /Analyze text/i,
  });
  await userEvent.click(analyzeBtn);

  // ждём рендера таблицы шинглов
  await waitFor(() => {
    expect(
      screen.getByText(/Generated shingles/i)
    ).toBeInTheDocument();

    // проверяем строки
    const table = screen.getByRole("table");
    expect(table).toBeInTheDocument();
    expect(
      within(table).getByText("hello world test lol")
    ).toBeInTheDocument();
  });
});

test("shows API error for text analyze (any mode)", async () => {
  render(<App />);

  // мок: вернём 500 и текст ошибки
  mockFetchTextErrorOnce(500, "Server exploded");

  const ta = screen.getByPlaceholderText(/Paste text to analyze/i);
  await userEvent.clear(ta);
  await userEvent.type(ta, "abc");

  const analyzeBtn = screen.getByRole("button", {
    name: /Analyze text/i,
  });
  await userEvent.click(analyzeBtn);

  // ждём появления ошибки
  await waitFor(() => {
    expect(
      screen.getByText(/Server exploded/i)
    ).toBeInTheDocument();
  });
});

test("uploads one file and shows its results tab + table", async () => {
  render(<App />);

  // мок /file/analyze ответ
  mockFetchJsonOnce([
    <FileAnalyzeItem>{
      fileName: "doc1.txt",
      total: 3,
      counts: { a: 2, b: 1 },
      frequencies: { a: 0.666, b: 0.333 },
    },
  ]);

  // находим инпут type="file"
  const fileInput = screen.getByLabelText(/Upload files/i);

  // создаём фейковый файл
  const file = new File(["a a b"], "doc1.txt", {
    type: "text/plain",
  });

  // грузим файл
  await userEvent.upload(fileInput, file);

  // ждём табки с файлом
  await waitFor(() => {
    // таб с именем файла
    expect(
      screen.getByRole("tab", { name: /doc1.txt/i })
    ).toBeInTheDocument();

    // таблица статистики по файлу
    expect(
      screen.getByText(/Total tokens/i)
    ).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });
});

test("uploads two files, switches tabs, sees per-file stats", async () => {
  render(<App />);

  // мок /file/analyze на загрузку двух файлов
  mockFetchJsonOnce([
    <FileAnalyzeItem>{
      fileName: "f1.txt",
      total: 2,
      counts: { hi: 2 },
      frequencies: { hi: 1 },
    },
    <FileAnalyzeItem>{
      fileName: "f2.txt",
      total: 4,
      counts: { yo: 3, sup: 1 },
      frequencies: { yo: 0.75, sup: 0.25 },
    },
  ]);

  const fileInput = screen.getByLabelText(/Upload files/i);

  const f1 = new File(["hi hi"], "f1.txt", {
    type: "text/plain",
  });
  const f2 = new File(["yo yo yo sup"], "f2.txt", {
    type: "text/plain",
  });

  await userEvent.upload(fileInput, [f1, f2]);

  // ждём две вкладки
  await waitFor(() => {
    expect(
      screen.getByRole("tab", { name: /f1.txt/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: /f2.txt/i })
    ).toBeInTheDocument();
  });

  // по умолчанию активна первая вкладка
  expect(screen.getByText("2")).toBeInTheDocument(); // total tokens f1

  // переключаемся на вторую
  const tab2 = screen.getByRole("tab", { name: /f2.txt/i });
  await userEvent.click(tab2);

  // теперь должны увидеть total tokens = 4
  await waitFor(() => {
    expect(screen.getByText("4")).toBeInTheDocument();
  });
});

test("checks plagiarism for text and renders score + sources", async () => {
  render(<App />);

  // мок /plagiarism/detect
  mockFetchJsonOnce(<PlagiarismResponse>{
    score: 0.42,
    potentialSources: [
      {
        matchedShingles: ["lorem ipsum dolor sit"],
        url: "https://example.com/a",
      },
      {
        matchedShingles: ["hello world test lol"],
        url: "https://example.com/b",
      },
    ],
  });

  // вводим тестовый текст
  const ta = screen.getByPlaceholderText(/Paste text to check plagiarism/i);
  await userEvent.clear(ta);
  await userEvent.type(
    ta,
    "lorem ipsum dolor sit amet hello world test lol"
  );

  // жмём "Check text plagiarism"
  const btn = screen.getByRole("button", {
    name: /Check text plagiarism/i,
  });
  await userEvent.click(btn);

  // ждём результата
  await waitFor(() => {
    // score
    expect(
      screen.getByText(/Plagiarism score/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/42%/)
    ).toBeInTheDocument();

    // источники
    expect(
      screen.getByText(/example\.com\/a/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/example\.com\/b/i)
    ).toBeInTheDocument();
  });
});

test("checks plagiarism for file and shows per-file plagiarism result", async () => {
  render(<App />);

  // мок /plagiarism/detect/file
  mockFetchJsonOnce([
    <FilePlagiarismItem>{
      fileName: "thesis.docx",
      score: 0.88,
      potentialSources: [
        {
          matchedShingles: ["very suspicious fragment"],
          url: "https://plagiat.example.edu/source1",
        },
      ],
    },
  ]);

  const fileInput = screen.getByLabelText(
    /Upload file to check plagiarism/i
  );

  const thesis = new File(
    ["very suspicious fragment"],
    "thesis.docx",
    { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }
  );

  await userEvent.upload(fileInput, thesis);

  // ждём плашку результатов
  await waitFor(() => {
    expect(
      screen.getByText(/thesis.docx/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/88%/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/plagiat\.example\.edu\/source1/i)
    ).toBeInTheDocument();
  });
});
