# Searchener-plagiarism

This repository contains a minimal .NET 9 backend implementing a text analysis service. It has been refactored to a micro Clean Architecture layout inside a single project.

Backend structure (folders map to layers):
- Backend/Domain — enterprise entities and value objects (WordStat, AnalysisResult).
- Backend/Application — use cases and contracts (ITextAnalyzer, AnalyzeTextUseCase).
- Backend/Infrastructure — framework-dependent implementations (TextAnalyzer using Regex).
- Backend/Presentation — HTTP endpoints mapping that orchestrates use cases.
- Backend/Program.cs — composition root: DI registrations and endpoint mapping.

API:
- GET / — returns usage info.
- POST /analyze — multipart/form-data with field "file"; returns total words, unique count, and per-word frequency/probability.

Run locally:
- dotnet run --project Backend
- curl -F "file=@/path/to/text.txt" http://localhost:5080/analyze