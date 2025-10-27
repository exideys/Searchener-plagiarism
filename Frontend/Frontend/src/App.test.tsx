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

// -------------------- env mock --------------------

beforeEach(() => {
  Object.defineProperty(import.meta, "env", {
    value: { VITE_API_URL: "http://localhost:8081" },
    configurable: true,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

// -------------------- helpers --------------------

function mockFetchJsonOnce(
  body: unknown,
  init?: { status?: number }
): vi.Mock {
  const status = init?.status ?? 200;
  const res = new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
  return vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(res);
}

function mockFetchTextErrorOnce(status: number, text: string): vi.Mock {
  const res = new Response(text, {
    status,
    headers: { "Content-Type": "text/plain" },
  });
  return vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(res);
}

// -------------------- smoke / layout --------------------

test("renders all main blocks from App layout", () => {
  render(<App />);

  // блок анализа текста
  expect(
    screen.getByText(/Text Analysis: Unique Words/i)
  ).toBeInTheDocument();
  expect(
    screen.getByText(/Paste text to analyze/i)
  ).toBeInTheDocument();

  // элементы режима WORDS / SHINGLES
  expect(
    screen.getByLabelText(/Words mode/i)
  ).toBeInTheDocument();
  expect(
    screen.getByLabelText(/Shingles mode/i)
  ).toBeInTheDocument();

  // поля параметров шинглов
  expect(
    screen.getByLabelText(/Shingle size/i)
  ).toBeInTheDocument();
  expect(
    screen.getByLabelText(/Sample step/i)
  ).toBeInTheDocument();

  // кнопка анализа текста
  expect(
    screen.getByRole("button", { name: /Analyze text/i })
  ).toBeInTheDocument();

  // блок анализа файлов
  expect(
    screen.getByText(/Analyze files/i)
  ).toBeInTheDocument();
  expect(
    screen.getByLabelText(/Upload files/i)
  ).toBeInTheDocument();

  // блок плагиата
  expect(
    screen.getByText(/Plagiarism Check/i)
  ).toBeInTheDocument();
  expect(
    screen.getByText(/Check plagiarism for text/i)
  ).toBeInTheDocument();
  expect(
    screen.getByText(/Check plagiarism for file/i)
  ).toBeInTheDocument();

  // кнопка проверки плагиата текста
  expect(
    screen.getByRole("button", {
      name: /Check text plagiarism/i,
    })
  ).toBeInTheDocument();

  // текстовая textarea для плагиата
  expect(
    screen.getByPlaceholderText(/Paste text to check plagiarism/i)
  ).toBeInTheDocument();
});

// -------------------- text analyze: WORDS --------------------

test("analyzes text in WORDS mode and shows word frequency table", async () => {
  render(<App />);

  // мок на /text/analyze
  mockFetchJsonOnce(<AnalyzeResponse>{
    total: 4,
    counts: { hello: 2, world: 1, test: 1 },
    frequencies: {
      hello: 0.5,
      world: 0.25,
      test: 0.25,
    },
  });

  // вводим текст в верхнюю textarea (та, где placeholder = Paste text to analyze)
  const taAnalyze = screen.getByPlaceholderText(
    /Paste text to analyze/i
  );
  await userEvent.clear(taAnalyze);
  await userEvent.type(
    taAnalyze,
    "hello hello world test"
  );

  // режим WORDS по умолчанию уже выбран (radio checked)
  // жмём Analyze text
  const runBtn = screen.getByRole("button", {
    name: /Analyze text/i,
  });
  await userEvent.click(runBtn);

  // ждём рендер таблицы
  await waitFor(() => {
    // заголовок Total tokens и значение
    expect(
      screen.getByText(/Total tokens/i)
    ).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();

    // находим таблицу слов
    const table = screen.getByRole("table");
    expect(table).toBeInTheDocument();

    // проверяем что есть строка для "hello"
    const rows = within(table).getAllByRole("row");
    const helloRow = rows.find((row) =>
      within(row).queryByText("hello")
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

// -------------------- text analyze: SHINGLES --------------------

test("analyzes text in SHINGLES mode with given k and step, shows shingles table", async () => {
  render(<App />);

  // переключаем radio на SHINGLES
  const shinglesRadio = screen.getByLabelText(/Shingles mode/i);
  await userEvent.click(shinglesRadio);

  // задаём Shingle size
  const sizeInput = screen.getByLabelText(/Shingle size/i);
  await userEvent.clear(sizeInput);
  await userEvent.type(sizeInput, "4");

  // задаём Sample step
  const stepInput = screen.getByLabelText(/Sample step/i);
  await userEvent.clear(stepInput);
  await userEvent.type(stepInput, "2");

  // мок на /text/shingles
  mockFetchJsonOnce(<ShinglesResponse>{
    shingles: [
      "hello world test lol",
      "world test lol kek",
    ],
  });

  // вводим текст
  const taAnalyze = screen.getByPlaceholderText(
    /Paste text to analyze/i
  );
  await userEvent.clear(taAnalyze);
  await userEvent.type(
    taAnalyze,
    "hello world test lol kek"
  );

  // нажимаем Analyze text
  const runBtn = screen.getByRole("button", {
    name: /Analyze text/i,
  });
  await userEvent.click(runBtn);

  // проверяем вывод
  await waitFor(() => {
    expect(
      screen.getByText(/Generated shingles/i)
    ).toBeInTheDocument();

    // таблица с шинглами
    const table = screen.getByRole("table");
    expect(table).toBeInTheDocument();

    expect(
      within(table).getByText("hello world test lol")
    ).toBeInTheDocument();
  });
});

// -------------------- text analyze error --------------------

test("shows API error from text analysis request", async () => {
  render(<App />);

  // мок с ошибкой
  mockFetchTextErrorOnce(500, "Server exploded");

  // ввод текста
  const taAnalyze = screen.getByPlaceholderText(
    /Paste text to analyze/i
  );
  await userEvent.clear(taAnalyze);
  await userEvent.type(taAnalyze, "abc");

  // клик по Analyze text
  const runBtn = screen.getByRole("button", {
    name: /Analyze text/i,
  });
  await userEvent.click(runBtn);

  // ждём текст ошибки
  await waitFor(() => {
    expect(
      screen.getByText(/Server exploded/i)
    ).toBeInTheDocument();
  });
});

// -------------------- file analyze upload --------------------

test("uploads one file and shows its stats", async () => {
  render(<App />);

  // мок для /file/analyze
  mockFetchJsonOnce([
    <FileAnalyzeItem>{
      fileName: "doc1.txt",
      total: 3,
      counts: { a: 2, b: 1 },
      frequencies: { a: 0.666, b: 0.333 },
    },
  ]);

  // берём настоящий <input aria-label="Upload files">
  const fileInput = screen.getByLabelText(/Upload files/i);

  // создаём фейковый файл
  const file = new File(["a a b"], "doc1.txt", {
    type: "text/plain",
  });

  // загружаем
  await userEvent.upload(fileInput, file);

  // ждём таб и таблицу токенов для файла
  await waitFor(() => {
    // должна появиться вкладка c именем файла
    expect(
      screen.getByRole("tab", { name: /doc1.txt/i })
    ).toBeInTheDocument();

    // метрика total tokens
    expect(
      screen.getByText(/Total tokens/i)
    ).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });
});

test("uploads two files, can switch tabs, renders per-file stats", async () => {
  render(<App />);

  // мок для /file/analyze
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

  // обе вкладки должны появиться
  await waitFor(() => {
    expect(
      screen.getByRole("tab", { name: /f1.txt/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: /f2.txt/i })
    ).toBeInTheDocument();
  });

  // по умолчанию активна первая вкладка -> total tokens = 2 видно
  expect(screen.getByText("2")).toBeInTheDocument();

  // переключаемся на вторую вкладку
  const tab2 = screen.getByRole("tab", { name: /f2.txt/i });
  await userEvent.click(tab2);

  // теперь должны увидеть total tokens = 4
  await waitFor(() => {
    expect(screen.getByText("4")).toBeInTheDocument();
  });
});

test("shows error if file analyze request fails", async () => {
  render(<App />);

  // мок ошибки для /file/analyze
  mockFetchTextErrorOnce(500, "Broken upload");

  const fileInput = screen.getByLabelText(/Upload files/i);

  const file = new File(["xxx"], "bad.txt", {
    type: "text/plain",
  });

  await userEvent.upload(fileInput, file);

  await waitFor(() => {
    expect(
      screen.getByText(/Broken upload/i)
    ).toBeInTheDocument();
  });
});

// -------------------- plagiarism text --------------------

test("checks plagiarism for text and renders score + sources", async () => {
  render(<App />);

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

  // вводим текст в textarea с плейсхолдером "Paste text to check plagiarism"
  const taPlag = screen.getByPlaceholderText(
    /Paste text to check plagiarism/i
  );
  await userEvent.clear(taPlag);
  await userEvent.type(
    taPlag,
    "lorem ipsum dolor sit amet hello world test lol"
  );

  // жмём кнопку "Check text plagiarism"
  const btn = screen.getByRole("button", {
    name: /Check text plagiarism/i,
  });
  await userEvent.click(btn);

  // проверяем вывод
  await waitFor(() => {
    expect(
      screen.getByText(/Plagiarism score/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/42%/)
    ).toBeInTheDocument();

    // ссылки-источники
    expect(
      screen.getByText(/example\.com\/a/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/example\.com\/b/i)
    ).toBeInTheDocument();
  });
});

test("shows plagiarism error for text if request fails", async () => {
  render(<App />);

  mockFetchTextErrorOnce(500, "plag service down");

  const taPlag = screen.getByPlaceholderText(
    /Paste text to check plagiarism/i
  );
  await userEvent.clear(taPlag);
  await userEvent.type(taPlag, "blah blah blah");

  const btn = screen.getByRole("button", {
    name: /Check text plagiarism/i,
  });
  await userEvent.click(btn);

  await waitFor(() => {
    expect(
      screen.getByText(/plag service down/i)
    ).toBeInTheDocument();
  });
});

// -------------------- plagiarism file --------------------

test("checks plagiarism for file and shows per-file result", async () => {
  render(<App />);

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

  const plagFileInput = screen.getByLabelText(
    /Upload file to check plagiarism/i
  );

  const thesis = new File(
    ["very suspicious fragment"],
    "thesis.docx",
    {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    }
  );

  await userEvent.upload(plagFileInput, thesis);

  await waitFor(() => {
    expect(
      screen.getByText(/thesis\.docx/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/88%/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/plagiat\.example\.edu\/source1/i)
    ).toBeInTheDocument();
  });
});

test("shows plagiarism file error if request fails", async () => {
  render(<App />);

  mockFetchTextErrorOnce(500, "file plagiarism failed");

  const plagFileInput = screen.getByLabelText(
    /Upload file to check plagiarism/i
  );
  const thesis = new File(["text"], "oops.txt", {
    type: "text/plain",
  });

  await userEvent.upload(plagFileInput, thesis);

  await waitFor(() => {
    expect(
      screen.getByText(/file plagiarism failed/i)
    ).toBeInTheDocument();
  });
});
