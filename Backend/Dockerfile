FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS base
WORKDIR /app

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080


FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
ARG BUILD_CONFIGURATION=Release
WORKDIR /src


COPY ["Presentation/Texts.Api/Texts.Api.csproj", "Presentation/Texts.Api/"]
COPY ["Core/Texts.Application/Texts.Application.csproj", "Core/Texts.Application/"]
COPY ["Core/Texts.Domain/Texts.Domain.csproj", "Core/Texts.Domain/"]
COPY ["Infrastructure/Texts.Infrastructure/Texts.Infrastructure.csproj", "Infrastructure/Texts.Infrastructure/"]
COPY ["Contracts/Texts.Contracts/Texts.Contracts.csproj", "Contracts/Texts.Contracts/"]

RUN dotnet restore "Presentation/Texts.Api/Texts.Api.csproj"


COPY . .
WORKDIR /src/Presentation/Texts.Api
RUN dotnet publish "Texts.Api.csproj" -c $BUILD_CONFIGURATION -o /app/publish /p:UseAppHost=false


FROM base AS final
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "Texts.Api.dll"]
