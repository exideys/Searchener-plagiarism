# Searchener: Plagiarism Detection Platform
## ⚠️ Work in Progress ⚠️

A fullstack application for analyzing text and calculating word frequencies, built with .NET 9 and React.


## 🎯 Project Goal

Development of a full-stack application for analyzing texts for borrowing and plagiarism. The system allows users to upload documents and receive uniqueness reports based on comparisons with other texts.

## 🚀 Features

- Analyze text input for word frequencies and statistics
- Upload and analyze text files (TXT, LOG formats supported)
- Real-time analysis with visual frequency display
- Support for multiple files with tabbed results
- Case-insensitive word counting
- Special character handling (preserves #, @, etc.)
- Cross-platform compatibility

## 🏗 Architecture

### Backend (.NET)
- Clean Architecture pattern
- ASP.NET Core minimal API
- Domain-driven design approach
- Comprehensive test coverage

Key components:
- `TextAnalyzer` - Core text analysis logic
- `TextService` - Application layer service
- `AnalyzeFileService` - File processing service
- REST API endpoints for text and file analysis

### Frontend (React + TypeScript)
- Modern React with hooks
- TypeScript for type safety
- Vite for development and building
- Tailwind CSS for styling
- Vitest for testing

## 🛠 Setup

### Prerequisites
- .NET 9 SDK
- Node.js 18+
- Docker (optional)

### Development

Backend:
```bash
cd Backend
dotnet restore
dotnet run --project Presentation/Texts.Api
