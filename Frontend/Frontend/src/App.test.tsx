import { render, screen } from "@testing-library/react";
import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import App from "./App";

// мок env, чтобы компонент не падал из-за VITE_API_URL в рантайме
beforeEach(() => {
  Object.defineProperty(import.meta, "env", {
    value: { VITE_API_URL: "http://localhost:8081" },
    configurable: true,
  });

  // блокируем любые реальные fetch внутри эффектов/хендлеров
  vi.spyOn(globalThis, "fetch").mockImplementation(() => {
    // по умолчанию просто возвращаем пустой успешный Response,
    // чтобы если компонент внезапно что-то дернет - не упасть
    return Promise.resolve(
      new Response("{}", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("App basic render", () => {
  test("renders text analysis block with controls", () => {
    render(<App />);

    // Заголовок секции анализа текста
    expect(
      screen.getByText(/Text Analysis: Unique Words/i)
    ).toBeInTheDocument();

    // Подпись под textarea
    expect(
      screen.getByText(/Paste text to analyze/i)
    ).toBeInTheDocument();

    // Текстовая область для анализа текста
    expect(
      screen.getByPlaceholderText(/Paste text to analyze/i)
    ).toBeInTheDocument();

    // Переключатели режимов WORDS / SHINGLES
    expect(
      screen.getByLabelText(/Words mode/i)
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(/Shingles mode/i)
    ).toBeInTheDocument();

    // Параметры шинглов
    expect(
      screen.getByLabelText(/Shingle size/i)
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(/Sample step/i)
    ).toBeInTheDocument();

    // Кнопка Analyze text
    expect(
      screen.getByRole("button", { name: /Analyze text/i })
    ).toBeInTheDocument();
  });

  test("renders file analysis block", () => {
    render(<App />);

    // Заголовок секции загрузки файлов
    expect(
      screen.getByText(/Analyze files/i)
    ).toBeInTheDocument();

    // Лейбл над инпутом файлов
    expect(
      screen.getByText(/Upload files/i)
    ).toBeInTheDocument();

    // Сам инпут файлов
    expect(
      screen.getByLabelText(/Upload files/i)
    ).toBeInTheDocument();
  });

  test("renders plagiarism check block", () => {
    render(<App />);

    // Заголовок секции плагиата
    expect(
      screen.getByText(/Plagiarism Check/i)
    ).toBeInTheDocument();

    // Подблок для текста
    expect(
      screen.getByText(/Check plagiarism for text/i)
    ).toBeInTheDocument();

    // textarea для проверки плагиата по тексту
    expect(
      screen.getByPlaceholderText(/Paste text to check plagiarism/i)
    ).toBeInTheDocument();

    // Кнопка проверки плагиата текста
    expect(
      screen.getByRole("button", {
        name: /Check text plagiarism/i,
      })
    ).toBeInTheDocument();

    // Подблок для файла
    expect(
      screen.getByText(/Check plagiarism for file/i)
    ).toBeInTheDocument();

    // Инпут загрузки файла для плагиата
    expect(
      screen.getByLabelText(/Upload file to check plagiarism/i)
    ).toBeInTheDocument();
  });
});
