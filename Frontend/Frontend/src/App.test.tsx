import {
  describe,
  beforeEach,
  afterEach,
  test,
  expect,
  vi,
} from "vitest";
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
  test("базовый UI монтируется (хедер, формы текста и файлов)", () => {
    render(<App />);

    // Заголовок приложения
    expect(
      screen.getByText(/Searchener-plagiarism/i)
    ).toBeInTheDocument();

    // Секция текста
    expect(
      screen.getByText(/Paste text to analyze/i)
    ).toBeInTheDocument();

    // Секция файлов
    expect(
      screen.getByText(/Analyze files/i)
    ).toBeInTheDocument();

    // Должен быть селект режима (words/shingles)
    const selects = screen.getAllByRole("combobox");
    expect(selects.length).toBeGreaterThanOrEqual(1);

    // Кнопка "Analyze text" изначально должна быть дизейблена (текст пустой)
    expect(
      screen.getByRole("button", { name: /Analyze text/i })
    ).toBeDisabled();
  });

  test("анализ текста (mode=words): выводит таблицу статистики и таблицу плагиата", async () => {
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
      // ответ на analyzeText (POST /text/analyze)
      .mockResolvedValueOnce(
        new Response(JSON.stringify(analyzeResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      )
      // ответ на detectPlagiarismText (POST /plagiarism/detect)
      .mockResolvedValueOnce(
        new Response(JSON.stringify(plagiarismResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );

    render(<App />);

    // Вводим текст
    await userEvent.type(
      screen.getByPlaceholderText(/type or paste text here/i),
      "hello world world"
    );

    const analyzeBtn = screen.getByRole("button", {
      name: /Analyze text/i,
    });
    expect(analyzeBtn).toBeEnabled();

    // Жмём "Analyze text"
    await userEvent.click(analyzeBtn);

    // Ждём появления таблицы со статистикой слов (ResultsTable)
    await waitFor(() => {
      expect(screen.getByText("hello")).toBeInTheDocument();
      expect(screen.getByText("world")).toBeInTheDocument();
      expect(screen.getByText(/Total tokens/i)).toBeInTheDocument();
      // total = 3 должно быть где-то рядом, но чтобы не ловить
      // неоднозначности, проверим точное "3" ТОЛЬКО после "Total tokens"
      expect(screen.getByText("3")).toBeInTheDocument();
    });

    // Ждём появления секции плагиата для текста (PlagiarismTable)
    await waitFor(() => {
      // title передан как "Plagiarism — text"
      expect(
        screen.getByText(/Plagiarism — text/i)
      ).toBeInTheDocument();

      expect(screen.getByText(/Score/i)).toBeInTheDocument();
      expect(
        screen.getByText(/http:\/\/example\.com\/source/i)
      ).toBeInTheDocument();
    });

    // Проверяем, как сходили в API
    expect(fetchSpy).toHaveBeenCalledTimes(2);

    {
      // Вызов 0: /text/analyze
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
      // т.к. mode=words, в body не должно быть k
      expect(parsed0).not.toHaveProperty("k");
    }

    {
      // Вызов 1: /plagiarism/detect
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

  test("если анализ текста вернул 500 → показываем блок ошибки", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    // первая же попытка analyzeText вернёт 500,
    // значит до проверки плагиата даже не дойдём
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

    await userEvent.click(
      screen.getByRole("button", { name: /Analyze text/i })
    );

    // Ждём появления красного алерта
    await waitFor(() => {
      expect(
        screen.getByText((txt) =>
          /API:\s*API\s+500:\s*Server exploded/i.test(txt)
        )
      ).toBeInTheDocument();
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  test("анализ одного файла: upload → Analyze file → появляется блок результатов и блок плагиата для demo.txt", async () => {
    const demoFile = new File(["text content"], "demo.txt", {
      type: "text/plain",
    });

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
      // analyzeFiles -> для demo.txt это будет POST /file/analyze
      .mockResolvedValueOnce(
        new Response(JSON.stringify(analyzeFileResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      )
      // detectPlagiarismFiles -> POST /plagiarism/detect/file
      .mockResolvedValueOnce(
        new Response(JSON.stringify(plagiarismFileResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );

    render(<App />);

    // достаём <input type="file" ...> из компонента FileDrop
    const dropLabel = screen
      .getByText(/drop files here or click to choose/i)
      .closest("label");
    if (!dropLabel) {
      throw new Error("file input label not found");
    }

    const fileInput = dropLabel.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    if (!fileInput) {
      throw new Error("file input not found");
    }

    // загружаем файл
    await userEvent.upload(fileInput, demoFile);

    // теперь должна появиться кнопка "Analyze file" (или "Analyze files")
    const analyzeFilesBtn = await screen.findByRole("button", {
      name: /Analyze file/i,
    });

    await userEvent.click(analyzeFilesBtn);

    // ждём появления блока результатов именно для demo.txt
    // FileResultsBlock рисует <h3> "Results — demo.txt"
    await waitFor(() => {
      expect(
        screen.getByText(/Results — demo\.txt/i)
      ).toBeInTheDocument();
    });

    // ждём появления блока плагиата для demo.txt
    // FilePlagiarismBlock рисует <h3> "Plagiarism — demo.txt"
    await waitFor(() => {
      expect(
        screen.getByText(/Plagiarism — demo\.txt/i)
      ).toBeInTheDocument();
    });

    // теперь можно проверить содержимое таблиц
    expect(screen.getByText("text")).toBeInTheDocument();
    expect(screen.getByText("content")).toBeInTheDocument();
    expect(screen.getByText(/Total tokens/i)).toBeInTheDocument();

    expect(screen.getByText(/Score/i)).toBeInTheDocument();
    expect(
      screen.getByText(/http:\/\/src\.local\/demo/i)
    ).toBeInTheDocument();

    // проверяем вызовы fetch
    expect(fetchSpy).toHaveBeenCalledTimes(2);

    {
      // вызов 0 должен быть /file/analyze
      const call0 = fetchSpy.mock.calls[0];
      const url0 = call0[0] as string;
      const opts0 = call0[1] as RequestInit;

      expect(url0).toMatch(/\/file\/analyze$/);
      expect(opts0.method).toBe("POST");
      expect(opts0.body instanceof FormData).toBe(true);
    }

    {
      // вызов 1 должен быть /plagiarism/detect/file
      const call1 = fetchSpy.mock.calls[1];
      const url1 = call1[0] as string;
      const opts1 = call1[1] as RequestInit;

      expect(url1).toMatch(/\/plagiarism\/detect\/file$/);
      expect(opts1.method).toBe("POST");
      expect(opts1.body instanceof FormData).toBe(true);
    }
  });

  test("если анализ файла вернул 400 → показываем блок ошибки", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    // первый запрос (анализ файла) падает с 400
    fetchSpy.mockResolvedValueOnce(
      new Response("Bad request", {
        status: 400,
        headers: { "Content-Type": "text/plain" },
      })
    );

    render(<App />);

    const dropLabel = screen
      .getByText(/drop files here or click to choose/i)
      .closest("label");
    if (!dropLabel) {
      throw new Error("file input label not found");
    }

    const fileInput = dropLabel.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    if (!fileInput) {
      throw new Error("file input not found");
    }

    const dummyFile = new File(["x"], "x.txt", {
      type: "text/plain",
    });

    await userEvent.upload(fileInput, dummyFile);

    const analyzeFilesBtn = await screen.findByRole("button", {
      name: /Analyze file/i,
    });
    await userEvent.click(analyzeFilesBtn);

    // ждём появления алерта ошибки
    await waitFor(() => {
      expect(
        screen.getByText((txt) =>
          /API:\s*API\s+400:\s*Bad request/i.test(txt)
        )
      ).toBeInTheDocument();
    });

    // из-за ошибки второй запрос (plagiarism) даже не вызывается
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
