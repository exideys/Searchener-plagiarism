# Searchener: Plagiarism Detection Platform

## Project Status: Work in Progress

Searchener is a full-stack application designed for the detection of plagiarism and comprehensive textual analysis. The platform facilitates the upload and processing of documents to generate reports on content originality, comparing submitted texts against existing corpora and external web resources.

---

## 1. Overview

The primary objective of Searchener is to provide a robust and efficient solution for identifying instances of textual similarity and potential plagiarism. It offers users the capability to analyze documents and receive detailed reports indicating the uniqueness of their content.

---

## 2. Key Features

-   **Document Analysis**: Supports the upload and analysis of text files (TXT, LOG formats) for plagiarism assessment.
-   **Plagiarism Identification**: Compares uploaded content against a defined set of texts and integrates with external search engines (e.g., Google Search) for broader comparison.
-   **Detailed Reporting**: Generates comprehensive reports that highlight matched text segments, identify source origins, and provide an overall originality score.
-   **Textual Metrics**: Offers analytical insights into text characteristics, including word frequency distributions and other statistical data.
-   **Platform Compatibility**: Engineered for cross-platform operation.
-   **Modular Architecture**: Developed with a clean and scalable architecture to support future enhancements and extensions.

---

## 3. Architectural Design

Searchener employs a modern, layered architecture to ensure maintainability, scalability, and performance.

### 3.1. Backend (.NET)

The backend component is developed using **ASP.NET Core Minimal API** with **C#**. It adheres to **Clean Architecture** principles and a **Domain-Driven Design (DDD)** approach, promoting a clear separation of concerns and facilitating extensive testing.

-   **Core Technologies**: ASP.NET Core Minimal API, C#
-   **Design Principles**: Clean Architecture, Domain-Driven Design
-   **Component Structure**:
    -   `Texts.Contracts`: Defines shared data contracts and interfaces.
    -   `Texts.Application`: Encapsulates application-specific business logic and service orchestrations, including plagiarism detection and file processing.
    -   `Texts.Domain`: Contains the core business entities, value objects, and domain rules (e.g., `ShingleAnalyzer`, `TextAnalyzer`).
    -   `Texts.Infrastructure`: Manages external dependencies such as data persistence and third-party API integrations (e.g., `GoogleSearchClient`).
    -   `Texts.Api`: Serves as the presentation layer, exposing RESTful API endpoints for client interaction.
-   **Quality Assurance**: Comprehensive unit and integration test suites.

### 3.2. Frontend (React + TypeScript)

The frontend is a single-page application built with **React** and **TypeScript**, providing an interactive user experience. It leverages **Vite** for optimized development and build processes.

-   **Core Technologies**: React, TypeScript
-   **Build Tool**: Vite
-   **Testing Framework**: Vitest
-   **Component Organization**:
    -   `components`: Reusable UI elements.
    -   `features`: Feature-specific UI modules.
    -   `api`: Client-side API interaction logic.

---

## 4. Getting Started

This section outlines the procedures for setting up and running the Searchener platform.

### 4.1. Prerequisites

The following software components are required:

-   **Docker and Docker Compose**: Essential for containerized deployment.
-   **.NET SDK (Version 9 or higher)**: Required for manual backend development and execution.
-   **Node.js (Version 18 or higher) and npm**: Required for manual frontend development and execution.

### 4.2. Deployment with Docker Compose (Recommended)

For a streamlined setup of both backend and frontend services, utilize Docker Compose:

1.  Navigate to the `Backend` directory: 
    ```bash
    cd Backend
    ```
2.  Execute the Docker Compose command to build and launch the services:
    ```bash
    docker-compose up --build
    ```
    This command initiates the .NET backend API and the React frontend development server. The frontend application will typically be accessible via a web browser at `http://localhost:5173`.

### 4.3. Manual Setup

Alternatively, components can be set up and run independently:

#### 4.3.1. Backend Setup

1.  Navigate to the `Backend` directory:
    ```bash
    cd Backend
    ```
2.  Restore project dependencies:
    ```bash
    dotnet restore
    ```
3.  Start the API service:
    ```bash
    dotnet run --project Presentation/Texts.Api
    ```
    The backend API will typically be hosted at `http://localhost:5000` or `http://localhost:5001`.

#### 4.3.2. Frontend Setup

1.  Navigate to the `Frontend/Frontend` directory:
    ```bash
    cd Frontend/Frontend
    ```
2.  Install Node.js dependencies:
    ```bash
    npm install
    ```
3.  Launch the frontend development server:
    ```bash
    npm run dev
    ```
    The frontend application will typically be accessible at `http://localhost:5173`.

---

## 5. Testing

To verify the functionality and integrity of the application, execute the provided test suites.

### 5.1. Backend Tests

1.  Navigate to the `Backend` directory:
    ```bash
    cd Backend
    ```
2.  Run all backend tests:
    ```bash
    dotnet test
    ```

### 5.2. Frontend Tests

1.  Navigate to the `Frontend/Frontend` directory:
    ```bash
    cd Frontend/Frontend
    ```
2.  Execute frontend tests using Vitest:
    ```bash
    npm test
    ```